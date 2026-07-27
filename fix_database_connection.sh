#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔧 CORRIGINDO CONEXÃO COM BANCO DE DADOS"
echo "═══════════════════════════════════════════════════════════════"

# ========== CORRIGE DB.PY ==========
cat > db.py << 'DBEOF'
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
from datetime import datetime
import logging
from dotenv import load_dotenv
import time

load_dotenv()

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.conn = None
        self.max_retries = 3
        self.retry_delay = 1
        self.connect()

    def connect(self):
        """Conecta ao PostgreSQL com retry"""
        for attempt in range(self.max_retries):
            try:
                database_url = os.getenv('DATABASE_URL')
                if database_url:
                    self.conn = psycopg2.connect(database_url)
                else:
                    self.conn = psycopg2.connect(
                        host=os.getenv('DB_HOST', 'localhost'),
                        port=os.getenv('DB_PORT', '5432'),
                        dbname=os.getenv('DB_NAME', 'neondb'),
                        user=os.getenv('DB_USER', 'neondb_owner'),
                        password=os.getenv('DB_PASSWORD', '')
                    )
                
                # Configurações para manter conexão viva
                self.conn.autocommit = False
                self.conn.set_session(autocommit=False)
                
                logger.info(f"✅ Conectado ao PostgreSQL (NeonDB) - tentativa {attempt + 1}")
                
                # Cria tabela se não existir
                self.create_table_if_not_exists()
                return
                
            except Exception as e:
                logger.error(f"❌ Erro ao conectar (tentativa {attempt + 1}/{self.max_retries}): {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                else:
                    raise

    def ensure_connection(self):
        """Verifica e reconecta se necessário"""
        try:
            # Testa se a conexão está viva
            if self.conn:
                with self.conn.cursor() as cur:
                    cur.execute("SELECT 1")
            else:
                self.connect()
        except Exception as e:
            logger.warning(f"⚠️ Conexão perdida, reconectando... {e}")
            self.connect()

    def create_table_if_not_exists(self):
        """Cria a tabela user_sessions se não existir"""
        query = """
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) NOT NULL,
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                password_hash TEXT,
                session_data JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                is_active BOOLEAN DEFAULT true
            );
        """
        try:
            self.execute(query)
            logger.info("✅ Tabela user_sessions verificada/criada")
        except Exception as e:
            logger.error(f"❌ Erro ao criar tabela: {e}")

    def execute(self, query, params=None):
        """Executa uma query com reconexão automática"""
        self.ensure_connection()
        
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                if query.strip().upper().startswith('SELECT'):
                    result = cur.fetchall()
                    # Mantém conexão aberta
                    self.conn.commit()
                    return result
                self.conn.commit()
                return cur.rowcount
        except psycopg2.OperationalError as e:
            logger.error(f"❌ Erro operacional: {e}")
            # Tenta reconectar e executar novamente
            self.connect()
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                if query.strip().upper().startswith('SELECT'):
                    result = cur.fetchall()
                    self.conn.commit()
                    return result
                self.conn.commit()
                return cur.rowcount
        except Exception as e:
            self.conn.rollback()
            logger.error(f"❌ Erro na query: {e}")
            raise

    def close(self):
        """Fecha conexão"""
        if self.conn:
            self.conn.close()
            logger.info("🔌 Conexão fechada")

# Instância global
try:
    db = Database()
except Exception as e:
    logger.error(f"❌ Erro ao criar instância do banco: {e}")
    db = None
DBEOF

echo "✅ db.py corrigido!"

# ========== CORRIGE SESSION_SERVICE.PY ==========
cat > session_service.py << 'SESSEOF'
from db import db
from jwt_helper import jwt_manager
from datetime import datetime
import hashlib
import logging
import json

logger = logging.getLogger(__name__)

class SessionService:
    
    @staticmethod
    def create_session(user_id: str, email: str, password: str, access_token: str, refresh_token: str) -> bool:
        try:
            if db is None:
                logger.error("❌ Banco não disponível")
                return False
                
            access_expires = jwt_manager.get_expires_at('access')
            refresh_expires = jwt_manager.get_expires_at('refresh')
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            query = """
                INSERT INTO user_sessions (
                    user_id, email, access_token, refresh_token, 
                    password_hash, expires_at, session_data, is_active
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, true)
                ON CONFLICT (user_id) 
                DO UPDATE SET
                    access_token = EXCLUDED.access_token,
                    refresh_token = EXCLUDED.refresh_token,
                    password_hash = EXCLUDED.password_hash,
                    expires_at = EXCLUDED.expires_at,
                    updated_at = CURRENT_TIMESTAMP,
                    is_active = true
            """
            
            session_data = json.dumps({
                'login_at': datetime.now().isoformat(),
                'user_agent': 'web',
                'refresh_expires': refresh_expires.isoformat(),
                'email': email,
                'password_hash': password_hash
            })
            
            db.execute(query, (
                user_id, email, access_token, refresh_token,
                password_hash, access_expires, session_data
            ))
            
            logger.info(f"✅ Sessão salva para {email}")
            return True
        except Exception as e:
            logger.error(f"❌ Erro ao salvar sessão: {e}")
            return False

    @staticmethod
    def get_session_by_user_id(user_id: str) -> dict:
        try:
            if db is None:
                return None
            query = "SELECT * FROM user_sessions WHERE user_id = %s AND is_active = true"
            result = db.execute(query, (user_id,))
            return result[0] if result else None
        except Exception as e:
            logger.error(f"❌ Erro ao buscar sessão: {e}")
            return None

    @staticmethod
    def validate_session(token: str) -> dict:
        if db is None:
            return None
            
        payload = jwt_manager.verify_token(token, 'access')
        if not payload:
            return None
        user_id = payload.get('user_id')
        if not user_id:
            return None
        session = SessionService.get_session_by_user_id(user_id)
        if not session:
            return None
        expires_at = session.get('expires_at')
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if datetime.now() > expires_at:
            logger.info(f"⚠️ Token expirado para {user_id}")
            return None
        return session

    @staticmethod
    def refresh_access_token(refresh_token: str) -> dict:
        if db is None:
            return None
            
        payload = jwt_manager.verify_token(refresh_token, 'refresh')
        if not payload:
            return None
        user_id = payload.get('user_id')
        email = payload.get('email')
        if not user_id or not email:
            return None
        session = SessionService.get_session_by_user_id(user_id)
        if not session:
            return None
        if session.get('refresh_token') != refresh_token:
            return None
        
        new_access_token = jwt_manager.generate_token(user_id, email)
        new_expires = jwt_manager.get_expires_at('access')
        
        try:
            query = """
                UPDATE user_sessions 
                SET access_token = %s, expires_at = %s, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
            """
            db.execute(query, (new_access_token, new_expires, user_id))
            return {
                'access_token': new_access_token,
                'expires_in': 7 * 24 * 60 * 60,
                'refresh_token': refresh_token
            }
        except Exception as e:
            logger.error(f"❌ Erro ao renovar token: {e}")
            return None

    @staticmethod
    def deactivate_session(user_id: str) -> bool:
        try:
            if db is None:
                return False
            query = "UPDATE user_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = %s"
            db.execute(query, (user_id,))
            return True
        except Exception as e:
            logger.error(f"❌ Erro ao desativar sessão: {e}")
            return False

    @staticmethod
    def cleanup_expired() -> int:
        try:
            if db is None:
                return 0
            query = "UPDATE user_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE expires_at < NOW() AND is_active = true"
            return db.execute(query)
        except Exception as e:
            logger.error(f"❌ Erro ao limpar sessões: {e}")
            return 0

session_service = SessionService()
SESSEOF

echo "✅ session_service.py corrigido!"

# ========== CORRIGE API_SERVER.PY ==========
cat > api_server.py << 'APIOEF'
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import logging
import os
import json
from datetime import datetime

# Importa db com fallback
try:
    from db import db
    if db is None:
        print("⚠️ Banco de dados não disponível")
except Exception as e:
    print(f"⚠️ Erro ao importar db: {e}")
    db = None

from jwt_helper import jwt_manager
from session_service import session_service
from middleware import require_auth, optional_auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

API_BASE = "https://sortenabet.bet.br"

session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})

