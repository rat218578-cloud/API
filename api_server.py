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

# ===== DOMÍNIO CORRETO (usando sortenabet.bet.br que funcionava no Python original) =====
API_BASE = "https://sortenabet.bet.br"

# ========== SESSÕES POR USUÁRIO ==========
sessoes = {}

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

def get_user_session(email):
    if email not in sessoes:
        sessoes[email] = {
            'session': None,
            'ultimo_login': None,
            'access_token': None
        }
    return sessoes[email]

def fazer_login_usuario(email, password):
    user_session = get_user_session(email)
    
    if user_session['ultimo_login'] and datetime.now() - user_session['ultimo_login'] < timedelta(minutes=5):
        logger.info(f"✅ Login ainda válido para {email}")
        return True
    
    logger.info(f"🔐 FAZENDO LOGIN para {email}...")
    
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
        # ===== USANDO O ENDPOINT CORRETO (igual ao Python original) =====
        response = requests.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=10)
        
        logger.info(f"📥 Status: {response.status_code}")
        logger.info(f"📄 Resposta: {response.text[:200]}")
        
        if response.status_code == 200:
            try:
                data = response.json()
            except json.JSONDecodeError:
                logger.error("❌ Resposta não é JSON válido")
                return False
            
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
                user_session['session'] = session
                user_session['ultimo_login'] = datetime.now()
                user_session['access_token'] = access_token
                logger.info(f"✅ Login OK para {email}")
                return True
        else:
            logger.error(f"❌ Login falhou para {email}: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Erro no login para {email}: {e}")
        return False
    
    return False

def obter_url_jogo(slug, email, password):
    try:
        if not fazer_login_usuario(email, password):
            return None
        
        user_session = get_user_session(email)
        session = user_session['session']
        
        # ===== USANDO O ENDPOINT CORRETO (igual ao Python original) =====
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={
                'slug': slug,
                'platform': 'WEB',
                'use_demo': 0,
                'source': 'watchIsAuthenticated'
            },
            timeout=10
        )
        
        logger.info(f"📥 Status start-game: {response.status_code}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                game_url = data.get('iframe_url') or data.get('gameURL')
                return game_url
            except json.JSONDecodeError:
                logger.error(f"❌ Resposta não é JSON para {slug}")
                return None
        else:
            logger.warning(f"❌ {slug}: HTTP {response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Erro ao buscar {slug}: {e}")
        return None

# ========== ROTAS API ==========
@app.route('/api/start-game-v2', methods=['GET'])
def api_start_game():
    slug = request.args.get('slug')
    email = request.args.get('email')
    password = request.args.get('password')
    
    if not slug:
        return jsonify({'error': 'slug é obrigatório'}), 400
    
    if not email or not password:
        return jsonify({
            'error': 'email e password são obrigatórios para gerar o link',
            'success': False
        }), 401
    
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
            'error': 'Não foi possível obter a URL do jogo'
        }), 404

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.get_json()
        
        if not data:
            logger.error("❌ Body da requisição vazio")
            return jsonify({'error': 'Body da requisição vazio'}), 400
        
        email = data.get('login') or data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        generator = TurnstileTokenGenerator(SITE_KEY, SECRET_KEY)
        captcha_token = generator.generate_token()
        
        login_data = {
            "login": email,
            "email": email,
            "password": password,
            "app_source": "web",
            "captcha_token": captcha_token
        }
        
        logger.info(f"📤 Login para: {email}")
        
        # ===== USANDO O ENDPOINT CORRETO (igual ao Python original) =====
        response = requests.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=10)
        
        logger.info(f"📥 Status: {response.status_code}")
        logger.info(f"📄 Resposta: {response.text[:200]}")
        
        # Tenta parsear a resposta
        try:
            result = response.json()
        except json.JSONDecodeError:
            logger.error(f"❌ Resposta não é JSON: {response.text[:200]}")
            return jsonify({'error': 'Resposta da API inválida'}), 500
        
        if response.status_code == 200:
            access_token = result.get('access_token')
            if access_token:
                user_session = get_user_session(email)
                session = requests.Session()
                session.headers.update({
                    'Content-Type': 'application/json',
                    'Origin': 'https://sortenabet.bet.br',
                    'Referer': 'https://sortenabet.bet.br/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                    'Authorization': f'Bearer {access_token}'
                })
                user_session['session'] = session
                user_session['ultimo_login'] = datetime.now()
                user_session['access_token'] = access_token
                logger.info(f"✅ Login OK para {email}")
        
        return jsonify(result), response.status_code
    except Exception as e:
        logger.error(f"❌ Erro no login: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/roulette/history', methods=['GET'])
def api_roulette_history():
    try:
        slug = request.args.get('slug', 'evolution/brasileira')
        limit = request.args.get('limit', 50)
        email = request.args.get('email')
        
        if not email:
            auth_header = request.headers.get('Authorization')
            if auth_header:
                token = auth_header.replace('Bearer ', '')
                for user_email, user_session in sessoes.items():
                    if user_session.get('access_token') == token:
                        email = user_email
                        break
        
        if email and email in sessoes and sessoes[email]['session']:
            session = sessoes[email]['session']
            response = session.get(
                f'{API_BASE}/api/roulette/history',
                params={'slug': slug, 'limit': limit},
                timeout=10
            )
            if response.status_code == 200:
                try:
                    return jsonify(response.json()), response.status_code
                except json.JSONDecodeError:
                    pass
        
        # Dados simulados se falhar
        return jsonify({
            'spins': [
                {'number': n, 'color': 'red' if n % 2 == 0 else 'black', 
                 'timestamp': datetime.now().isoformat(), 'roundId': f'sim_{i}'}
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

# ========== ROTAS FRONTEND ==========
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
    print("🎯 API SERVER + FRONTEND - SORTE NA BET")
    print("=" * 70)
    print("🌐 Rodando em: http://localhost:5000")
    print("📡 API Base:", API_BASE)
    print("=" * 70)
    app.run(host='0.0.0.0', port=5000, debug=False)
