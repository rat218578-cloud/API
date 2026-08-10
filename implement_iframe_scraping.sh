#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🎯 IMPLEMENTANDO SCRAPING DO IFRAME - NÚMEROS AO VIVO"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. INSTALA DEPENDÊNCIAS ==========
echo ""
echo "📦 Instalando dependências..."
pip install beautifulsoup4 lxml requests

# ========== 2. CRIA SCRAPING SERVICE ==========
cat > scraping_service.py << 'PYEOF'
import json
import logging
import time
import threading
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from collections import Counter
import re

logger = logging.getLogger(__name__)

class ScrapingService:
    def __init__(self):
        self.numeros = []
        self.ultimos_numeros = []
        self.total_numeros = 0
        self.running = False
        self.iframe_url = None
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
        })
        
    def set_iframe_url(self, url):
        """Define a URL do iframe para scraping"""
        self.iframe_url = url
        logger.info(f"🔗 URL do iframe definida: {url[:100]}...")
        
    def extrair_numeros_do_html(self, html):
        """Extrai números do HTML do iframe"""
        numeros = []
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # 1. data-role="number-X"
            for elem in soup.find_all(attrs={"data-role": True}):
                data_role = elem.get('data-role', '')
                if data_role.startswith('number-'):
                    num = data_role.replace('number-', '')
                    if num.isdigit():
                        numeros.append(int(num))
            
            # 2. spans com classe YLMNPL (números)
            for span in soup.find_all('span', class_='YLMNPL'):
                try:
                    num = int(span.text.strip())
                    if 0 <= num <= 36:
                        numeros.append(num)
                except:
                    pass
            
            # 3. Classe statisticsBranding_black/red/green
            for elem in soup.find_all(class_=re.compile(r'statisticsBranding')):
                try:
                    texto = elem.text.strip()
                    num = int(texto)
                    if 0 <= num <= 36:
                        numeros.append(num)
                except:
                    pass
            
            # 4. Regex no texto
            texto = soup.get_text()
            nums = re.findall(r'\b([0-9]|[1-2][0-9]|3[0-6])\b', texto)
            for num in nums:
                if num.isdigit():
                    numeros.append(int(num))
            
            # Remove duplicatas mantendo ordem
            numeros = list(dict.fromkeys(numeros))
            
            if numeros:
                logger.info(f"🔍 Extraídos {len(numeros)} números do HTML")
            
        except Exception as e:
            logger.error(f"❌ Erro ao extrair HTML: {e}")
        
        return numeros
    
    def processar_numeros(self, numeros):
        """Processa e atualiza os números"""
        if not numeros:
            return
        
        novos = 0
        for num in numeros:
            if num not in self.ultimos_numeros:
                self.ultimos_numeros.append(num)
                self.numeros.append(num)
                self.total_numeros += 1
                novos += 1
        
        # Mantém últimos 500
        if len(self.numeros) > 500:
            self.numeros = self.numeros[-500:]
        
        # Mantém últimos 10
        if len(self.ultimos_numeros) > 10:
            self.ultimos_numeros = self.ultimos_numeros[-10:]
        
        if novos > 0:
            logger.info(f"🎯 +{novos} novos números! Total: {self.total_numeros}")
    
    def fetch_and_process(self):
        """Busca o iframe e processa os números"""
        if not self.iframe_url:
            return
        
        try:
            response = self.session.get(self.iframe_url, timeout=10)
            if response.status_code == 200:
                numeros = self.extrair_numeros_do_html(response.text)
                if numeros:
                    self.processar_numeros(numeros)
                    return True
        except Exception as e:
            logger.error(f"❌ Erro: {e}")
        
        return False
    
    def start_scraping(self, interval=3):
        """Inicia o scraping contínuo"""
        self.running = True
        
        def scrape_loop():
            while self.running:
                self.fetch_and_process()
                time.sleep(interval)
        
        thread = threading.Thread(target=scrape_loop, daemon=True)
        thread.start()
        logger.info(f"✅ Scraping iniciado (intervalo: {interval}s)")
    
    def stop_scraping(self):
        """Para o scraping"""
        self.running = False
        logger.info("🔌 Scraping parado")
    
    def get_history(self, limit=500):
        """Retorna o histórico de números"""
        return self.numeros[-limit:] if self.numeros else []
    
    def get_last_numbers(self, count=10):
        """Retorna os últimos números"""
        return self.ultimos_numeros[-count:] if self.ultimos_numeros else []
    
    def get_statistics(self):
        """Retorna estatísticas"""
        if not self.numeros:
            return {}
        
        red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
        
        cores = {'red': 0, 'black': 0, 'green': 0}
        for num in self.numeros[-100:]:
            if num == 0:
                cores['green'] += 1
            elif num in red:
                cores['red'] += 1
            else:
                cores['black'] += 1
        
        freq = Counter(self.numeros[-100:])
        
        return {
            'total': len(self.numeros),
            'colors': cores,
            'most_frequent': freq.most_common(5),
            'last_numbers': self.get_last_numbers(10)
        }

