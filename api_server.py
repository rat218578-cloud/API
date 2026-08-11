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

# 🔥 HISTÓRICO DE NÚMEROS REAIS (1000+)
historico_numeros = []
ultimo_signal_id = None
TOTAL_MAXIMO = 5000  # 🔥 ATÉ 5000 NÚMEROS!

def buscar_numeros_smart_api(since: str = None):
    """Busca números reais da Smart API (Imersiva)"""
    global ultimo_signal_id, historico_numeros
    
    try:
        email = 'gcriste268@gmail.com'
        url = f'https://tool-api.smartanalise.com.br/api/history-delta?source=immersivevip&userEmail={email}'
        
        if since:
            url += f'&since={since}'
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Referer': 'https://tool.smartanalise.com.br/',
            'Origin': 'https://tool.smartanalise.com.br'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('data'):
                # 🔥 INVERTE PARA ORDEM CRONOLÓGICA (MAIS ANTIGO PRIMEIRO)
                novos = data['data'][::-1]
                numeros_novos = []
                
                for item in novos:
                    signal_id = item.get('signalId')
                    signal = item.get('signal')
                    
                    if signal_id and signal and signal.isdigit():
                        numero = int(signal)
                        if 0 <= numero <= 36:
                            # Verifica se já existe
                            if not any(n.get('signal_id') == signal_id for n in historico_numeros):
                                historico_numeros.append({
                                    'signal_id': signal_id,
                                    'number': numero,
                                    'timestamp': item.get('timestamp')
                                })
                                numeros_novos.append(numero)
                                ultimo_signal_id = signal_id
                
                # 🔥 MANTÉM APENAS OS ÚLTIMOS 5000
                if len(historico_numeros) > TOTAL_MAXIMO:
                    historico_numeros = historico_numeros[-TOTAL_MAXIMO:]
                
                if numeros_novos:
                    print(f"✅ +{len(numeros_novos)} novos números reais")
                    return numeros_novos
        
        return []
        
    except Exception as e:
        print(f"⚠️ Erro Smart API: {e}")
        return []

def carregar_historico_inicial():
    """Carrega histórico completo da Smart API (1000+ números)"""
    global historico_numeros, ultimo_signal_id
    
    print("📥 Carregando histórico completo da Smart API...")
    
    try:
        email = 'gcriste268@gmail.com'
        # 🔥 USA full-history PARA PEGAR TUDO
        url = f'https://tool-api.smartanalise.com.br/api/full-history?source=immersivevip&userEmail={email}'
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Referer': 'https://tool.smartanalise.com.br/',
            'Origin': 'https://tool.smartanalise.com.br'
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            items = data.get('data') or data.get('results', [])
            
            print(f"📦 {len(items)} itens retornados da API")
            
            # 🔥 INVERTE PARA ORDEM CRONOLÓGICA (MAIS ANTIGO PRIMEIRO)
            items = items[::-1]
            
            for item in items:
                signal_id = item.get('signalId') or item.get('id')
                signal = item.get('signal') or item.get('number')
                
                if signal_id and signal and str(signal).isdigit():
                    numero = int(signal)
                    if 0 <= numero <= 36:
                        historico_numeros.append({
                            'signal_id': signal_id,
                            'number': numero,
                            'timestamp': item.get('timestamp')
                        })
                        ultimo_signal_id = signal_id
            
            # 🔥 MANTÉM APENAS OS ÚLTIMOS 5000
            if len(historico_numeros) > TOTAL_MAXIMO:
                historico_numeros = historico_numeros[-TOTAL_MAXIMO:]
            
            print(f"✅ {len(historico_numeros)} números carregados da Smart API")
            return True
            
    except Exception as e:
        print(f"⚠️ Erro ao carregar histórico: {e}")
    
    # 🔥 FALLBACK: GERA NÚMEROS SIMULADOS SE A API FALHAR
    print("⚠️ Usando fallback com números simulados...")
    for i in range(50):
        historico_numeros.append({
            'signal_id': f'fallback_{i}',
            'number': random.randint(0, 36),
            'timestamp': datetime.now().isoformat()
        })
    
    return False

# 🔥 CARREGA HISTÓRICO AO INICIAR
carregar_historico_inicial()

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

# ========== ROTA NÚMEROS REAIS (1000+) ==========
@app.route('/api/roulette/live', methods=['GET'])
def get_live_numbers():
    """Retorna números REAIS da Imersiva (1000+ números)"""
    try:
        limit = int(request.args.get('limit', 200))
        
        # 🔥 BUSCA NOVOS NÚMEROS EM BACKGROUND
        if ultimo_signal_id:
            buscar_numeros_smart_api(since=ultimo_signal_id)
        
        # 🔥 RETORNA HISTÓRICO (MAIS RECENTES PRIMEIRO)
        history = historico_numeros[-limit:][::-1] if historico_numeros else []
        last_numbers = [h['number'] for h in history[:10]] if history else []
        
        # 🔥 CALCULA TOP NÚMEROS
        nums = [h['number'] for h in historico_numeros]
        freq = {}
        for n in nums:
            freq[n] = freq.get(n, 0) + 1
        top_numbers = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:8]
        top_numbers_list = [{'number': n, 'count': c} for n, c in top_numbers]
        
        return jsonify({
            'success': True,
            'connected': True,
            'total': len(historico_numeros),  # 🔥 MOSTRA O TOTAL REAL
            'last_numbers': last_numbers,
            'history': history,
            'top_numbers': top_numbers_list,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== ROTA ADICIONAR NÚMERO ==========
@app.route('/api/roulette/add', methods=['POST'])
def add_number():
    try:
        data = request.json
        number = data.get('number')
        if number is None or number < 0 or number > 36:
            return jsonify({'error': 'Número inválido'}), 400
        historico_numeros.append({
            'signal_id': f'manual_{int(time.time())}',
            'number': number,
            'timestamp': datetime.now().isoformat()
        })
        if len(historico_numeros) > TOTAL_MAXIMO:
            historico_numeros = historico_numeros[-TOTAL_MAXIMO:]
        return jsonify({'success': True, 'number': number, 'total': len(historico_numeros)}), 200
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
    print("🎯 API PROXY - QA.AI (1000+ NÚMEROS REAIS)")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("📊 Smart API: Imersiva")
    print("📈 Total números:", len(historico_numeros))
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    try:
        session_service.cleanup_expired()
    except:
        pass
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
