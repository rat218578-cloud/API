from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import json
import time
import logging
import os
import random
import re
from datetime import datetime

logging.basicConfig(level=logging.ERROR)

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

API_BASE = "https://sortenabet.bet.br"

# SESSÃO PRINCIPAL
session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})

# 🔥 ARMAZENA EVOSESSIONID POR ROLETA (IGUAL ANTIGO)
evo_cache = {}

def get_evo(slug):
    if slug in evo_cache:
        data = evo_cache[slug]
        # Expira em 10 minutos
        if time.time() - data['timestamp'] < 600:
            return data['evo_id']
    return None

def set_evo(slug, evo_id):
    evo_cache[slug] = {
        'evo_id': evo_id,
        'timestamp': time.time()
    }
    print(f"✅ EVO salvo para {slug}")

def clear_evo(slug):
    if slug in evo_cache:
        del evo_cache[slug]
        print(f"🗑️ EVO limpo para {slug}")

# ========== LOGIN ==========
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
        
        if response.status_code != 200:
            return jsonify({'error': 'Credenciais inválidas'}), 401
        
        result = response.json()
        access_token_externo = result.get('access_token')
        
        if not access_token_externo:
            return jsonify({'error': 'Token não retornado'}), 500
        
        session.headers.update({'Authorization': f'Bearer {access_token_externo}'})
        
        # 🔥 LIMPA CACHE AO LOGAR
        evo_cache.clear()
        
        return jsonify({
            'access_token': access_token_externo,
            'token_type': 'Bearer',
            'expires_in': 7 * 24 * 60 * 60,
            'user': {
                'id': result.get('user', {}).get('id', email),
                'name': result.get('user', {}).get('name', email.split('@')[0]),
                'email': email,
                'plan': 'pro'
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== VALIDAÇÃO ==========
@app.route('/api/auth/validate', methods=['GET'])
def api_validate():
    auth_header = request.headers.get('Authorization')
    if auth_header:
        return jsonify({'valid': True}), 200
    return jsonify({'valid': False}), 200

# ========== START-GAME (IGUAL ANTIGO) ==========
@app.route('/api/start-game-v2', methods=['GET'])
def api_start_game():
    try:
        slug = request.args.get('slug')
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        print(f"🎮 Gerando link para: {slug}")
        
        # 🔥 1. VERIFICA SE JÁ TEM EVO PARA ESTA ROLETA
        evo_id = get_evo(slug)
        if evo_id:
            print(f"⚡ EVO encontrado em cache para {slug}")
            
            # RECONSTRÓI A URL
            game_url = f'https://sortenabet.evo-games.com/entry?params=Y2FzaW5vX2lkPXNvcnRlbmFiZXRicjAwMDEKZ2FtZT1yb3VsZXR0ZQpzaWduYXR1cmU9SnJHbzVGdm1HNzItaTZKUUotNGlHUQp0YWJsZV9pZD03eDBiMXRnaDdhZ21mNmh2CkVWT1NFU1NJT05JRD0{evo_id}&embedded'
            
            return jsonify({
                'success': True,
                'slug': slug,
                'gameURL': game_url,
                'iframe_url': game_url
            }), 200
        
        # 🔥 2. SE NÃO TEM, GERA NOVO TOKEN PARA ESTA ROLETA
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
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            
            if game_url:
                # 🔥 EXTRAI EVOSESSIONID
                match = re.search(r'EVOSESSIONID=([^&]+)', game_url)
                if match:
                    evo_id = match.group(1)
                    set_evo(slug, evo_id)
                    print(f"✅ NOVO EVO gerado para {slug}")
                
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': game_url,
                    'iframe_url': game_url
                }), 200
        
        # 🔥 3. SE FALHOU (EV.12), LIMPA E TENTA NOVAMENTE
        if response.status_code == 401 or (response.text and 'EV.12' in response.text):
            print(f"⚠️ EV.12 para {slug}, gerando NOVO token...")
            
            # LIMPA O CACHE DESTA ROLETA
            clear_evo(slug)
            
            # REMOVE TOKEN EXTERNO
            session.headers.pop('Authorization', None)
            
            # TENTA NOVAMENTE
            response = session.get(
                f'{API_BASE}/api/start-game-v2',
                params={
                    'slug': slug,
                    'platform': 'WEB',
                    'use_demo': 0,
                    'source': 'watchIsAuthenticated'
                },
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                game_url = data.get('iframe_url') or data.get('gameURL')
                
                if game_url:
                    match = re.search(r'EVOSESSIONID=([^&]+)', game_url)
                    if match:
                        evo_id = match.group(1)
                        set_evo(slug, evo_id)
                    
                    return jsonify({
                        'success': True,
                        'slug': slug,
                        'gameURL': game_url,
                        'iframe_url': game_url
                    }), 200
        
        return jsonify({
            'success': False,
            'error': 'Não foi possível obter a URL do jogo'
        }), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== ROTA PARA LIMPAR CACHE ==========
@app.route('/api/roulette/clear-cache', methods=['POST'])
def clear_cache():
    data = request.json
    slug = data.get('slug')
    if slug:
        clear_evo(slug)
        return jsonify({'success': True}), 200
    return jsonify({'success': False}), 404

# ========== ROTA NÚMEROS ==========
@app.route('/api/roulette/live', methods=['GET'])
def get_live_numbers():
    try:
        limit = int(request.args.get('limit', 50))
        numeros = [random.randint(0, 36) for _ in range(limit)]
        
        freq = {}
        for n in numeros:
            freq[n] = freq.get(n, 0) + 1
        top_numbers = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:8]
        top_numbers_list = [{'number': n, 'count': c} for n, c in top_numbers]
        
        return jsonify({
            'success': True,
            'connected': True,
            'total': len(numeros),
            'last_numbers': numeros[:10],
            'history': [{'number': n, 'color': 'red' if n in [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] else 'black' if n != 0 else 'green', 'timestamp': datetime.now().isoformat()} for n in numeros[:50]],
            'top_numbers': top_numbers_list,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== FRONTEND ==========
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
    print("🎰 ROLETA - TOKEN ÚNICO POR ROLETA")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("🎯 Cada roleta tem seu próprio token")
    print("🔄 Cache: 10 minutos")
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
