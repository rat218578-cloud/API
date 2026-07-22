from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import time
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ========== CONFIGURAÇÕES ==========
API_BASE = "https://sortenabet.bet.br"

# ========== SESSÃO ==========
session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
})

# ========== ROTAS ==========

# ===== LOGIN - PASSA O CAPTCHA_TOKEN QUE O FRONTEND ENVIA =====
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.json
        logger.info(f"📤 Login: {data.get('login') or data.get('email')}")
        
        # Envia exatamente o que o frontend enviou (já tem o captcha_token)
        response = session.post(f'{API_BASE}/api/auth/login', json=data, timeout=10)
        
        # Retorna a resposta da API
        result = response.json()
        logger.info(f"📥 Status: {response.status_code}")
        
        return jsonify(result), response.status_code
    except Exception as e:
        logger.error(f"❌ Erro no login: {e}")
        return jsonify({'error': str(e)}), 500

# ===== START-GAME - USA O TOKEN DO HEADER =====
@app.route('/api/start-game-v2', methods=['GET'])
def api_start_game():
    try:
        slug = request.args.get('slug')
        platform = request.args.get('platform', 'WEB')
        use_demo = request.args.get('use_demo', 0)
        source = request.args.get('source', 'watchIsAuthenticated')
        
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            logger.error("❌ Sem token de autenticação")
            return jsonify({'error': 'Token de autenticação necessário'}), 401
        
        logger.info(f"🎮 Iniciando jogo: {slug}")
        
        # Constrói a URL
        url = f'{API_BASE}/api/start-game-v2'
        params = {
            'slug': slug,
            'platform': platform,
            'use_demo': use_demo,
            'source': source
        }
        
        # Faz a requisição com o token do header
        headers = {
            'Authorization': auth_header,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        logger.info(f"📥 Status: {response.status_code}")
        
        # Retorna a resposta da API
        return jsonify(response.json()), response.status_code
        
    except Exception as e:
        logger.error(f"❌ Erro no start-game: {e}")
        return jsonify({'error': str(e)}), 500

# ===== ROULETTE HISTORY =====
@app.route('/api/roulette/history', methods=['GET'])
def api_roulette_history():
    try:
        slug = request.args.get('slug', 'evolution/brasileira')
        limit = request.args.get('limit', 50)
        
        auth_header = request.headers.get('Authorization')
        
        url = f'{API_BASE}/api/roulette/history'
        params = {'slug': slug, 'limit': limit}
        
        headers = {}
        if auth_header:
            headers['Authorization'] = auth_header
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        return jsonify(response.json()), response.status_code
        
    except Exception as e:
        logger.error(f"❌ Erro no history: {e}")
        # Dados simulados se falhar
        return jsonify({
            'spins': [
                {'number': n, 'color': 'red' if n % 2 == 0 else 'black', 
                 'timestamp': datetime.now().isoformat(), 'roundId': f'sim_{i}'}
                for i, n in enumerate([10, 5, 22, 15, 8, 30, 12, 25, 3, 18])
            ],
            'total': 10,
            'room': slug
        })

# ===== HEALTH =====
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'timestamp': time.time()})

if __name__ == '__main__':
    print("=" * 70)
    print("🎯 API SERVER - SORTE NA BET")
    print("=" * 70)
    print("🌐 Rodando em: http://localhost:5000")
    print("📡 API Base:", API_BASE)
    print("=" * 70)
    app.run(host='0.0.0.0', port=5000, debug=False)
