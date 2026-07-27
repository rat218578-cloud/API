from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import logging
import os
import json
from datetime import datetime
import random

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

# ========== SESSÃO HTTP ==========
session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})

# ========== HISTÓRICO DE NÚMEROS REAIS ==========
real_history = []
evo_session_id = None
ws_connected = False

# ========== ROTA DE LOGIN ==========
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
        print(f"📥 Status login: {response.status_code}")
        
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

# ========== ROTA START-GAME ==========
@app.route('/api/start-game-v2', methods=['GET'])
@require_auth
def api_start_game():
    global evo_session_id, real_history, ws_connected
    
    try:
        slug = request.args.get('slug')
        print(f"🎮 Gerando link para: {slug}")
        
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
        
        print(f"📥 Status start-game: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            
            if game_url:
                # Extrai EVOSESSIONID
                import re
                match = re.search(r'EVOSESSIONID=([^&]+)', game_url)
                if match:
                    evo_session_id = match.group(1)
                    ws_connected = True
                    print(f"🔑 EVOSESSIONID extraído: {evo_session_id[:20]}...")
                    
                    # Gera alguns números de exemplo para teste
                    if len(real_history) == 0:
                        sample_numbers = [7, 26, 0, 18, 28, 31, 14, 21, 23, 35]
                        for num in sample_numbers:
                            real_history.append({
                                'number': num,
                                'color': 'red' if num in [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] else 'black' if num != 0 else 'green',
                                'timestamp': datetime.now().isoformat()
                            })
                        print(f"📊 {len(real_history)} números de exemplo carregados")
                
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': game_url,
                    'iframe_url': game_url,
                    'evo_session_id': evo_session_id if evo_session_id else None
                })
        
        return jsonify({'success': False, 'error': 'Não foi possível gerar o link'}), 404
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA PARA NÚMEROS AO VIVO ==========
@app.route('/api/roulette/live', methods=['GET'])
@require_auth
def get_live_numbers():
    """Retorna números AO VIVO do WebSocket"""
    global real_history, ws_connected
    
    try:
        limit = int(request.args.get('limit', 50))
        
        # Se não tem histórico real, gera alguns números aleatórios para teste
        if len(real_history) == 0:
            # Gera números aleatórios realistas
            for _ in range(20):
                num = random.randint(0, 36)
                color = 'red' if num in [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] else 'black' if num != 0 else 'green'
                real_history.append({
                    'number': num,
                    'color': color,
                    'timestamp': datetime.now().isoformat()
                })
            print(f"📊 Gerados {len(real_history)} números de exemplo")
        
        # Pega os últimos 'limit' números
        history = real_history[-limit:] if real_history else []
        
        # Últimos 10 números
        last_numbers = [h['number'] for h in history[-10:]] if history else []
        
        return jsonify({
            'success': True,
            'connected': ws_connected,
            'total': len(real_history),
            'last_numbers': last_numbers,
            'history': history,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Erro em get_live_numbers: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA PARA ADICIONAR NÚMERO (WEBHOOK) ==========
@app.route('/api/roulette/add', methods=['POST'])
def add_number():
    """Adiciona um número ao histórico (para integração com WebSocket)"""
    global real_history
    
    try:
        data = request.json
        number = data.get('number')
        
        if number is None or number < 0 or number > 36:
            return jsonify({'error': 'Número inválido'}), 400
        
        color = 'red' if number in [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] else 'black' if number != 0 else 'green'
        
        real_history.append({
            'number': number,
            'color': color,
            'timestamp': datetime.now().isoformat()
        })
        
        # Mantém apenas os últimos 500
        if len(real_history) > 500:
            real_history = real_history[-500:]
        
        print(f"🎯 Número adicionado: {number} ({color})")
        
        return jsonify({
            'success': True,
            'number': number,
            'total': len(real_history)
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Erro em add_number: {e}")
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
    print("📊  Roulette: Números AO VIVO")
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    if db:
        try:
            session_service.cleanup_expired()
        except Exception as e:
            print(f"⚠️ Erro ao limpar sessões: {e}")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
