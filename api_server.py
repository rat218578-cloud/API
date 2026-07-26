from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import time
import logging
import os
from datetime import datetime
from db import db
from jwt_helper import jwt_manager
from session_service import session_service
from middleware import require_auth, optional_auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

# ========== CONFIGURAÇÕES ==========
API_BASE = "https://sortenabet.bet.br"

# ========== SESSÃO HTTP ==========
session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
})

# ========== ROTA DE LOGIN ==========
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.json
        email = data.get('login') or data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        login_data = {
            "login": email,
            "email": email,
            "password": password,
            "app_source": "web"
        }
        
        response = session.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=10)
        result = response.json()
        
        if response.status_code != 200:
            return jsonify(result), response.status_code
        
        access_token_externo = result.get('access_token')
        if not access_token_externo:
            return jsonify({'error': 'Token não retornado'}), 500
        
        user_id = str(result.get('user', {}).get('id', email))
        
        jwt_token = jwt_manager.generate_token(user_id, email)
        refresh_token = jwt_manager.generate_refresh_token(user_id, email)
        
        session_service.create_session(
            user_id=user_id,
            email=email,
            password=password,
            access_token=jwt_token,
            refresh_token=refresh_token
        )
        
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

# ========== ROTA DE REFRESH ==========
@app.route('/api/auth/refresh', methods=['POST'])
def api_refresh():
    try:
        data = request.json
        refresh_token = data.get('refresh_token')
        
        if not refresh_token:
            return jsonify({'error': 'Refresh token não fornecido'}), 400
        
        result = session_service.refresh_access_token(refresh_token)
        if not result:
            return jsonify({'error': 'Refresh token inválido ou expirado'}), 401
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"❌ Erro no refresh: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA PROTEGIDA ==========
@app.route('/api/auth/me', methods=['GET'])
@require_auth
def api_me():
    return jsonify({
        'user_id': request.user_id,
        'email': request.user_email,
        'session': {
            'user_id': request.session_data.get('user_id'),
            'email': request.session_data.get('email'),
            'expires_at': request.session_data.get('expires_at'),
            'is_active': request.session_data.get('is_active')
        }
    }), 200

# ========== ROTA DE VALIDAÇÃO ==========
@app.route('/api/auth/validate', methods=['GET'])
@require_auth
def api_validate():
    return jsonify({
        'valid': True,
        'user_id': request.user_id,
        'email': request.user_email,
        'expires_at': request.session_data.get('expires_at')
    }), 200

# ========== ROTA DE LOGOUT ==========
@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def api_logout():
    session_service.deactivate_session(request.user_id)
    return jsonify({'success': True, 'message': 'Logout realizado com sucesso'}), 200

# ========== ROTA START-GAME ==========
@app.route('/api/start-game-v2', methods=['GET'])
@require_auth
def api_start_game():
    try:
        slug = request.args.get('slug')
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        email = request.user_email
        session_data = request.session_data
        password = session_data.get('password_hash')
        
        if not email or not password:
            return jsonify({'error': 'Credenciais não disponíveis'}), 401
        
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={'slug': slug, 'platform': 'WEB', 'use_demo': 0},
            timeout=10
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
            'error': 'Não foi possível obter a URL do jogo'
        }), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== ROTA PÚBLICA ==========
@app.route('/api/public/info', methods=['GET'])
@optional_auth
def public_info():
    user_info = None
    if hasattr(request, 'user_id'):
        user_info = {
            'user_id': request.user_id,
            'email': request.user_email
        }
    
    return jsonify({
        'message': 'Esta é uma rota pública',
        'authenticated': user_info is not None,
        'user': user_info
    }), 200

# ========== LIMPEZA AUTOMÁTICA ==========
@app.before_request
def cleanup_expired_sessions():
    session_service.cleanup_expired()

# ========== ROTAS FRONTEND ==========
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    if path and os.path.exists(os.path.join('dist', path)):
        return send_from_directory('dist', path)
    return send_from_directory('dist', 'index.html')

# ========== INICIALIZAÇÃO ==========
if __name__ == '__main__':
    print("=" * 70)
    print("🎯 API PROXY - QA.AI")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("🗄️  Banco: PostgreSQL")
    print("🛡️  Auth: JWT + Refresh Token + Middleware")
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    session_service.cleanup_expired()
    app.run(host='0.0.0.0', port=5000, debug=False)
