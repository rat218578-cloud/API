#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🎰 SISTEMA COMPLETO - NÚMEROS REAIS DA EVOLUTION"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. CRIA WEBSOCKET SERVICE ==========
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

logger = logging.getLogger(__name__)

class EvolutionWebSocketService:
    def __init__(self):
        self.ws = None
        self.connected = False
        self.session_id = None
        self.history = []  # Lista de números com detalhes
        self.last_numbers = []  # Últimos 10 números
        self.total_numbers = 0
        self.callbacks = []
        self.running = False
        self.thread = None
        self.api_base = "https://sortenabet.bet.br"
        self.access_token = None
        
    def set_access_token(self, token):
        """Define o token de acesso para salvar no banco"""
        self.access_token = token
        
    def set_session_id(self, session_id):
        """Define o EVOSESSIONID da Evolution"""
        self.session_id = session_id
        logger.info(f"🔑 Session ID definido: {session_id[:20]}...")
        
        # Tenta conectar automaticamente
        if session_id:
            self.connect()

    def get_websocket_url(self) -> str:
        """Monta a URL do WebSocket"""
        if not self.session_id:
            raise ValueError("EVOSESSIONID não definido!")
        
        # URL do WebSocket da Evolution
        return f"wss://sortenabet.evo-games.com/public/roulette/player/game/7x0b1tgh7agmf6hv/socket?messageFormat=json&EVOSESSIONID={self.session_id}&instance=i4ea0l-tztnmffxax4bftio-7x0b1tgh7agmf6hv&client_version=6.20260724.73611.63604-633bb6d1d6-r2"

    def extrair_numero(self, data):
        """Extrai número do JSON da Evolution"""
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
                    if key in ['number', 'result']:
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

    def get_cor(self, numero):
        red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
        if numero == 0:
            return "green"
        return "red" if numero in red else "black"

    def salvar_no_banco(self, numero):
        """Salva o número no banco via API"""
        if not self.access_token:
            return False
        
        try:
            response = requests.post(
                f'{self.api_base}/api/roulette/add',
                json={'number': numero},
                headers={'Authorization': f'Bearer {self.access_token}'},
                timeout=5
            )
            return response.status_code == 200
        except:
            return False

    def processar_numero(self, numero, raw_data):
        """Processa número recebido do WebSocket"""
        self.total_numbers += 1
        timestamp = datetime.now()
        cor = self.get_cor(numero)
        
        # Cria registro
        registro = {
            'number': numero,
            'color': cor,
            'timestamp': timestamp.isoformat(),
            'raw': raw_data
        }
        
        # Adiciona ao histórico
        self.history.append(registro)
        if len(self.history) > 500:
            self.history = self.history[-500:]
        
        # Atualiza últimos números
        self.last_numbers.insert(0, numero)
        if len(self.last_numbers) > 10:
            self.last_numbers = self.last_numbers[:10]
        
        # Salva no banco
        if self.salvar_no_banco(numero):
            logger.info(f"💾 Número {numero} salvo no banco")
        else:
            logger.warning(f"⚠️ Não foi possível salvar {numero} no banco")
        
        # Notifica callbacks (frontend)
        for callback in self.callbacks:
            try:
                callback(registro)
            except Exception as e:
                logger.error(f"❌ Erro no callback: {e}")
        
        # Log
        cor_emoji = "🔴" if cor == "red" else "⚫" if cor == "black" else "🟢"
        logger.info(f"🎯 NÚMERO REAL: {numero} {cor_emoji} - Total: {self.total_numbers}")
        
        return registro

    def on_message(self, ws, message):
        try:
            data = json.loads(message)
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
        
        # Tenta reconectar após 5 segundos
        if self.running:
            logger.info("🔄 Tentando reconectar em 5 segundos...")
            time.sleep(5)
            self.connect()

    def on_open(self, ws):
        self.connected = True
        logger.info("✅ WebSocket conectado com sucesso!")
        logger.info(f"📡 Aguardando números REAIS da Evolution...")

    def connect(self):
        """Conecta ao WebSocket"""
        if not self.session_id:
            logger.error("❌ EVOSESSIONID não definido!")
            return False
        
        url = self.get_websocket_url()
        logger.info(f"🔌 Conectando ao WebSocket...")
        
        try:
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
            time.sleep(2)
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao conectar: {e}")
            return False

    def disconnect(self):
        """Desconecta do WebSocket"""
        self.running = False
        if self.ws:
            self.ws.close()
        self.connected = False
        logger.info("🔌 Desconectado do WebSocket")

    def get_history(self, limit: int = 500) -> list:
        """Retorna o histórico de números"""
        return self.history[-limit:] if self.history else []

    def get_last_numbers(self, count: int = 10) -> list:
        """Retorna os últimos números"""
        return self.last_numbers[:count]

    def get_statistics(self) -> dict:
        """Retorna estatísticas"""
        if not self.history:
            return {}
        
        cores = Counter([n['color'] for n in self.history[-100:]])
        numeros = [n['number'] for n in self.history[-100:]]
        freq = Counter(numeros).most_common(5)
        
        return {
            'total': len(self.history),
            'colors': {
                'red': cores.get('red', 0),
                'black': cores.get('black', 0),
                'green': cores.get('green', 0)
            },
            'most_frequent': freq,
            'last_numbers': self.last_numbers[:10]
        }

    def add_callback(self, callback):
        """Adiciona callback para receber números em tempo real"""
        self.callbacks.append(callback)

    def remove_callback(self, callback):
        """Remove callback"""
        if callback in self.callbacks:
            self.callbacks.remove(callback)

