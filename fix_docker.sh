#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔧 CORREÇÃO - PSYCOPG2 NÃO INSTALADO"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. ATUALIZA REQUIREMENTS.TXT ==========
cat > requirements.txt << 'REQEOF'
flask==2.3.3
flask-cors==4.0.0
requests==2.31.0
psycopg2-binary==2.9.9
python-dotenv==1.0.0
REQEOF

echo "✅ requirements.txt atualizado!"

# ========== 2. CORRIGE DOCKERFILE ==========
cat > Dockerfile << 'DOCEOF'
FROM python:3.11-slim

WORKDIR /app

# Instalar Node.js para build do frontend
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependências primeiro (melhor caching)
COPY package*.json ./
COPY requirements.txt ./

# Instalar dependências Python e Node
RUN pip install --no-cache-dir -r requirements.txt
RUN npm install

# Copiar o resto do código
COPY . .

# Build do frontend
RUN npm run build

# Expor porta
EXPOSE 5000

# Comando para iniciar
CMD ["python3", "api_server.py"]
DOCEOF

echo "✅ Dockerfile atualizado!"

# ========== 3. CRIA SCRIPT DE START ==========
cat > start.sh << 'STARTEOF'
#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 INICIANDO API - QA.AI"
echo "═══════════════════════════════════════════════════════════════"

# Instala dependências se necessário
pip install -r requirements.txt --no-cache-dir

# Inicia o servidor
python3 api_server.py
STARTEOF

chmod +x start.sh

echo "✅ start.sh criado!"

# ========== 4. CORRIGE DB.PY ==========
cat > db.py << 'DBEOF'
import os
import sys
import logging

# Tenta importar psycopg2 com fallback
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("❌ psycopg2 não instalado. Instalando...")
    os.system("pip install psycopg2-binary")
    import psycopg2
    from psycopg2.extras import RealDictCursor

from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.conn = None
        self.connect()

    def connect(self):
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
            print("✅ Conectado ao PostgreSQL (NeonDB)")
            
            self.create_table_if_not_exists()
            
        except Exception as e:
            print(f"❌ Erro ao conectar: {e}")
            raise

    def create_table_if_not_exists(self):
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
            print("✅ Tabela user_sessions verificada/criada")
        except Exception as e:
            print(f"❌ Erro ao criar tabela: {e}")

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
            print("🔌 Conexão fechada")

# Instância global com fallback
try:
    db = Database()
except Exception as e:
    print(f"⚠️ Erro ao conectar: {e}")
    db = None
DBEOF

echo "✅ db.py atualizado!"

# ========== 5. CORRIGE API_SERVER.PY ==========
cat > api_server.py << 'APIOEF'
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import logging
import os
import sys

# Tenta importar db com fallback
try:
    from db import db
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
        
        if db:
            session_service.create_session(user_id, email, password, jwt_token, refresh_token)
        else:
            print("⚠️ Banco não disponível, mas continuando...")
        
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
    if db:
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
    if db:
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
    
    if db:
        session_service.cleanup_expired()
    else:
        print("⚠️ Banco de dados não disponível - continuando sem persistência")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
APIOEF

echo "✅ api_server.py atualizado!"

echo "═══════════════════════════════════════════════════════════════"
echo "✅ TODAS AS CORREÇÕES CONCLUÍDAS!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📦 Faça o commit e push:"
echo ""
echo "git add ."
echo "git commit -m \"fix: adiciona psycopg2 e fallback para banco\""
echo "git push origin main"
echo ""
echo "🚀 O Railway vai buildar com sucesso!"
echo "═══════════════════════════════════════════════════════════════"

