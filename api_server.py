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
import psycopg2
from psycopg2.extras import Json
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

# ========== CONFIGURAÇÕES ==========
SITE_KEY = "0x4AAAAAAADmr68KUqpnEKo-9"
SECRET_KEY = "0x4AAAAAAADmr62kWZNpTLxzKtYOYbpw7wzY"
API_BASE = "https://sortenabet.bet.br"

# ========== CONEXÃO POSTGRESQL ==========
DATABASE_URL = "postgresql://neondb_owner:npg_xfAJSo7nEa4P@ep-bitter-king-aykqh1ix-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"

def get_db_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logger.error(f"❌ Erro ao conectar ao PostgreSQL: {e}")
        return None

# ========== FUNÇÕES DE SESSÃO ==========
def get_user_session(email):
    """Busca sessão do usuário no banco"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id, access_token, session_data, expires_at FROM user_sessions WHERE email = %s AND is_active = TRUE",
            (email,)
        )
        result = cur.fetchone()
        cur.close()
        conn.close()
        
        if result:
            return {
                'user_id': result[0],
                'access_token': result[1],
                'session_data': result[2],
                'expires_at': result[3]
            }
        return None
    except Exception as e:
        logger.error(f"❌ Erro ao buscar sessão: {e}")
        return None

def save_user_session(email, user_id, access_token, session_data=None, expires_in=604800):
    """Salva ou atualiza sessão do usuário"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cur = conn.cursor()
        expires_at = datetime.now() + timedelta(seconds=expires_in)
        
        cur.execute("""
            INSERT INTO user_sessions (user_id, email, access_token, session_data, expires_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE SET
                access_token = EXCLUDED.access_token,
                session_data = EXCLUDED.session_data,
                expires_at = EXCLUDED.expires_at,
                updated_at = CURRENT_TIMESTAMP,
                is_active = TRUE
        """, (user_id, email, access_token, Json(session_data or {}), expires_at))
        
        conn.commit()
        cur.close()
        conn.close()
        logger.info(f"✅ Sessão salva para {email}")
        return True
    except Exception as e:
        logger.error(f"❌ Erro ao salvar sessão: {e}")
        return False

def get_game_session(email, slug):
    """Busca sessão de um jogo específico"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT game_url, game_token, session_data, expires_at 
            FROM game_sessions 
            WHERE user_id = (SELECT user_id FROM user_sessions WHERE email = %s) 
            AND game_slug = %s AND is_active = TRUE
        """, (email, slug))
        result = cur.fetchone()
        cur.close()
        conn.close()
        
        if result:
            return {
                'game_url': result[0],
                'game_token': result[1],
                'session_data': result[2],
                'expires_at': result[3]
            }
        return None
    except Exception as e:
        logger.error(f"❌ Erro ao buscar sessão do jogo: {e}")
        return None

def save_game_session(email, slug, game_url, game_token=None, session_data=None, expires_in=300):
    """Salva ou atualiza sessão de um jogo"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        cur = conn.cursor()
        expires_at = datetime.now() + timedelta(seconds=expires_in)
        
        # Pega o user_id
        cur.execute("SELECT user_id FROM user_sessions WHERE email = %s", (email,))
        result = cur.fetchone()
        if not result:
            logger.error(f"❌ Usuário não encontrado: {email}")
            return False
        
        user_id = result[0]
        
        cur.execute("""
            INSERT INTO game_sessions (user_id, game_slug, game_url, game_token, session_data, expires_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, game_slug) DO UPDATE SET
                game_url = EXCLUDED.game_url,
                game_token = EXCLUDED.game_token,
                session_data = EXCLUDED.session_data,
                expires_at = EXCLUDED.expires_at,
                updated_at = CURRENT_TIMESTAMP,
                is_active = TRUE
        """, (user_id, slug, game_url, game_token, Json(session_data or {}), expires_at))
        
        conn.commit()
        cur.close()
        conn.close()
        logger.info(f"✅ Sessão do jogo {slug} salva para {email}")
        return True
    except Exception as e:
        logger.error(f"❌ Erro ao salvar sessão do jogo: {e}")
        return False

# ========== CLASSES ==========
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

def obter_url_jogo(slug, email, password, force_refresh=False):
    """Obtém URL do jogo usando sessão do banco"""
    try:
        # Verifica se já tem sessão do jogo no banco
        game_session = get_game_session(email, slug)
        
        if game_session and game_session.get('game_url') and not force_refresh:
            expires_at = game_session.get('expires_at')
            if expires_at and datetime.now() < expires_at:
                logger.info(f"📦 URL em cache no banco para {slug}")
                return game_session['game_url']
        
        # Faz login para obter token
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
        
        if response.status_code != 200:
            logger.error(f"❌ Login falhou para {slug}")
            return None
        
        data = response.json()
        access_token = data.get('access_token')
        
        if not access_token:
            return None
        
        # Faz requisição para obter a URL do jogo
        headers = {'Authorization': f'Bearer {access_token}'}
        
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={
                'slug': slug,
                'platform': 'WEB',
                'use_demo': 0,
                'source': 'watchIsAuthenticated'
            },
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            if game_url:
                # Salva no banco
                save_game_session(email, slug, game_url, access_token, {'last_access': time.time()})
                return game_url
        else:
            logger.warning(f"❌ {slug}: {response.status_code}")
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
            user_data = result.get('user', {})
            
            if access_token:
                # Salva sessão no banco
                user_id = str(user_data.get('id', email))
                save_user_session(email, user_id, access_token, user_data)
                
                return jsonify({
                    'access_token': access_token,
                    'token_type': 'Bearer',
                    'expires_in': 604800,
                    'user': user_data
                }), 200
        
        return jsonify(result), response.status_code
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/start-game-v2', methods=['GET'])
def api_start_game():
    try:
        slug = request.args.get('slug')
        email = request.args.get('email')
        password = request.args.get('password')
        force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
        
        if not slug:
            return jsonify({'error': 'slug obrigatório'}), 400
        
        if not email or not password:
            return jsonify({'error': 'email e password obrigatórios'}), 401
        
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
    print("🎯 API PROXY - SESSÃO COM POSTGRESQL")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("🐘 PostgreSQL:", DATABASE_URL.split('@')[1].split('/')[0])
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    app.run(host='0.0.0.0', port=5000, debug=False)