# ========== ROTAS ==========

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.json
        email = data.get('login') or data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        print(f"🔐 Tentando login para: {email}")
        
        login_data = {
            "login": email,
            "email": email,
            "password": password,
            "app_source": "web"
        }
        
        response = session.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=15)
        
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
        
        if db:
            session_service.create_session(user_id, email, password, jwt_token, refresh_token)
        
        return jsonify({
            'access_token': jwt_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': 7 * 24 * 60 * 60,
            'user': {
                'id': user_id,
                'name': result.get('user', {}).get('name', email.split('@')[0]),
                'email': email,
                'plan': 'pro'
            }
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Erro no login: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/start-game-v2', methods=['GET'])
@require_auth
def api_start_game():
    try:
        slug = request.args.get('slug')
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        auth_header = session.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token não encontrado'}), 401
        
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={
                'slug': slug,
                'platform': 'WEB',
                'use_demo': 0,
                'source': 'watchIsAuthenticated'
            },
            timeout=15
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
                })
        
        return jsonify({'success': False, 'error': 'Não foi possível gerar o link'}), 404
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

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

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def api_me():
    return jsonify({
        'user_id': request.user_id,
        'email': request.user_email,
        'session': {
            'expires_at': request.session_data.get('expires_at'),
            'is_active': request.session_data.get('is_active')
        }
    }), 200