# Instância global
scraping_service = ScrapingService()
PYEOF

echo "✅ scraping_service.py criado!"

# ========== 3. ATUALIZA API_SERVER.PY ==========
cat > api_server.py << 'APIOEF'
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import logging
import os
import re
from datetime import datetime

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

try:
    from db import db
except:
    db = None

from jwt_helper import jwt_manager
from session_service import session_service
from middleware import require_auth, optional_auth
from scraping_service import scraping_service

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
                # 🔥 INICIA SCRAPING DO IFRAME
                token = request.headers.get('Authorization', '').replace('Bearer ', '')
                
                # Extrai URL do iframe para scraping
                iframe_url = game_url
                scraping_service.set_iframe_url(iframe_url)
                scraping_service.start_scraping(interval=3)
                
                print(f"🔍 Scraping do iframe iniciado!")
                
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': game_url,
                    'iframe_url': game_url,
                    'scraping': True
                })
        
        return jsonify({'success': False, 'error': 'Não foi possível gerar o link'}), 404
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA PARA NÚMEROS REAIS ==========
@app.route('/api/roulette/live', methods=['GET'])
@require_auth
def get_live_numbers():
    try:
        limit = int(request.args.get('limit', 50))
        history = scraping_service.get_history(limit)
        last_numbers = scraping_service.get_last_numbers(10)
        stats = scraping_service.get_statistics()
        
        return jsonify({
            'success': True,
            'connected': scraping_service.running,
            'total': len(history),
            'last_numbers': last_numbers,
            'history': history,
            'statistics': stats,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== ROTA DE STATUS ==========
@app.route('/api/roulette/status', methods=['GET'])
@require_auth
def get_status():
    return jsonify({
        'scraping': scraping_service.running,
        'total_numbers': scraping_service.total_numeros,
        'last_numbers': scraping_service.get_last_numbers(5)
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
    scraping_service.stop_scraping()
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
        except:
            pass

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
    print("🎯 API PROXY - QA.AI (SCRAPING MODE)")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("🔍 Scraping: Ativado!")
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    if db:
        try:
            session_service.cleanup_expired()
        except:
            pass
    
    app.run(host='0.0.0.0', port=5000, debug=False)
APIOEF

echo "✅ api_server.py atualizado com scraping!"

# ========== 4. COMMIT ==========
git add scraping_service.py api_server.py
git commit -m "feat: implementa scraping do iframe para números ao vivo (sem WebSocket)"
git push origin main

echo "═══════════════════════════════════════════════════════════════"
echo "✅ SCRAPING IMPLEMENTADO!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🚀 COMO FUNCIONA:"
echo "   1. Usuário abre a roleta"
echo "   2. API pega a URL do iframe"
echo "   3. Scraping extrai números do HTML"
echo "   4. Atualiza em tempo real"
echo ""
echo "📋 VANTAGENS:"
echo "   ✅ SEM WebSocket!"
echo "   ✅ SEM EVOSESSIONID!"
echo "   ✅ Só lê o HTML do iframe!"
echo "   ✅ Muito mais estável!"
echo "═══════════════════════════════════════════════════════════════"