# Instância global
evolution_ws = EvolutionWebSocketService()
WSEOF

echo "✅ websocket_service.py criado!"

# ========== 2. ATUALIZA API_SERVER.PY ==========
cat > api_server.py << 'APIOEF'
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import logging
import os
import json
from datetime import datetime

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

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

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
                import re
                match = re.search(r'EVOSESSIONID=([^&]+)', game_url)
                if match:
                    evo_session_id = match.group(1)
                    print(f"🔑 EVOSESSIONID extraído: {evo_session_id[:20]}...")
                    
                    # Conecta WebSocket automaticamente
                    evolution_ws.set_access_token(request.headers.get('Authorization', '').replace('Bearer ', ''))
                    evolution_ws.set_session_id(evo_session_id)
                
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': game_url,
                    'iframe_url': game_url,
                    'evo_session_id': evo_session_id if 'evo_session_id' in locals() else None
                })
        
        return jsonify({'success': False, 'error': 'Não foi possível gerar o link'}), 404
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA PARA NÚMEROS REAIS ==========
@app.route('/api/roulette/live', methods=['GET'])
@require_auth
def get_live_numbers():
    """Retorna números REAIS do WebSocket"""
    try:
        limit = int(request.args.get('limit', 50))
        history = evolution_ws.get_history(limit)
        last_numbers = evolution_ws.get_last_numbers(10)
        stats = evolution_ws.get_statistics()
        
        return jsonify({
            'success': True,
            'connected': evolution_ws.connected,
            'total': len(history),
            'last_numbers': last_numbers,
            'history': history,
            'statistics': stats,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA PARA ADICIONAR NÚMERO ==========
@app.route('/api/roulette/add', methods=['POST'])
def add_number():
    """Adiciona um número ao histórico (via WebSocket)"""
    try:
        data = request.json
        number = data.get('number')
        
        if number is None or number < 0 or number > 36:
            return jsonify({'error': 'Número inválido'}), 400
        
        # Processa via WebSocket service
        cor = "red" if number in [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] else "black" if number != 0 else "green"
        
        registro = {
            'number': number,
            'color': cor,
            'timestamp': datetime.now().isoformat()
        }
        
        # Adiciona ao histórico do WebSocket service
        evolution_ws.history.append(registro)
        if len(evolution_ws.history) > 500:
            evolution_ws.history = evolution_ws.history[-500:]
        
        evolution_ws.last_numbers.insert(0, number)
        if len(evolution_ws.last_numbers) > 10:
            evolution_ws.last_numbers = evolution_ws.last_numbers[:10]
        
        print(f"🎯 Número adicionado via API: {number}")
        
        return jsonify({
            'success': True,
            'number': number,
            'total': len(evolution_ws.history)
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA DE STATUS ==========
@app.route('/api/roulette/status', methods=['GET'])
@require_auth
def get_ws_status():
    """Retorna status do WebSocket"""
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
    print("📊  Números REAIS em tempo real")
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

# ========== 3. ADICIONA AO GIT ==========
git add websocket_service.py api_server.py

# ========== 4. COMMIT ==========
git commit -m "feat: sistema completo de números reais via WebSocket

- Conecta WebSocket automaticamente ao abrir roleta
- Extrai números REAIS dos JSONs da Evolution
- Salva no banco de dados
- Atualiza Catálogo, Grupos e Assertividade em tempo real
- Mantém histórico de 500 números"

# ========== 5. PUSH ==========
git push origin main

echo "═══════════════════════════════════════════════════════════════"
echo "✅ SISTEMA COMPLETO ENVIADO!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🚀 COMO VAI FUNCIONAR:"
echo ""
echo "   1. Usuário faz login"
echo "   2. Abre a roleta"
echo "   3. WebSocket conecta AUTOMATICAMENTE"
echo "   4. Números REAIS chegam em tempo real"
echo "   5. Catálogo, Grupos e Assertividade atualizam"
echo "   6. Histórico de 500 números mantido"
echo ""
echo "📋 DEPOIS DO DEPLOY:"
echo "   1. Faça login no app"
echo "   2. Abra uma roleta (Imersiva/Lightning/Brasileira)"
echo "   3. Veja os números REAIS aparecendo!"
echo "   4. O WebSocket conecta sozinho!"
echo "═══════════════════════════════════════════════════════════════"

