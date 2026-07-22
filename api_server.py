from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import time
import hashlib
import base64
import secrets
from datetime import datetime, timedelta
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

# ========== CONFIGURAÇÕES ==========
SITE_KEY = "0x4AAAAAAADmr68KUqpnEKo-9"
SECRET_KEY = "0x4AAAAAAADmr62kWZNpTLxzKtYOYbpw7wzY"
API_BASE = "https://sortenabet.bet.br"

# ========== SESSÃO ==========
session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
})

cache_jogos = {}
ultimo_login = None
TOKEN_EXPIRATION = 300

class TurnstileTokenGenerator:
    def __init__(self, site_key: str, secret_key: str):
        self.site_key = site_key
        self.secret_key = secret_key

    def generate_token(self) -> str:
        timestamp = int(time.time())
        nonce = secrets.token_hex(16)

        payload = {
            "sitekey": self.site_key,
            "timestamp": timestamp,
            "nonce": nonce,
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "action": "login",
            "cdata": ""
        }

        payload_json = json.dumps(payload, separators=(',', ':'))
        payload_b64 = base64.b64encode(payload_json.encode()).decode()

        signature = hashlib.sha256(
            f"{payload_b64}.{self.secret_key}".encode()
        ).hexdigest()[:32]

        final_hash = hashlib.sha256(
            f"{payload_b64}.{signature}".encode()
        ).hexdigest()

        return f"t2:1.{payload_b64}.{signature}.{final_hash}"

# ========== ROTAS ==========

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    global session, ultimo_login
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Body vazio'}), 400
        
        email = data.get('email') or data.get('login')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email e senha obrigatórios'}), 400
        
        logger.info(f"📤 Login: {email}")
        
        generator = TurnstileTokenGenerator(SITE_KEY, SECRET_KEY)
        captcha_token = generator.generate_token()
        
        login_data = {
            "login": email,
            "email": email,
            "password": password,
            "app_source": "web",
            "captcha_token": captcha_token
        }
        
        # Faz login na API
        response = session.post(
            f'{API_BASE}/api/auth/login',
            json=login_data,
            timeout=10
        )
        
        logger.info(f"📥 Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            access_token = result.get('access_token')
            user_data = result.get('user', {})
            
            if access_token:
                session.headers.update({
                    'Authorization': f'Bearer {access_token}'
                })
                ultimo_login = time.time()
                logger.info(f"✅ Login OK para {email}")
                
                # ===== RETORNA OS DADOS DO USUÁRIO =====
                return jsonify({
                    'access_token': access_token,
                    'token_type': 'Bearer',
                    'expires_in': 604800,
                    'user': user_data
                }), 200
            else:
                return jsonify({'error': 'Token não encontrado'}), 401
        else:
            return jsonify(response.json()), response.status_code
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/start-game-v2', methods=['GET'])
def api_start_game():
    try:
        slug = request.args.get('slug')
        
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        if not ultimo_login or (time.time() - ultimo_login) > TOKEN_EXPIRATION:
            return jsonify({'error': 'Token expirado. Faça login novamente.'}), 401
        
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
    print("🎯 API PROXY - SORTE NA BET")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    app.run(host='0.0.0.0', port=5000, debug=False)
