from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import time
import logging
import os
import random
import re
from datetime import datetime, timedelta
from db import db
from jwt_helper import jwt_manager
from session_service import session_service

# 🔥 LOGS MÍNIMOS
logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

API_BASE = "https://sortenabet.bet.br"

# 🔥 SESSÃO REUTILIZÁVEL
session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Connection': 'keep-alive'
})

# 🔥 CACHE DE TOKENS
cache = {}
CACHE_TTL = 600

def get_cache(key):
    if key in cache:
        data = cache[key]
        if time.time() - data['timestamp'] < CACHE_TTL:
            return data['value']
    return None

def set_cache(key, value):
    cache[key] = {
        'value': value,
        'timestamp': time.time()
    }

# 🔥 SMART API - NÚMEROS REAIS
class SmartApiService:
    def __init__(self):
        self.base_url = "https://tool-api.smartanalise.com.br/api"
        self.numeros = []
        self.total = 0
        self.last_signal_id = None
        self.email = 'gcriste268@gmail.com'
        self.source = 'immersivevip'
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://tool.smartanalise.com.br/',
            'Origin': 'https://tool.smartanalise.com.br'
        }
        
    def carregar_historico(self):
        """Carrega histórico completo da Smart API"""
        try:
            url = f"{self.base_url}/full-history?source={self.source}&userEmail={self.email}"
            print(f"📥 Carregando histórico: {url}")
            
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                items = data.get('data') or data.get('results', [])
                
                # 🔥 INVERTE PARA ORDEM CRONOLÓGICA (MAIS ANTIGO PRIMEIRO)
                items = items[::-1]
                
                for item in items:
                    signal_id = item.get('signalId') or item.get('id')
                    signal = item.get('signal') or item.get('number')
                    
                    if signal_id and signal and str(signal).isdigit():
                        numero = int(signal)
                        if 0 <= numero <= 36:
                            self.numeros.append({
                                'number': numero,
                                'signalId': signal_id,
                                'timestamp': item.get('timestamp')
                            })
                            self.total += 1
                            self.last_signal_id = signal_id
                
                print(f"✅ {self.total} números carregados da Smart API")
                return True
                
        except Exception as e:
            print(f"⚠️ Erro ao carregar histórico: {e}")
        
        return False
    
    def buscar_novos(self):
        """Busca novos números da Smart API"""
        try:
            url = f"{self.base_url}/history-delta?source={self.source}&userEmail={self.email}"
            if self.last_signal_id:
                url += f"&since={self.last_signal_id}"
            
            response = requests.get(url, headers=self.headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('data'):
                    # 🔥 INVERTE PARA ORDEM CRONOLÓGICA (MAIS ANTIGO PRIMEIRO)
                    novos = data['data'][::-1]
                    
                    for item in novos:
                        signal_id = item.get('signalId')
                        signal = item.get('signal')
                        
                        if signal_id and signal and str(signal).isdigit():
                            numero = int(signal)
                            if 0 <= numero <= 36:
                                if not any(n.get('signalId') == signal_id for n in self.numeros):
                                    self.numeros.append({
                                        'number': numero,
                                        'signalId': signal_id,
                                        'timestamp': item.get('timestamp')
                                    })
                                    self.total += 1
                                    self.last_signal_id = signal_id
                    
                    # Mantém últimos 5000
                    if len(self.numeros) > 5000:
                        self.numeros = self.numeros[-5000:]
                    
                    return True
                    
        except Exception as e:
            print(f"⚠️ Erro ao buscar novos: {e}")
        
        return False
    
    def get_history(self, limit=200):
        """Retorna histórico (mais recentes primeiro)"""
        if not self.numeros:
            return []
        return self.numeros[-limit:][::-1]
    
    def get_last_numbers(self, count=10):
        """Retorna últimos números (mais recentes)"""
        if not self.numeros:
            return []
        history = self.numeros[-count:][::-1]
        return [h['number'] for h in history]
    
    def get_top_numbers(self, count=8):
        """Retorna números mais frequentes"""
        if not self.numeros:
            return []
        
        nums = [n['number'] for n in self.numeros]
        freq = {}
        for n in nums:
            freq[n] = freq.get(n, 0) + 1
        top = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:count]
        return [{'number': n, 'count': c} for n, c in top]

# 🔥 INSTANCIA E CARREGA HISTÓRICO
smart_api = SmartApiService()
smart_api.carregar_historico()

