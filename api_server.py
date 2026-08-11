from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import time
import logging
import os
import random
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

# SESSÃO REUTILIZÁVEL
session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Connection': 'keep-alive'
})

# 🔥 CACHE EM MEMÓRIA (RÁPIDO)
cache = {}
CACHE_TTL = 300  # 5 minutos

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

# ========== FUNÇÃO PARA PRÉ-CARREGAR JOGO ==========
def preload_single_game(slug, auth_header=None):
    """Pré-carrega um único jogo em background"""
    try:
        # Verifica cache primeiro
        cached = get_cache(f"game:{slug}")
        if cached:
            return cached
        
        # Usa o header se fornecido
        if auth_header:
            session.headers.update({'Authorization': auth_header})
        
        # Faz a requisição
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={
                'slug': slug,
                'platform': 'WEB',
                'use_demo': 0,
                'source': 'watchIsAuthenticated'
            },
            timeout=1.5
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
                return response_data
    except Exception as e:
        logger.error(f"Erro ao pré-carregar {slug}: {e}")
    return None

# ========== LOGIN (COM CACHE) ==========
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.json
        email = data.get('login') or data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        # 🔥 VERIFICA CACHE
        cached = get_cache(f"login:{email}")
        if cached:
            # 🔥 PRÉ-CARREGA JOGOS EM BACKGROUND
            auth_header = cached.get('access_token')
            if auth_header:
                threading.Thread(target=preload_popular_games, args=(f'Bearer {auth_header}',)).start()
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
        jwt_token = jwt_manager.generate_token(user_id, email)
        refresh_token = jwt_manager.generate_refresh_token(user_id, email)
        
        # SALVA NO BANCO
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
        
        # 🔥 PRÉ-CARREGA JOGOS EM BACKGROUND (NÃO BLOQUEIA)
        import threading
        threading.Thread(target=preload_popular_games, args=(f'Bearer {jwt_token}',)).start()
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== PRÉ-CARREGAR JOGOS POPULARES ==========
def preload_popular_games(auth_header):
    """Pré-carrega jogos populares em background"""
    popular_slugs = ['roulette', 'blackjack', 'slots', 'baccarat', 'poker']
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = []
        for slug in popular_slugs:
            future = executor.submit(preload_single_game, slug, auth_header)
            futures.append(future)
        
        # Espera todos terminarem (máximo 2 segundos)
        for future in concurrent.futures.as_completed(futures, timeout=2):
            try:
                future.result()
            except:
                pass

# ========== START-GAME (0.5 SEGUNDOS) ==========
@app.route('/api/start-game-v2', methods=['GET'])
def api_start_game():
    try:
        slug = request.args.get('slug')
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        # 🔥 1. VERIFICA CACHE (RESPOSTA INSTANTÂNEA)
        cached = get_cache(f"game:{slug}")
        if cached:
            return jsonify(cached), 200
        
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token não encontrado'}), 401
        
        token = auth_header.replace('Bearer ', '')
        payload = jwt_manager.verify_token(token)
        
        if not payload:
            return jsonify({'error': 'Token inválido'}), 401
        
        # 🔥 2. TENTA BUSCAR EM PARALELO (0.5 SEGUNDOS)
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(preload_single_game, slug, auth_header)
            try:
                result = future.result(timeout=0.5)  # 0.5 segundos!
                if result:
                    return jsonify(result), 200
            except concurrent.futures.TimeoutError:
                # 🔥 3. SE PASSOU 0.5s, RETORNA PLACEHOLDER + BUSCA EM BACKGROUND
                # Inicia busca em background
                import threading
                threading.Thread(target=preload_single_game, args=(slug, auth_header)).start()
                
                # Retorna placeholder
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': f'/api/game/loading/{slug}',
                    'iframe_url': f'/api/game/loading/{slug}',
                    'loading': True,
                    'message': 'Carregando jogo...'
                }), 200
        
        # 🔥 4. FALLBACK: BUSCA NORMAL
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={
                'slug': slug,
                'platform': 'WEB',
                'use_demo': 0,
                'source': 'watchIsAuthenticated'
            },
            timeout=2
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
                return jsonify(response_data), 200
        
        return jsonify({
            'success': False,
            'error': 'Não foi possível obter a URL do jogo'
        }), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== PRÉ-CARREGAMENTO MANUAL ==========
@app.route('/api/preload-games', methods=['GET'])
def api_preload_games():
    """Endpoint para pré-carregar jogos manualmente"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token não encontrado'}), 401
        
        import threading
        threading.Thread(target=preload_popular_games, args=(auth_header,)).start()
        
        return jsonify({
            'success': True,
            'message': 'Pré-carregamento de jogos iniciado em background'
        }), 200
        
    except Exception as e:
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

# ========== VALIDAÇÃO ==========
@app.route('/api/auth/validate', methods=['GET'])
def api_validate():
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'valid': False}), 401
        token = auth_header.replace('Bearer ', '')
        payload = jwt_manager.verify_token(token)
        if payload:
            return jsonify({'valid': True, 'user_id': payload.get('user_id'), 'email': payload.get('email')}), 200
        return jsonify({'valid': False}), 401
    except:
        return jsonify({'valid': False}), 401

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

# ========== MAIN ==========
if __name__ == '__main__':
    print("=" * 70)
    print("⚡ API PROXY - QA.AI (VÍDEO 0.5s)")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("🗄️  Banco: PostgreSQL (30 dias)")
    print("⚡ Cache: 5 minutos")
    print("⏱️  Timeout: 3 segundos")
    print("🎬 Vídeo: 0.5 segundos")
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    # Gera números iniciais
    for _ in range(30):
        adicionar_numero_ao_historico(gerar_numero_aleatorio())
    
    try:
        session_service.cleanup_expired()
    except:
        pass
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
