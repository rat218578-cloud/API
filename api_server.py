from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import time
import logging
import os
import random
import threading
import concurrent.futures
from datetime import datetime
from db import db
from jwt_helper import jwt_manager
from session_service import session_service

# 🔥 LOGS MÍNIMOS
logging.basicConfig(level=logging.ERROR)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

API_BASE = "https://sortenabet.bet.br"

# SESSÃO HTTP REUTILIZÁVEL
session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Connection': 'keep-alive'
})

# 🔥 CACHE EM MEMÓRIA
cache = {}
CACHE_TTL = 3600

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

# HISTÓRICO DE NÚMEROS
historico_numeros = []

def gerar_numero_aleatorio():
    return random.randint(0, 36)

def get_cor(numero):
    red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
    if numero == 0:
        return "green"
    return "red" if numero in red else "black"

def adicionar_numero_ao_historico(numero):
    global historico_numeros
    historico_numeros.append({
        'number': numero,
        'color': get_cor(numero),
        'timestamp': datetime.now().isoformat()
    })
    if len(historico_numeros) > 500:
        historico_numeros = historico_numeros[-500:]

# ========== PRÉ-CARREGAMENTO DE JOGOS ==========
def preload_game(slug, auth_header):
    try:
        if get_cache(f"game:{slug}"):
            return
        
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={
                'slug': slug,
                'platform': 'WEB',
                'use_demo': 0,
                'source': 'watchIsAuthenticated'
            },
            timeout=2,
            headers={'Authorization': auth_header} if auth_header else {}
        )
        
        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            if game_url:
                response_data = {
                    'success': True,
                    'slug': slug,
                    'gameURL': game_url,
                    'iframe_url': game_url
                }
                set_cache(f"game:{slug}", response_data)
                logger.info(f"✅ Jogo {slug} pré-carregado")
    except Exception as e:
        logger.error(f"❌ Erro ao pré-carregar {slug}: {e}")

def preload_popular_games(auth_header):
    popular_slugs = ['roulette', 'blackjack', 'slots', 'baccarat', 'poker']
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = []
        for slug in popular_slugs:
            future = executor.submit(preload_game, slug, auth_header)
            futures.append(future)
        
        for future in concurrent.futures.as_completed(futures):
            try:
                future.result()
            except:
                pass

# ========== LOGIN ==========
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.json
        email = data.get('login') or data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        # VERIFICA CACHE
        cached = get_cache(f"login:{email}")
        if cached:
            token = cached.get('access_token')
            if token:
                threading.Thread(target=preload_popular_games, args=(f'Bearer {token}',)).start()
            return jsonify(cached), 200
        
        # LOGIN NA API EXTERNA
        login_data = {
            "login": email,
            "email": email,
            "password": password,
            "app_source": "web"
        }
        
        response = session.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=3)
        
        if response.status_code != 200:
            return jsonify({'error': 'Credenciais inválidas'}), 401
        
        result = response.json()
        access_token_externo = result.get('access_token')
        
        if not access_token_externo:
            return jsonify({'error': 'Token não retornado'}), 500
        
        session.headers.update({'Authorization': f'Bearer {access_token_externo}'})
        
        user_id = str(result.get('user', {}).get('id', email))
        
        # 🔥 GERA TOKEN (7 DIAS)
        jwt_token = jwt_manager.generate_token(user_id, email)
        
        # SALVA NO BANCO
        try:
            session_service.create_session(
                user_id=user_id,
                email=email,
                password=password,
                access_token=jwt_token
            )
        except Exception as e:
            logger.error(f"❌ Erro ao salvar sessão: {e}")
        
        response_data = {
            'access_token': jwt_token,
            'token_type': 'Bearer',
            'expires_in': 7 * 24 * 60 * 60,
            'user': {
                'id': user_id,
                'name': result.get('user', {}).get('name', email.split('@')[0]),
                'email': email,
                'plan': 'pro'
            }
        }
        
        set_cache(f"login:{email}", response_data)
        
        threading.Thread(target=preload_popular_games, args=(f'Bearer {jwt_token}',)).start()
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== VALIDAÇÃO ==========
@app.route('/api/auth/validate', methods=['GET'])
def api_validate():
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'valid': False, 'error': 'Token não fornecido'}), 401

        token = auth_header.replace('Bearer ', '')
        session_data = session_service.validate_session(token)
        
        if not session_data:
            return jsonify({'valid': False, 'error': 'Token inválido ou expirado'}), 401

        return jsonify({
            'valid': True,
            'user_id': session_data.get('user_id'),
            'email': session_data.get('email'),
            'expires_at': session_data.get('expires_at')
        }), 200

    except Exception as e:
        return jsonify({'valid': False, 'error': str(e)}), 500

