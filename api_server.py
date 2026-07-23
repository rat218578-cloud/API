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

# ========== SESSÕES POR JOGO (cada jogo tem seu próprio token) ==========
sessoes_jogos = {}

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

def get_sessao_jogo(slug, email):
    key = f"{email}:{slug}"
    if key not in sessoes_jogos:
        session = requests.Session()
        session.headers.update({
            'Content-Type': 'application/json',
            'Origin': 'https://sortenabet.bet.br',
            'Referer': 'https://sortenabet.bet.br/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
        })
        sessoes_jogos[key] = {
            'session': session,
            'ultimo_login': None,
            'token': None,
            'game_url': None,
            'url_timestamp': None
        }
        logger.info(f"🆕 Nova sessão para: {slug}")
    return sessoes_jogos[key]

def obter_url_jogo(slug, email, password, force_refresh=False):
    """Gera URL do jogo - SEMPRE novo link se force_refresh=True"""
    try:
        key = f"{email}:{slug}"
        game_session = get_sessao_jogo(slug, email)
        
        # Se force_refresh, limpa cache e gera NOVO link
        if force_refresh:
            game_session['game_url'] = None
            game_session['url_timestamp'] = None
            logger.info(f"🔄 Forçando NOVO link para {slug}")
        
        # Verifica cache (apenas se NÃO for force_refresh)
        if not force_refresh and game_session['game_url'] and game_session['url_timestamp']:
            if (time.time() - game_session['url_timestamp']) < 60:  # 1 minuto
                logger.info(f"📦 Cache para {slug}")
                return game_session['game_url']
        
        # FAZ LOGIN E GERA NOVO LINK
        generator = TurnstileTokenGenerator(SITE_KEY, SECRET_KEY)
        captcha_token = generator.generate_token()
        
        login_data = {
            "login": email,
            "email": email,
            "password": password,
            "app_source": "web",
            "captcha_token": captcha_token
        }
        
        session = game_session['session']
        response = session.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=10)
        
        if response.status_code != 200:
            logger.error(f"❌ Login falhou para {slug}")
            return None
        
        data = response.json()
        access_token = data.get('access_token')
        
        if not access_token:
            return None
        
        session.headers.update({'Authorization': f'Bearer {access_token}'})
        game_session['ultimo_login'] = time.time()
        game_session['token'] = access_token
        
        # Gera URL do jogo
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
        
        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            if game_url:
                game_session['game_url'] = game_url
                game_session['url_timestamp'] = time.time()
                logger.info(f"✅ NOVO link gerado para {slug}")
                return game_url
        
        logger.warning(f"❌ Falha ao obter URL para {slug}")
        return None
            
    except Exception as e:
        logger.error(f"❌ Erro ao buscar {slug}: {e}")
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
        
        response = requests.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=10)
        result = response.json()
        
        if response.status_code == 200:
            access_token = result.get('access_token')
            if access_token:
                return jsonify({
                    'access_token': access_token,
                    'token_type': 'Bearer',
                    'expires_in': 604800,
                    'user': result.get('user', {
                        'id': 1,
                        'name': email.split('@')[0],
                        'email': email
                    })
                }), 200
        
        return jsonify(result), response.status_code
        
    except Exception as e:
        logger.error(f"❌ Erro no login: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/start-game-v2', methods=['GET'])
def api_start_game():
    try:
        slug = request.args.get('slug')
        email = request.args.get('email')
        password = request.args.get('password')
        force_refresh = request.args.get('force_refresh', 'true').lower() == 'true'
        
        if not slug:
            return jsonify({'error': 'slug obrigatório'}), 400
        
        if not email or not password:
            return jsonify({'error': 'email e password obrigatórios'}), 401
        
        # SEMPRE gera link novo quando force_refresh=true (padrão)
        url = obter_url_jogo(slug, email, password, force_refresh)
        
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
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            token = auth_header.replace('Bearer ', '')
            headers = {'Authorization': f'Bearer {token}'}
            response = requests.get(
                f'{API_BASE}/api/roulette/history',
                params={'slug': slug, 'limit': limit},
                headers=headers,
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
    print("🎯 API PROXY - SEMPRE GERA LINK NOVO")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    app.run(host='0.0.0.0', port=5000, debug=False)
