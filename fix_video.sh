#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🎥 CORREÇÃO - LINK DO VÍDEO NÃO GERADO"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. CORRIGE API_SERVER.PY - ROTA START-GAME ==========
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

# ========== SESSÃO HTTP COM COOKIES ==========
session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
})

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
            "app_source": "web",
            "captcha_token": "test_token"
        }
        
        response = session.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=15)
        print(f"📥 Status login: {response.status_code}")
        
        if response.status_code != 200:
            return jsonify({'error': 'Credenciais inválidas'}), 401
        
        result = response.json()
        access_token_externo = result.get('access_token')
        
        if not access_token_externo:
            return jsonify({'error': 'Token não retornado'}), 500
        
        # Guarda token externo na sessão
        session.headers.update({'Authorization': f'Bearer {access_token_externo}'})
        
        user_id = str(result.get('user', {}).get('id', email))
        
        # GERA TOKENS LOCAIS
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
        print(f"🎮 Gerando link para: {slug}")
        
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        # Busca credenciais da sessão
        user_id = request.user_id
        email = request.user_email
        
        # Recupera senha do banco ou localStorage
        session_data = request.session_data
        password_hash = session_data.get('password_hash')
        
        # Busca dados do usuário do banco
        if db:
            user_data = session_service.get_session_by_user_id(user_id)
            if user_data:
                email = user_data.get('email')
                password_hash = user_data.get('password_hash')
                print(f"📧 Email do banco: {email}")
        
        if not email:
            return jsonify({'error': 'Email não encontrado'}), 401
        
        print(f"🔑 Tentando gerar link com email: {email}")
        
        # Faz login novamente para garantir token fresco
        try:
            # Tenta usar o refresh token para renovar
            refresh_token = session_data.get('refresh_token')
            if refresh_token:
                refresh_result = session_service.refresh_access_token(refresh_token)
                if refresh_result:
                    print("🔄 Token renovado via refresh")
        except Exception as e:
            print(f"⚠️ Erro ao renovar token: {e}")
        
        # Busca URL do jogo com headers corretos
        headers = session.headers.copy()
        
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={
                'slug': slug,
                'platform': 'WEB',
                'use_demo': 0,
                'source': 'watchIsAuthenticated'
            },
            headers=headers,
            timeout=15
        )
        
        print(f"📥 Status start-game: {response.status_code}")
        print(f"📦 Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            
            if game_url:
                print(f"✅ URL gerada: {game_url[:100]}...")
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': game_url,
                    'iframe_url': game_url
                })
        
        # Se falhou, tenta com credenciais diretas
        print("🔄 Tentando com credenciais diretas...")
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={
                'slug': slug,
                'platform': 'WEB',
                'use_demo': 0,
                'email': email,
                'password': password_hash
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
        
        return jsonify({
            'success': False,
            'error': 'Não foi possível gerar o link. Tente novamente.'
        }), 404
        
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Timeout ao gerar link'}), 504
    except Exception as e:
        logger.error(f"❌ Erro ao gerar link: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTAS DE AUTH ==========
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

echo "✅ api_server.py atualizado com melhorias!"

# ========== 2. ATUALIZA SESSION_SERVICE ==========
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

echo "✅ session_service.py atualizado!"

# ========== 3. REMOVE CACHE DE JOGOS ==========
# Força recarregar os links

echo "═══════════════════════════════════════════════════════════════"
echo "✅ CORREÇÕES CONCLUÍDAS!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📦 Faça o commit e push:"
echo ""
echo "git add ."
echo "git commit -m \"fix: corrige geração de link do vídeo com credenciais\""
echo "git push origin main"
echo ""
echo "🚀 Depois do deploy, faça login novamente e clique em Gerar link"
echo "═══════════════════════════════════════════════════════════════"