# ========== LOGOUT ==========
@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'success': True}), 200
        
        token = auth_header.replace('Bearer ', '')
        payload = jwt_manager.verify_token(token)
        if payload:
            user_id = payload.get('user_id')
            if user_id:
                session_service.deactivate_session(user_id)
        
        return jsonify({'success': True}), 200
    except:
        return jsonify({'success': True}), 200

# ========== START-GAME ==========
@app.route('/api/start-game-v2', methods=['GET', 'POST'])
def api_start_game():
    try:
        # PEGA SLUG DA URL OU DO BODY
        slug = request.args.get('slug')
        if not slug and request.method == 'POST':
            data = request.json
            slug = data.get('slug') if data else None
        
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        logger.info(f"🎮 Gerando link para: {slug}")
        
        # VERIFICA CACHE
        cached = get_cache(f"game:{slug}")
        if cached:
            logger.info(f"✅ Cache hit para {slug}")
            return jsonify(cached), 200
        
        # PEGA TOKEN DO HEADER
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token não encontrado'}), 401
        
        # 🔥 TENTA DIRETO NA API EXTERNA
        try:
            response = session.get(
                f'{API_BASE}/api/start-game-v2',
                params={
                    'slug': slug,
                    'platform': 'WEB',
                    'use_demo': 0,
                    'source': 'watchIsAuthenticated'
                },
                timeout=5,
                headers={'Authorization': auth_header}
            )
            
            logger.info(f"📥 Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                game_url = data.get('iframe_url') or data.get('gameURL')
                
                if game_url:
                    response_data = {
                        'success': True,
                        'slug': slug,
                        'gameURL': game_url,
                        'iframe_url': game_url
                    }
                    set_cache(f"game:{slug}", response_data)
                    logger.info(f"✅ URL obtida")
                    return jsonify(response_data), 200
                    
        except Exception as e:
            logger.error(f"❌ Erro na requisição: {e}")
        
        # 🔥 FALLBACK: TENTA COM DEMO
        try:
            response = session.get(
                f'{API_BASE}/api/start-game-v2',
                params={
                    'slug': slug,
                    'platform': 'WEB',
                    'use_demo': 1,
                    'source': 'watchIsAuthenticated'
                },
                timeout=3
            )
            
            if response.status_code == 200:
                data = response.json()
                game_url = data.get('iframe_url') or data.get('gameURL')
                
                if game_url:
                    response_data = {
                        'success': True,
                        'slug': slug,
                        'gameURL': game_url,
                        'iframe_url': game_url,
                        'demo': True
                    }
                    set_cache(f"game:{slug}", response_data)
                    return jsonify(response_data), 200
        except:
            pass
        
        return jsonify({
            'success': False,
            'error': 'Não foi possível obter a URL do jogo'
        }), 404
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA NÚMEROS ==========
@app.route('/api/roulette/live', methods=['GET'])
def get_live_numbers():
    try:
        limit = int(request.args.get('limit', 50))
        
        if len(historico_numeros) < 20:
            for _ in range(20):
                adicionar_numero_ao_historico(gerar_numero_aleatorio())
        
        history = historico_numeros[-limit:] if historico_numeros else []
        last_numbers = [h['number'] for h in history[-10:]] if history else []
        
        nums = [h['number'] for h in historico_numeros]
        freq = {}
        for n in nums:
            freq[n] = freq.get(n, 0) + 1
        top_numbers = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:8]
        top_numbers_list = [{'number': n, 'count': c} for n, c in top_numbers]
        
        return jsonify({
            'success': True,
            'connected': True,
            'total': len(historico_numeros),
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
        adicionar_numero_ao_historico(number)
        return jsonify({'success': True, 'number': number, 'total': len(historico_numeros)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== ROTA CORINGA PARA REFRESH (EVITA 405) ==========
@app.route('/api/auth/refresh', methods=['POST', 'GET', 'OPTIONS'])
def api_refresh_fallback():
    """Rota coringa para evitar erro 405 no frontend"""
    return jsonify({
        'error': 'Refresh token não suportado. Faça login novamente.',
        'valid': False,
        'requires_login': True
    }), 401

# ========== PRÉ-CARREGAMENTO MANUAL ==========
@app.route('/api/preload-games', methods=['GET'])
def api_preload_games():
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token não encontrado'}), 401
        
        threading.Thread(target=preload_popular_games, args=(auth_header,)).start()
        
        return jsonify({
            'success': True,
            'message': 'Pré-carregamento iniciado'
        }), 200
        
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

# ========== MAIN ==========
if __name__ == '__main__':
    print("=" * 70)
    print("🔐 API PROXY - CORRIGIDO (7 DIAS)")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("🗄️  Banco: PostgreSQL")
    print("🔑 Token: 7 dias")
    print("🎮 Rota: /api/start-game-v2 (GET + POST)")
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    for _ in range(30):
        adicionar_numero_ao_historico(gerar_numero_aleatorio())
    
    try:
        session_service.cleanup_expired()
    except:
        pass
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
