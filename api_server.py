from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import time
import hashlib
import base64
import secrets
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

# ========== SESSÃO GLOBAL COM TOKEN ==========
session = None
ultimo_login = None
TOKEN_EXPIRATION = 300  # 5 minutos

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

def fazer_login(email, password):
    """Faz login apenas 1 vez e reutiliza o token"""
    global session, ultimo_login
    
    # Se já tem sessão válida, reutiliza
    if session and ultimo_login and (time.time() - ultimo_login) < TOKEN_EXPIRATION:
        logger.info("✅ Token reutilizado (cache)")
        return True
    
    logger.info(f"🔐 Login: {email}")
    
    generator = TurnstileTokenGenerator(SITE_KEY, SECRET_KEY)
    captcha_token = generator.generate_token()
    
    login_data = {
        "login": email,
        "email": email,
        "password": password,
        "app_source": "web",
        "captcha_token": captcha_token
    }

    try:
        response = requests.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access_token')
            
            if access_token:
                session = requests.Session()
                session.headers.update({
                    'Content-Type': 'application/json',
                    'Origin': 'https://sortenabet.bet.br',
                    'Referer': 'https://sortenabet.bet.br/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                    'Authorization': f'Bearer {access_token}'
                })
                ultimo_login = time.time()
                logger.info("✅ Login OK")
                return True
        else:
            logger.error(f"❌ Login falhou: {response.text[:200]}")
            return False
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return False

def obter_url_jogo(slug, email, password):
    """Obtém URL do jogo com cache global"""
    try:
        if not fazer_login(email, password):
            return None
        
        # Faz a requisição (agora mais rápida porque já tem token)
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={
                'slug': slug,
                'platform': 'WEB',
                'use_demo': 0,
                'source': 'watchIsAuthenticated'
            },
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            return game_url
        else:
            logger.warning(f"❌ {slug}: {response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return None

# ========== ROTAS ==========

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Body vazio'}), 400
        
        email = data.get('email') or data.get('login')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email e senha obrigatórios'}), 400
        
        generator = TurnstileTokenGenerator(SITE_KEY, SECRET_KEY)
        captcha_token = generator.generate_token()
        
        login_data = {
            "login": email,
            "email": email,
            "password": password,
            "app_source": "web",
            "captcha_token": captcha_token
        }
        
        response = requests.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=5)
        result = response.json()
        
        if response.status_code == 200:
            access_token = result.get('access_token')
            if access_token:
                global session, ultimo_login
                session = requests.Session()
                session.headers.update({
                    'Authorization': f'Bearer {access_token}'
                })
                ultimo_login = time.time()
        
        return jsonify(result), response.status_code
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/start-game-v2', methods=['GET'])
def api_start_game():
    try:
        slug = request.args.get('slug')
        email = request.args.get('email')
        password = request.args.get('password')
        
        if not slug:
            return jsonify({'error': 'slug obrigatório'}), 400
        
        if not email or not password:
            return jsonify({'error': 'email e password obrigatórios'}), 401
        
        # Tempo de resposta reduzido
        url = obter_url_jogo(slug, email, password)
        
        if url:
            return jsonify({
                'success': True,
                'slug': slug,
                'gameURL': url,
                'iframe_url': url
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Não foi possível obter a URL'
            }), 404
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/roulette/history', methods=['GET'])
def api_roulette_history():
    try:
        slug = request.args.get('slug', 'evolution/brasileira')
        limit = request.args.get('limit', 50)
        
        if session:
            response = session.get(
                f'{API_BASE}/api/roulette/history',
                params={'slug': slug, 'limit': limit},
                timeout=5
            )
            if response.status_code == 200:
                return jsonify(response.json()), response.status_code
        
        # Dados simulados (fallback rápido)
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
    print("🎯 API PROXY - OTIMIZADO")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    app.run(host='0.0.0.0', port=5000, debug=False)
