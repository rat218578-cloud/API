from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import logging
import os
import random
from datetime import datetime

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

try:
    from db import db
except:
    db = None

from jwt_helper import jwt_manager
from session_service import session_service
from apigames_service import apigames

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_BASE = "https://sortenabet.bet.br"

session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
        
        logger.info(f"🔐 Tentando login para: {email}")
        
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
        
        # 🔥 INICIA API GAMES (NÚMEROS REAIS)
        logger.info(f"📧 Configurando API Games para: {email}")
        apigames.set_email(email)
        apigames.start_polling(interval=3)
        
        return jsonify({
            'access_token': jwt_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': 30 * 24 * 60 * 60,
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

# ========== ROTA START-GAME ==========
@app.route('/api/start-game-v2', methods=['GET'])
def api_start_game():
    try:
        slug = request.args.get('slug')
        logger.info(f"🎮 Gerando link para: {slug}")
        
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

# ========== ROTA PARA NÚMEROS REAIS ==========
@app.route('/api/roulette/live', methods=['GET'])
def get_live_numbers():
    """Retorna números REAIS da API Games"""
    try:
        limit = int(request.args.get('limit', 50))
        history = apigames.get_history(limit)
        last_numbers = apigames.get_last_numbers(10)
        stats = apigames.get_statistics()
        top = apigames.get_top_numbers(8)
        
        return jsonify({
            'success': True,
            'connected': apigames.running,
            'total': apigames.total_numeros,
            'last_numbers': [n['number'] for n in last_numbers],
            'history': history,
            'top_numbers': top,
            'statistics': stats,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA DE STATUS ==========
@app.route('/api/roulette/status', methods=['GET'])
def get_status():
    return jsonify({
        'polling': apigames.running,
        'total_numbers': apigames.total_numeros,
        'last_numbers': [n['number'] for n in apigames.get_last_numbers(5)]
    }), 200

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
            return jsonify({'error': 'Refresh token inválido'}), 401
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
def api_me():
    return jsonify({
        'user_id': request.user_id if hasattr(request, 'user_id') else None,
        'email': request.user_email if hasattr(request, 'user_email') else None
    }), 200

@app.route('/api/auth/validate', methods=['GET'])
def api_validate():
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'valid': False}), 401
        
        token = auth_header.replace('Bearer ', '')
        payload = jwt_manager.verify_token(token)
        
        if payload:
            return jsonify({'valid': True, 'user_id': payload.get('user_id')}), 200
        return jsonify({'valid': False}), 401
    except:
        return jsonify({'valid': False}), 401

@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    apigames.stop_polling()
    if db:
        try:
            auth_header = request.headers.get('Authorization')
            if auth_header:
                token = auth_header.replace('Bearer ', '')
                payload = jwt_manager.verify_token(token)
                if payload:
                    session_service.deactivate_session(payload.get('user_id'))
        except:
            pass
    return jsonify({'success': True}), 200

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
    print("🎯 API PROXY - QA.AI (API GAMES)")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("🗄️  Banco: NeonDB (PostgreSQL)")
    print("🛡️  Auth: JWT + Refresh Token")
    print("📊  Números: REAIS (API Games)")
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    if db:
        try:
            session_service.cleanup_expired()
        except:
            pass
    
    app.run(host='0.0.0.0', port=5000, debug=False)
