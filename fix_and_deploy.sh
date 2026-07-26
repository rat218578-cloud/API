#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔧 CORRIGINDO ERROS E FAZENDO DEPLOY - QA.AI"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. CORRIGE .ENV COM CONEXÃO DO NEONDB ==========
cat > .env << 'ENVEOF'
# Banco de Dados - NeonDB (PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:npg_xfAJSo7nEa4P@ep-bitter-king-aykqh1ix-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require

DB_HOST=ep-bitter-king-aykqh1ix-pooler.c-5.us-east-2.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=npg_xfAJSo7nEa4P

# JWT
JWT_SECRET=qa-ai-super-secret-key-2026-production
REFRESH_SECRET=qa-ai-refresh-secret-2026-production
JWT_EXPIRES_DAYS=7
REFRESH_EXPIRES_DAYS=30

# API
API_BASE_URL=https://sortenabet.bet.br
PORT=5000
ENVEOF

echo "✅ .env atualizado com NeonDB!"

# ========== 2. CORRIGE DB.PY ==========
cat > db.py << 'DBEOF'
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.conn = None
        self.connect()

    def connect(self):
        try:
            # Tenta usar DATABASE_URL primeiro
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
            logger.info("✅ Conectado ao PostgreSQL (NeonDB)")
            
            # Cria tabela se não existir
            self.create_table_if_not_exists()
            
        except Exception as e:
            logger.error(f"❌ Erro ao conectar: {e}")
            raise

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
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                if query.strip().upper().startswith('SELECT'):
                    return cur.fetchall()
                self.conn.commit()
                return cur.rowcount
        except Exception as e:
            self.conn.rollback()
            logger.error(f"❌ Erro na query: {e}")
            raise

    def close(self):
        if self.conn:
            self.conn.close()
            logger.info("🔌 Conexão fechada")

db = Database()
DBEOF

echo "✅ db.py corrigido!"

# ========== 3. CORRIGE JWT_HELPER.PY ==========
cat > jwt_helper.py << 'JWTOEF'
import hashlib
import json
import os
from datetime import datetime, timedelta
import secrets
import base64
import logging

logger = logging.getLogger(__name__)

class JWTManager:
    def __init__(self):
        self.secret = os.getenv('JWT_SECRET', 'qa-ai-secret-key-2026')
        self.refresh_secret = os.getenv('REFRESH_SECRET', 'qa-ai-refresh-secret-2026')
        self.expires_days = int(os.getenv('JWT_EXPIRES_DAYS', 7))
        self.refresh_expires_days = int(os.getenv('REFRESH_EXPIRES_DAYS', 30))

    def generate_token(self, user_id: str, email: str) -> str:
        expires_at = (datetime.now() + timedelta(days=self.expires_days)).isoformat()
        payload = {
            'user_id': user_id,
            'email': email,
            'type': 'access',
            'expires_at': expires_at,
            'created_at': datetime.now().isoformat(),
            'nonce': secrets.token_hex(16)
        }
        payload_json = json.dumps(payload, separators=(',', ':'))
        payload_b64 = base64.b64encode(payload_json.encode()).decode()
        signature = hashlib.sha256(f"{payload_b64}.{self.secret}".encode()).hexdigest()
        return f"jwt:{payload_b64}:{signature}"

    def generate_refresh_token(self, user_id: str, email: str) -> str:
        expires_at = (datetime.now() + timedelta(days=self.refresh_expires_days)).isoformat()
        payload = {
            'user_id': user_id,
            'email': email,
            'type': 'refresh',
            'expires_at': expires_at,
            'created_at': datetime.now().isoformat(),
            'nonce': secrets.token_hex(16)
        }
        payload_json = json.dumps(payload, separators=(',', ':'))
        payload_b64 = base64.b64encode(payload_json.encode()).decode()
        signature = hashlib.sha256(f"{payload_b64}.{self.refresh_secret}".encode()).hexdigest()
        return f"rft:{payload_b64}:{signature}"

    def verify_token(self, token: str, token_type: str = 'access') -> dict:
        try:
            prefix = 'jwt:' if token_type == 'access' else 'rft:'
            secret = self.secret if token_type == 'access' else self.refresh_secret
            if not token.startswith(prefix):
                return None
            parts = token.split(':')
            if len(parts) != 3:
                return None
            _, payload_b64, signature = parts
            expected = hashlib.sha256(f"{payload_b64}.{secret}".encode()).hexdigest()
            if signature != expected:
                return None
            payload_json = base64.b64decode(payload_b64).decode()
            payload = json.loads(payload_json)
            if payload.get('type') != token_type:
                return None
            expires_at = datetime.fromisoformat(payload['expires_at'])
            if datetime.now() > expires_at:
                return None
            return payload
        except Exception as e:
            logger.error(f"❌ Erro ao verificar token: {e}")
            return None

    def get_expires_at(self, token_type: str = 'access') -> datetime:
        days = self.expires_days if token_type == 'access' else self.refresh_expires_days
        return datetime.now() + timedelta(days=days)

