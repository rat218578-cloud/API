from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import time
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

API_BASE = "https://sortenabet.bet.br"

# ========== ROTAS ==========

# Login - apenas encaminha a requisição com o captcha_token que o frontend gerou
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Body da requisição vazio'}), 400
        
        # Encaminha a requisição para a API da Sorte na Bet
        response = requests.post(
            f'{API_BASE}/api/auth/login',
            json=data,
            timeout=10
        )
        
        logger.info(f"📥 Login status: {response.status_code}")
        
        return jsonify(response.json()), response.status_code
    except Exception as e:
        logger.error(f"❌ Erro no login: {e}")
        return jsonify({'error': str(e)}), 500

# Start Game - usa o token JWT do header Authorization
@app.route('/api/start-game-v2', methods=['GET'])
def api_start_game():
    try:
        slug = request.args.get('slug')
        auth_header = request.headers.get('Authorization')
        
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        if not auth_header:
            return jsonify({'error': 'Token de autenticação necessário'}), 401
        
        # Encaminha a requisição com o token JWT
        headers = {
            'Authorization': auth_header,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        params = {
            'slug': slug,
            'platform': request.args.get('platform', 'WEB'),
            'use_demo': request.args.get('use_demo', 0),
            'source': request.args.get('source', 'watchIsAuthenticated')
        }
        
        response = requests.get(
            f'{API_BASE}/api/start-game-v2',
            params=params,
            headers=headers,
            timeout=10
        )
        
        logger.info(f"🎮 {slug} - Status: {response.status_code}")
        
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
        
        return jsonify(response.json()), response.status_code
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

# Roulette History - usa o token JWT
@app.route('/api/roulette/history', methods=['GET'])
def api_roulette_history():
    try:
        slug = request.args.get('slug', 'evolution/brasileira')
        limit = request.args.get('limit', 50)
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'Token necessário'}), 401
        
        headers = {'Authorization': auth_header}
        
        response = requests.get(
            f'{API_BASE}/api/roulette/history',
            params={'slug': slug, 'limit': limit},
            headers=headers,
            timeout=10
        )
        
        return jsonify(response.json()), response.status_code
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        # Dados simulados se falhar
        return jsonify({
            'spins': [
                {'number': n, 'color': 'red' if n % 2 == 0 else 'black', 
                 'timestamp': time.time(), 'roundId': f'sim_{i}'}
                for i, n in enumerate([10, 5, 22, 15, 8, 30, 12, 25, 3, 18])
            ],
            'total': 10,
            'room': slug
        })

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
    print("🎯 API PROXY - SORTE NA BET")
    print("=" * 70)
    print("🌐 Rodando em: http://localhost:5000")
    print("📡 Encaminhando para:", API_BASE)
    print("=" * 70)
    app.run(host='0.0.0.0', port=5000, debug=False)
