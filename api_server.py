from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import time
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

API_BASE = "https://sortenabet.bet.br"

# ========== SESSÃO PERSISTENTE (igual ao Python) ==========
session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
})

# Cache de URLs
cache_jogos = {}
ultimo_login = None
TOKEN_EXPIRATION = 300  # 5 minutos

# ========== ROTAS ==========

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    global session, ultimo_login
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Body vazio'}), 400
        
        logger.info(f"📤 Login: {data.get('email', data.get('login'))}")
        
        # Encaminha a requisição com o captcha_token que o frontend gerou
        response = requests.post(
            f'{API_BASE}/api/auth/login',
            json=data,
            timeout=10
        )
        
        result = response.json()
        
        if response.status_code == 200:
            access_token = result.get('access_token')
            if access_token:
                # Atualiza a sessão com o token (igual ao Python)
                session.headers.update({
                    'Authorization': f'Bearer {access_token}'
                })
                ultimo_login = time.time()
                logger.info(f"✅ Login OK - Token: {access_token[:50]}...")
        
        return jsonify(result), response.status_code
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/start-game-v2', methods=['GET'])
def api_start_game():
    global session, ultimo_login
    
    try:
        slug = request.args.get('slug')
        
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        # Verifica se o token ainda é válido
        if not ultimo_login or (time.time() - ultimo_login) > TOKEN_EXPIRATION:
            logger.warning("⚠️ Token expirado ou não logado")
            return jsonify({'error': 'Token expirado. Faça login novamente.'}), 401
        
        # Verifica cache (igual ao Python)
        if slug in cache_jogos:
            cache_time = cache_jogos[slug]['timestamp']
            if (time.time() - cache_time) < TOKEN_EXPIRATION:
                logger.info(f"📦 Cache hit para {slug}")
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': cache_jogos[slug]['url'],
                    'iframe_url': cache_jogos[slug]['url']
                })
        
        # Faz a requisição igual ao Python
        params = {
            'slug': slug,
            'platform': request.args.get('platform', 'WEB'),
            'use_demo': request.args.get('use_demo', 0),
            'source': request.args.get('source', 'watchIsAuthenticated')
        }
        
        logger.info(f"🎮 GET: {API_BASE}/api/start-game-v2?slug={slug}")
        
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params=params,
            timeout=10
        )
        
        logger.info(f"📥 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            
            if game_url:
                # Guarda no cache (igual ao Python)
                cache_jogos[slug] = {
                    'url': game_url,
                    'timestamp': time.time()
                }
                logger.info(f"✅ URL obtida para {slug}")
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': game_url,
                    'iframe_url': game_url
                })
            else:
                logger.warning(f"⚠️ Sem URL para {slug}")
                return jsonify({'error': 'URL não encontrada'}), 404
        else:
            logger.warning(f"❌ {slug}: HTTP {response.status_code}")
            return jsonify(response.json()), response.status_code
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/roulette/history', methods=['GET'])
def api_roulette_history():
    try:
        slug = request.args.get('slug', 'evolution/brasileira')
        limit = request.args.get('limit', 50)
        
        response = session.get(
            f'{API_BASE}/api/roulette/history',
            params={'slug': slug, 'limit': limit},
            timeout=10
        )
        
        if response.status_code == 200:
            return jsonify(response.json()), response.status_code
        
        # Dados simulados
        return jsonify({
            'spins': [
                {'number': n, 'color': 'red' if n % 2 == 0 else 'black', 
                 'timestamp': time.time(), 'roundId': f'sim_{i}'}
                for i, n in enumerate([10, 5, 22, 15, 8, 30, 12, 25, 3, 18])
            ],
            'total': 10,
            'room': slug
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'timestamp': time.time()})

# Frontend
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
    print("🎯 API PROXY - IGUAL AO PYTHON")
    print("=" * 70)
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    app.run(host='0.0.0.0', port=5000, debug=False)