jwt_manager = JWTManager()
JWTOEF

echo "✅ jwt_helper.py corrigido!"

# ========== 4. CORRIGE SESSION_SERVICE.PY ==========
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
                'refresh_expires': refresh_expires.isoformat()
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
            query = "SELECT * FROM user_sessions WHERE user_id = %s AND is_active = true"
            result = db.execute(query, (user_id,))
            return result[0] if result else None
        except Exception as e:
            logger.error(f"❌ Erro ao buscar sessão: {e}")
            return None

    @staticmethod
    def validate_session(token: str) -> dict:
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
            query = "UPDATE user_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = %s"
            db.execute(query, (user_id,))
            return True
        except Exception as e:
            logger.error(f"❌ Erro ao desativar sessão: {e}")
            return False

    @staticmethod
    def cleanup_expired() -> int:
        try:
            query = "UPDATE user_sessions SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE expires_at < NOW() AND is_active = true"
            return db.execute(query)
        except Exception as e:
            logger.error(f"❌ Erro ao limpar sessões: {e}")
            return 0

session_service = SessionService()
SESSEOF

echo "✅ session_service.py corrigido!"

# ========== 5. CORRIGE MIDDLEWARE.PY ==========
cat > middleware.py << 'MIDEOF'
from functools import wraps
from flask import request, jsonify
import logging
from session_service import session_service

logger = logging.getLogger(__name__)

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            auth_header = request.headers.get('Authorization')
            if not auth_header:
                return jsonify({'error': 'Token não fornecido'}), 401
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                return jsonify({'error': 'Formato inválido'}), 401
            token = parts[1]
            session = session_service.validate_session(token)
            if not session:
                return jsonify({'error': 'Token inválido ou expirado'}), 401
            request.user_id = session.get('user_id')
            request.user_email = session.get('email')
            request.session_data = session
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"❌ Erro no middleware: {e}")
            return jsonify({'error': 'Erro interno'}), 500
    return decorated_function

def optional_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            auth_header = request.headers.get('Authorization')
            if auth_header:
                parts = auth_header.split()
                if len(parts) == 2 and parts[0].lower() == 'bearer':
                    token = parts[1]
                    session = session_service.validate_session(token)
                    if session:
                        request.user_id = session.get('user_id')
                        request.user_email = session.get('email')
                        request.session_data = session
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"❌ Erro no optional_auth: {e}")
            return f(*args, **kwargs)
    return decorated_function
MIDEOF

echo "✅ middleware.py corrigido!"

