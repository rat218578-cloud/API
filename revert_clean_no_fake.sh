#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔄 VOLTANDO - SEM WEBSOCKET E SEM NÚMEROS FALSOS"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. REMOVE WEBSOCKET_SERVICE.PY ==========
rm -f websocket_service.py
echo "✅ websocket_service.py removido!"

# ========== 2. CORRIGE API_SERVER.PY (SEM NÚMEROS FALSOS) ==========
cat > api_server.py << 'APIOEF'
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import logging
import os
from datetime import datetime

# ========== CRIA APP ==========
app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

# ========== IMPORTAÇÕES ==========
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

API_BASE = "https://sortenabet.bet.br"

session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})

# ========== HISTÓRICO DE NÚMEROS (VAZIO INICIALMENTE) ==========
historico_numeros = []

def get_cor(numero):
    """Retorna a cor do número"""
    red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
    if numero == 0:
        return "green"
    return "red" if numero in red else "black"

def adicionar_numero_ao_historico(numero):
    """Adiciona um número ao histórico"""
    global historico_numeros
    historico_numeros.append({
        'number': numero,
        'color': get_cor(numero),
        'timestamp': datetime.now().isoformat()
    })
    if len(historico_numeros) > 500:
        historico_numeros = historico_numeros[-500:]

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

# ========== ROTA PARA NÚMEROS ==========
@app.route('/api/roulette/live', methods=['GET'])
@require_auth
def get_live_numbers():
    """Retorna números da roleta (apenas o que foi adicionado via POST)"""
    try:
        limit = int(request.args.get('limit', 50))
        
        history = historico_numeros[-limit:] if historico_numeros else []
        last_numbers = [h['number'] for h in history[-10:]] if history else []
        
        return jsonify({
            'success': True,
            'connected': False,
            'total': len(historico_numeros),
            'last_numbers': last_numbers,
            'history': history,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA PARA ADICIONAR NÚMERO ==========
@app.route('/api/roulette/add', methods=['POST'])
def add_number():
    """Adiciona um número ao histórico"""
    try:
        data = request.json
        number = data.get('number')
        
        if number is None or number < 0 or number > 36:
            return jsonify({'error': 'Número inválido'}), 400
        
        adicionar_numero_ao_historico(number)
        
        return jsonify({
            'success': True,
            'number': number,
            'total': len(historico_numeros)
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA DE STATUS ==========
@app.route('/api/roulette/status', methods=['GET'])
@require_auth
def get_status():
    return jsonify({
        'total': len(historico_numeros),
        'last_numbers': [h['number'] for h in historico_numeros[-10:]] if historico_numeros else []
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
    print("🎯 API PROXY - QA.AI (REST MODE - SEM NÚMEROS FALSOS)")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("🗄️  Banco: NeonDB (PostgreSQL)")
    print("🛡️  Auth: JWT + Refresh Token")
    print("📊  Números: Vazios (aguardando POST /api/roulette/add)")
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    if db:
        try:
            session_service.cleanup_expired()
        except Exception as e:
            print(f"⚠️ Erro ao limpar sessões: {e}")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
APIOEF

echo "✅ api_server.py restaurado (sem WebSocket e sem números falsos)!"

# ========== 3. COMMIT ==========
git add api_server.py
git commit -m "revert: remove WebSocket e números falsos, apenas API REST vazia"
git push origin main

echo "═══════════════════════════════════════════════════════════════"
echo "✅ VERSÃO SEM WEBSOCKET E SEM NÚMEROS FALSOS!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📋 O QUE MUDOU:"
echo "   ✅ Sem WebSocket"
echo "   ✅ Sem números falsos (histórico vazio)"
echo "   ✅ Apenas API REST"
echo "   ✅ Números só aparecem via POST /api/roulette/add"
echo ""
echo "🚀 DEPOIS DO DEPLOY:"
echo "   O app vai mostrar números vazios até receber dados"
echo "═══════════════════════════════════════════════════════════════"

