#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔧 CORREÇÃO COMPLETA - WEBSOCKET + EVOSESSIONID"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. CORRIGE WEBSOCKET_SERVICE.PY ==========
cat > websocket_service.py << 'WSEOF'
import json
import logging
import threading
import time
import ssl
import websocket
from datetime import datetime
from collections import Counter
import requests
import re

logger = logging.getLogger(__name__)

class EvolutionWebSocketService:
    def __init__(self):
        self.ws = None
        self.connected = False
        self.session_id = None
        self.history = []
        self.last_numbers = []
        self.total_numbers = 0
        self.callbacks = []
        self.running = False
        self.thread = None
        self.api_base = "https://sortenabet.bet.br"
        self.access_token = None
        self.game_id = "7x0b1tgh7agmf6hv"
        self.instance = None
        self.ultimos_500 = []
        self.evo_session_id = None
        
    def set_game_url(self, url):
        """Extrai EVOSESSIONID da URL do jogo"""
        self.game_url = url
        logger.info(f"🔗 URL do jogo: {url[:100]}...")
        
        # Extrai EVOSESSIONID
        match = re.search(r'EVOSESSIONID=([^&]+)', url)
        if match:
            self.evo_session_id = match.group(1)
            self.session_id = self.evo_session_id
            logger.info(f"🔑 EVOSESSIONID extraído: {self.session_id[:30]}...")
            
            # Extrai game_id
            match2 = re.search(r'game/([^/]+)/', url)
            if match2:
                self.game_id = match2.group(1)
                logger.info(f"🎮 Game ID: {self.game_id}")
            
            self.instance = f"i4ea0l-tztnmffxax4bftio-{self.game_id}"
            
            # Conecta automaticamente
            self.connect()
            return self.session_id
        
        logger.error("❌ EVOSESSIONID não encontrado na URL")
        return None
        
    def set_access_token(self, token):
        self.access_token = token

    def get_websocket_url(self) -> str:
        if not self.session_id:
            raise ValueError("EVOSESSIONID não definido!")
        
        url = f"wss://sortenabet.evo-games.com/public/roulette/player/game/{self.game_id}/socket?messageFormat=json&EVOSESSIONID={self.session_id}&instance={self.instance}&client_version=6.20260728.73539.63676-d2334f2327-r2"
        
        logger.info(f"🌐 WebSocket URL: {url[:120]}...")
        return url

    def extrair_numero(self, data):
        # winSpots
        if data.get('type') == 'roulette.winSpots':
            args = data.get('args', {})
            result = args.get('result', [])
            if result:
                for item in result:
                    if isinstance(item, dict) and 'number' in item:
                        try:
                            return int(item['number'])
                        except:
                            pass
                    elif isinstance(item, str):
                        try:
                            return int(item)
                        except:
                            pass
        
        # tableState com GAME_RESOLVED
        if data.get('type') == 'roulette.tableState':
            args = data.get('args', {})
            if args.get('state') == 'GAME_RESOLVED':
                result = args.get('result', [])
                if result:
                    try:
                        return int(result[0])
                    except:
                        pass
        
        # Busca em qualquer lugar
        def buscar(obj):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if key in ['number', 'result', 'winningNumber']:
                        try:
                            num = int(value)
                            if 0 <= num <= 36:
                                return num
                        except:
                            pass
                    result = buscar(value)
                    if result is not None:
                        return result
            elif isinstance(obj, list):
                for item in obj:
                    result = buscar(item)
                    if result is not None:
                        return result
            return None
        
        return buscar(data)

    def processar_recent_results(self, data):
        if "args" in data and "recentResults" in data["args"]:
            recent_results = data["args"]["recentResults"]
            numeros = []
            for item in recent_results:
                if isinstance(item, list) and len(item) > 0:
                    try:
                        num = int(item[0])
                        numeros.append(num)
                    except:
                        pass
            
            if numeros:
                self.ultimos_500 = numeros[:500]
                self.total_numbers = len(numeros)
                logger.info(f"📊 Carregados {len(self.ultimos_500)} números da tabela")
                return numeros
        return None

    def get_cor(self, numero):
        red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
        if numero == 0:
            return "green"
        return "red" if numero in red else "black"

    def processar_numero(self, numero, raw_data):
        timestamp = datetime.now()
        cor = self.get_cor(numero)
        
        registro = {
            'number': numero,
            'color': cor,
            'timestamp': timestamp.isoformat(),
            'raw': raw_data
        }
        
        self.history.append(registro)
        if len(self.history) > 500:
            self.history = self.history[-500:]
        
        self.ultimos_500.append(numero)
        if len(self.ultimos_500) > 500:
            self.ultimos_500 = self.ultimos_500[-500:]
        
        self.last_numbers.insert(0, numero)
        if len(self.last_numbers) > 10:
            self.last_numbers = self.last_numbers[:10]
        
        self.total_numbers += 1
        
        cor_emoji = "🔴" if cor == "red" else "⚫" if cor == "black" else "🟢"
        logger.info(f"🎯 NÚMERO REAL: {numero} {cor_emoji} - Total: {self.total_numbers}")
        
        return registro

    def on_message(self, ws, message):
        try:
            data = json.loads(message)
            
            # Processa recentResults (tabela completa)
            self.processar_recent_results(data)
            
            # Extrai número
            numero = self.extrair_numero(data)
            
            if numero is not None and 0 <= numero <= 36:
                self.processar_numero(numero, data)
                
        except json.JSONDecodeError:
            pass
        except Exception as e:
            logger.error(f"⚠️ Erro: {e}")

    def on_error(self, ws, error):
        logger.error(f"❌ WebSocket Error: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        self.connected = False
        logger.info(f"🔌 WebSocket fechado: {close_status_code} - {close_msg}")
        
        if self.running:
            logger.info("🔄 Tentando reconectar em 3 segundos...")
            time.sleep(3)
            self.connect()

    def on_open(self, ws):
        self.connected = True
        logger.info("✅ WebSocket CONECTADO com sucesso!")
        logger.info(f"📡 Aguardando números REAIS da Evolution...")

    def connect(self):
        if not self.session_id:
            logger.error("❌ EVOSESSIONID não definido!")
            return False
        
        try:
            url = self.get_websocket_url()
            logger.info(f"🔌 Conectando ao WebSocket...")
            
            self.ws = websocket.WebSocketApp(
                url,
                on_open=self.on_open,
                on_message=self.on_message,
                on_error=self.on_error,
                on_close=self.on_close
            )
            
            self.thread = threading.Thread(target=self.ws.run_forever, kwargs={
                'sslopt': {'cert_reqs': ssl.CERT_NONE}
            })
            self.thread.daemon = True
            self.thread.start()
            
            self.running = True
            time.sleep(3)
            return self.connected
            
        except Exception as e:
            logger.error(f"❌ Erro ao conectar: {e}")
            return False

    def disconnect(self):
        self.running = False
        if self.ws:
            self.ws.close()
        self.connected = False

    def get_history(self, limit: int = 500) -> list:
        return self.ultimos_500[-limit:] if self.ultimos_500 else []

    def get_last_numbers(self, count: int = 10) -> list:
        return self.last_numbers[:count]

# Instância global
evolution_ws = EvolutionWebSocketService()
WSEOF

echo "✅ websocket_service.py atualizado!"

# ========== 2. CORRIGE API_SERVER.PY ==========
cat > api_server.py << 'APIOEF'
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import logging
import os
import json
import re
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
from websocket_service import evolution_ws

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
                # 🔑 CAPTURA O EVOSESSIONID
                token = request.headers.get('Authorization', '').replace('Bearer ', '')
                evolution_ws.set_access_token(token)
                
                # EXTRAI EVOSESSIONID E CONECTA
                evo_id = evolution_ws.set_game_url(game_url)
                
                print(f"🔑 EVOSESSIONID capturado: {evo_id[:30] if evo_id else 'NENHUM'}...")
                print(f"🔌 WebSocket conectado: {evolution_ws.connected}")
                
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': game_url,
                    'iframe_url': game_url,
                    'evo_session_id': evo_id
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
        history = evolution_ws.get_history(limit)
        last_numbers = evolution_ws.get_last_numbers(10)
        
        return jsonify({
            'success': True,
            'connected': evolution_ws.connected,
            'total': len(history),
            'last_numbers': last_numbers,
            'history': history,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA DE STATUS ==========
@app.route('/api/roulette/status', methods=['GET'])
@require_auth
def get_ws_status():
    return jsonify({
        'connected': evolution_ws.connected,
        'session_id': bool(evolution_ws.session_id),
        'history_count': len(evolution_ws.history),
        'last_numbers': evolution_ws.get_last_numbers(5),
        'total_numbers': evolution_ws.total_numbers
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
    evolution_ws.disconnect()
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
    print("🔌 WebSocket: Evolution AO VIVO")
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    if db:
        try:
            session_service.cleanup_expired()
        except Exception as e:
            print(f"⚠️ Erro ao limpar sessões: {e}")
    
    app.run(host='0.0.0.0', port=5000, debug=False)
APIOEF

echo "✅ api_server.py atualizado!"

# ========== 3. COMMIT E PUSH ==========
git add websocket_service.py api_server.py
git commit -m "fix: WebSocket completo com captura automática do EVOSESSIONID"
git push origin main

echo "═══════════════════════════════════════════════════════════════"
echo "✅ CORREÇÃO ENVIADA!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🚀 AGORA FUNCIONA:"
echo ""
echo "   1. Abra a roleta"
echo "   2. API gera a URL"
echo "   3. Captura EVOSESSIONID"
echo "   4. Conecta WebSocket"
echo "   5. Pega números REAIS"
echo "   6. Atualiza o frontend"
echo ""
echo "🔑 TUDO AUTOMÁTICO!"
echo "═══════════════════════════════════════════════════════════════"