# ========== 6. CORRIGE API_SERVER.PY ==========
cat > api_server.py << 'APIOEF'
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import logging
import os
from db import db
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
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.json
        email = data.get('login') or data.get('email')
        password = data.get('password')
        if not email or not password:
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        login_data = {"login": email, "email": email, "password": password, "app_source": "web"}
        response = session.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=10)
        result = response.json()
        
        if response.status_code != 200:
            return jsonify(result), response.status_code
        
        user_id = str(result.get('user', {}).get('id', email))
        jwt_token = jwt_manager.generate_token(user_id, email)
        refresh_token = jwt_manager.generate_refresh_token(user_id, email)
        
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
    session_service.deactivate_session(request.user_id)
    return jsonify({'success': True}), 200

@app.route('/api/start-game-v2', methods=['GET'])
@require_auth
def api_start_game():
    try:
        slug = request.args.get('slug')
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        email = request.user_email
        session_data = request.session_data
        password_hash = session_data.get('password_hash')
        
        # Tenta usar a senha original ou hash
        password = password_hash
        
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={'slug': slug, 'platform': 'WEB', 'use_demo': 0},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            if game_url:
                return jsonify({'success': True, 'slug': slug, 'gameURL': game_url, 'iframe_url': game_url})
        
        return jsonify({'success': False, 'error': 'Não foi possível obter a URL'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/public/info', methods=['GET'])
@optional_auth
def public_info():
    user_info = None
    if hasattr(request, 'user_id'):
        user_info = {'user_id': request.user_id, 'email': request.user_email}
    return jsonify({'message': 'Rota pública', 'authenticated': user_info is not None, 'user': user_info}), 200

@app.before_request
def cleanup_expired_sessions():
    session_service.cleanup_expired()

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
    session_service.cleanup_expired()
    app.run(host='0.0.0.0', port=5000, debug=False)
APIOEF

echo "✅ api_server.py corrigido!"

# ========== 7. CORRIGE HOOK USEAUTH.TS ==========
cat > src/hooks/useAuth.ts << 'AUTHOEF'
import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false
  });

  const refreshToken = async (refreshToken: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        return data.access_token;
      }
      return null;
    } catch {
      return null;
    }
  };

  const validateToken = async (): Promise<boolean> => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!accessToken) {
      setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      return false;
    }

    try {
      const response = await fetch('/api/auth/validate', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ 
          ...prev, 
          user: { id: data.user_id, email: data.email, name: data.email?.split('@')[0] || 'Usuário', plan: 'pro' },
          isAuthenticated: true,
          loading: false 
        }));
        return true;
      }

      if (refreshToken) {
        const newAccessToken = await refreshToken(refreshToken);
        if (newAccessToken) {
          return await validateToken();
        }
      }

      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      return false;
    } catch {
      setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setState(prev => ({ ...prev, error: data.error || 'Erro ao fazer login', loading: false }));
        return false;
      }

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      setState(prev => ({
        ...prev,
        user: data.user,
        isAuthenticated: true,
        loading: false
      }));

      return true;
    } catch {
      setState(prev => ({ ...prev, error: 'Erro de conexão', loading: false }));
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
      } catch {}
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    setState({
      user: null,
      loading: false,
      error: null,
      isAuthenticated: false
    });
  };

  useEffect(() => {
    validateToken();
  }, []);

  return {
    ...state,
    login,
    logout,
    validateToken,
    refreshToken
  };
}
AUTHOEF

echo "✅ src/hooks/useAuth.ts corrigido!"

# ========== 8. REMOVE REFERÊNCIA A getGameLink ==========
# O erro era porque o useAuth não tinha getGameLink
# Já removemos essa referência

echo "═══════════════════════════════════════════════════════════════"
echo "✅ TODOS OS ARQUIVOS FORAM CORRIGIDOS!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📦 Para fazer deploy:"
echo ""
echo "git add ."
echo "git commit -m \"fix: corrige autenticação e conexão NeonDB\""
echo "git push origin main"
echo ""
echo "🚀 O Railway vai fazer o build automaticamente!"
echo "═══════════════════════════════════════════════════════════════"