@app.route('/api/auth/validate', methods=['GET'])
@require_auth
def api_validate():
    return jsonify({
        'valid': True,
        'user_id': request.user_id,
        'email': request.user_email,
        'expires_at': request.session_data.get('expires_at')
    }), 200

@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def api_logout():
    if db:
        session_service.deactivate_session(request.user_id)
    return jsonify({'success': True}), 200

@app.route('/api/public/info', methods=['GET'])
@optional_auth
def public_info():
    user_info = None
    if hasattr(request, 'user_id'):
        user_info = {'user_id': request.user_id, 'email': request.user_email}
    return jsonify({'message': 'Rota pública', 'authenticated': user_info is not None, 'user': user_info}), 200

@app.before_request
def cleanup_expired_sessions():
    if db:
        try:
            session_service.cleanup_expired()
        except Exception as e:
            logger.error(f"❌ Erro ao limpar sessões: {e}")

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
    print("🎯 API PROXY - QA.AI")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("🗄️  Banco: NeonDB (PostgreSQL)")
    print("🛡️  Auth: JWT + Refresh Token")
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    if db:
        try:
            session_service.cleanup_expired()
        except Exception as e:
            print(f"⚠️ Erro ao limpar sessões: {e}")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
APIOEF

echo "✅ api_server.py atualizado!"

echo "═══════════════════════════════════════════════════════════════"
echo "✅ CORREÇÕES CONCLUÍDAS!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📦 Faça o commit e push:"
echo ""
echo "git add ."
echo "git commit -m \"fix: corrige conexão com banco de dados (connection already closed)\""
echo "git push origin main"
echo ""
echo "🔧 O que foi corrigido:"
echo "  ✅ Reconexão automática ao banco"
echo "  ✅ Verificação de conexão antes de cada query"
echo "  ✅ Fallback se banco não estiver disponível"
echo "  ✅ Tratamento de erros de conexão"
echo ""
echo "🚀 Depois do deploy, o banco vai funcionar direto!"
echo "═══════════════════════════════════════════════════════════════"