# ========== LOGIN ==========
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.json
        email = data.get('login') or data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        cached = get_cache(f"login:{email}")
        if cached:
            return jsonify(cached), 200
        
        login_data = {
            "login": email,
            "email": email,
            "password": password,
            "app_source": "web"
        }
        
        response = session.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=5)
        
        if response.status_code != 200:
            return jsonify({'error': 'Credenciais inválidas'}), 401
        
        result = response.json()
        access_token_externo = result.get('access_token')
        
        if not access_token_externo:
            return jsonify({'error': 'Token não retornado'}), 500
        
        session.headers.update({'Authorization': f'Bearer {access_token_externo}'})
        
        user_id = str(result.get('user', {}).get('id', email))
        jwt_token = jwt_manager.generate_token(user_id, email)
        refresh_token = jwt_manager.generate_refresh_token(user_id, email)
        
        try:
            session_service.create_session(user_id, email, password, jwt_token, refresh_token)
        except:
            pass
        
        response_data = {
            'access_token': jwt_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': 30 * 24 * 60 * 60,
            'user': {
                'id': user_id,
                'name': result.get('user', {}).get('name', email.split('@')[0]),
                'email': email,
                'plan': 'pro'
            }
        }
        
        set_cache(f"login:{email}", response_data)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== START-GAME ==========
@app.route('/api/start-game-v2', methods=['GET'])
def api_start_game():
    try:
        slug = request.args.get('slug')
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token não encontrado'}), 401
        
        token = auth_header.replace('Bearer ', '')
        payload = jwt_manager.verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Token inválido'}), 401
        
        auth_header_externo = session.headers.get('Authorization')
        if not auth_header_externo:
            return jsonify({'error': 'Token externo não encontrado'}), 401
        
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={
                'slug': slug,
                'platform': 'WEB',
                'use_demo': 0,
                'source': 'watchIsAuthenticated'
            },
            timeout=3
        )
        
        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            
            if game_url:
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': game_url,
                    'iframe_url': game_url
                }), 200
        
        return jsonify({
            'success': False,
            'error': 'Não foi possível obter a URL do jogo'
        }), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== ROTA NÚMEROS REAIS ==========
@app.route('/api/roulette/live', methods=['GET'])
def get_live_numbers():
    """Retorna números REAIS da Smart API"""
    try:
        limit = int(request.args.get('limit', 200))
        
        # 🔥 BUSCA NOVOS NÚMEROS
        smart_api.buscar_novos()
        
        history = smart_api.get_history(limit)
        last_numbers = smart_api.get_last_numbers(10)
        top_numbers = smart_api.get_top_numbers(8)
        
        return jsonify({
            'success': True,
            'connected': True,
            'total': smart_api.total,
            'last_numbers': last_numbers,
            'history': history,
            'top_numbers': top_numbers,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA ADICIONAR NÚMERO ==========
@app.route('/api/roulette/add', methods=['POST'])
def add_number():
    try:
        data = request.json
        number = data.get('number')
        if number is None or number < 0 or number > 36:
            return jsonify({'error': 'Número inválido'}), 400
        
        smart_api.numeros.append({
            'number': number,
            'signalId': f'manual_{int(time.time())}',
            'timestamp': datetime.now().isoformat()
        })
        smart_api.total += 1
        
        return jsonify({'success': True, 'number': number, 'total': smart_api.total}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== VALIDAÇÃO ==========
@app.route('/api/auth/validate', methods=['GET'])
def api_validate():
    try:
        auth_header = request.headers.get('Authorization')
        if auth_header:
            return jsonify({'valid': True}), 200
        return jsonify({'valid': False}), 200
    except:
        return jsonify({'valid': False}), 200

# ========== LOGOUT ==========
@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    try:
        auth_header = request.headers.get('Authorization')
        if auth_header:
            token = auth_header.replace('Bearer ', '')
            payload = jwt_manager.verify_token(token)
            if payload:
                session_service.deactivate_session(payload.get('user_id'))
    except:
        pass
    return jsonify({'success': True}), 200

# ========== REFRESH ==========
@app.route('/api/auth/refresh', methods=['POST'])
def api_refresh():
    try:
        data = request.json
        refresh_token = data.get('refresh_token')
        if not refresh_token:
            return jsonify({'error': 'Refresh token não fornecido'}), 400
        result = session_service.refresh_access_token(refresh_token)
        if not result:
            return jsonify({'error': 'Refresh token inválido'}), 401
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== FRONTEND ==========
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    if path and os.path.exists(os.path.join('dist', path)):
        return send_from_directory('dist', path)
    return send_from_directory('dist', 'index.html')

if __name__ == '__main__':
    print("=" * 70)
    print("🎯 API PROXY - SMART API (NÚMEROS REAIS)")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("📊 Total números:", smart_api.total)
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    try:
        session_service.cleanup_expired()
    except:
        pass
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
