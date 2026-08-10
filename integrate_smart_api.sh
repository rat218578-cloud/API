#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🎯 INTEGRANDO API SMART ANALISE - NÚMEROS AO VIVO"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. CRIA SERVICO PARA API SMART ==========
cat > smart_api_service.py << 'PYEOF'
import requests
import logging
import time
from datetime import datetime, timedelta
from collections import Counter
import threading

logger = logging.getLogger(__name__)

class SmartApiService:
    def __init__(self):
        self.base_url = "https://tool-api.smartanalise.com.br/api"
        self.numeros = []
        self.ultimos_numeros = []
        self.total_numeros = 0
        self.last_signal_id = None
        self.running = False
        self.email = None
        self.source = "immersivevip"
        
    def set_email(self, email):
        """Define o email do usuário"""
        self.email = email
        logger.info(f"📧 Email definido: {email}")
        
    def fetch_numbers(self, since: str = None):
        """Busca números da API Smart Analise"""
        if not self.email:
            logger.warning("⚠️ Email não definido!")
            return []
        
        try:
            params = {
                "source": self.source,
                "userEmail": self.email
            }
            
            if since:
                params["since"] = since
            
            response = requests.get(
                f"{self.base_url}/history-delta",
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                numeros = []
                
                for item in data.get("data", []):
                    signal = item.get("signal")
                    if signal and signal.isdigit():
                        numero = int(signal)
                        if 0 <= numero <= 36:
                            numeros.append({
                                'number': numero,
                                'gameId': item.get('gameId'),
                                'signalId': item.get('signalId'),
                                'timestamp': item.get('timestamp')
                            })
                
                if numeros:
                    # Atualiza último signalId
                    if numeros:
                        self.last_signal_id = numeros[0].get('signalId')
                    
                    # Processa números
                    self.processar_numeros(numeros)
                
                return numeros
            else:
                logger.warning(f"⚠️ Status: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"❌ Erro ao buscar números: {e}")
            return []
    
    def processar_numeros(self, novos_numeros):
        """Processa e atualiza a lista de números"""
        for item in novos_numeros:
            numero = item['number']
            
            # Verifica se já existe no histórico
            if numero not in [n['number'] for n in self.ultimos_numeros]:
                self.ultimos_numeros.append(item)
                self.numeros.append(item)
                self.total_numeros += 1
        
        # Mantém últimos 500
        if len(self.numeros) > 500:
            self.numeros = self.numeros[-500:]
        if len(self.ultimos_numeros) > 10:
            self.ultimos_numeros = self.ultimos_numeros[-10:]
    
    def start_polling(self, interval=3):
        """Inicia polling contínuo"""
        self.running = True
        
        # Primeira carga
        self.fetch_numbers()
        
        def poll_loop():
            while self.running:
                try:
                    # Busca novos números desde o último signalId
                    since = self.last_signal_id
                    if since:
                        self.fetch_numbers(since=since)
                    else:
                        self.fetch_numbers()
                    time.sleep(interval)
                except Exception as e:
                    logger.error(f"❌ Erro no polling: {e}")
                    time.sleep(interval)
        
        thread = threading.Thread(target=poll_loop, daemon=True)
        thread.start()
        logger.info(f"✅ Polling iniciado (intervalo: {interval}s)")
    
    def stop_polling(self):
        """Para o polling"""
        self.running = False
        logger.info("🔌 Polling parado")
    
    def get_history(self, limit=500):
        """Retorna histórico de números"""
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
        nums = [n['number'] for n in self.numeros[-100:]]
        
        for num in nums:
            if num == 0:
                cores['green'] += 1
            elif num in red:
                cores['red'] += 1
            else:
                cores['black'] += 1
        
        freq = Counter(nums).most_common(5)
        
        return {
            'total': len(self.numeros),
            'colors': cores,
            'most_frequent': freq,
            'last_numbers': [n['number'] for n in self.get_last_numbers(10)]
        }

# Instância global
smart_api = SmartApiService()
PYEOF

echo "✅ smart_api_service.py criado!"

# ========== 2. CRIA SCRIPT DE TESTE ==========
cat > test_smart_api.py << 'PYEOF'
#!/usr/bin/env python3
"""
🧪 TESTE DA API SMART ANALISE
"""

import time
import json
from smart_api_service import smart_api

print("=" * 80)
print("🧪 TESTE API SMART ANALISE")
print("=" * 80)

# Email do usuário
email = input("\n📧 Digite seu email: ").strip()

if not email:
    print("❌ Email não pode ficar vazio!")
    exit(1)

# Configurar
smart_api.set_email(email)

print(f"\n🔍 Buscando números para {email}...")

# Buscar números
numeros = smart_api.fetch_numbers()

if numeros:
    print(f"\n✅ Encontrados {len(numeros)} números!")
    
    print("\n📊 ÚLTIMOS NÚMEROS:")
    for i, item in enumerate(numeros[:10], 1):
        print(f"   {i}. {item['number']} - {item['timestamp']}")
    
    # Estatísticas
    stats = smart_api.get_statistics()
    print(f"\n📈 ESTATÍSTICAS:")
    print(f"   Total: {stats.get('total', 0)}")
    print(f"   🔴 Vermelho: {stats.get('colors', {}).get('red', 0)}")
    print(f"   ⚫ Preto: {stats.get('colors', {}).get('black', 0)}")
    print(f"   🟢 Verde: {stats.get('colors', {}).get('green', 0)}")
    
    if stats.get('most_frequent'):
        print(f"\n   🔥 Mais frequentes:")
        for num, count in stats['most_frequent']:
            print(f"      {num}: {count}x")
    
    print(f"\n📋 Últimos 10 números:")
    print(f"   {stats.get('last_numbers', [])}")
    
else:
    print("❌ Nenhum número encontrado!")
    print("\n💡 Dicas:")
    print("   1. Verifique se o email está correto")
    print("   2. Aguarde alguns minutos e tente novamente")
    print("   3. A API pode estar temporariamente indisponível")

print("\n" + "=" * 80)
PYEOF

echo "✅ test_smart_api.py criado!"

# ========== 3. ATUALIZA API_SERVER.PY ==========
cat > api_server.py << 'APIOEF'
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import logging
import os
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
from smart_api_service import smart_api

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
        
        # Inicia polling da Smart API
        smart_api.set_email(email)
        smart_api.start_polling(interval=3)
        
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
    """Retorna números da Smart API"""
    try:
        limit = int(request.args.get('limit', 50))
        history = smart_api.get_history(limit)
        last_numbers = smart_api.get_last_numbers(10)
        stats = smart_api.get_statistics()
        
        return jsonify({
            'success': True,
            'connected': smart_api.running,
            'total': len(history),
            'last_numbers': [n['number'] for n in last_numbers],
            'history': history,
            'statistics': stats,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA DE STATUS ==========
@app.route('/api/roulette/status', methods=['GET'])
@require_auth
def get_status():
    return jsonify({
        'polling': smart_api.running,
        'total_numbers': smart_api.total_numeros,
        'last_numbers': [n['number'] for n in smart_api.get_last_numbers(5)]
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
    smart_api.stop_polling()
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
    print("🎯 API PROXY - QA.AI (SMART API)")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("📊 Smart API: Ativada!")
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    if db:
        try:
            session_service.cleanup_expired()
        except:
            pass
    
    app.run(host='0.0.0.0', port=5000, debug=False)
APIOEF

echo "✅ api_server.py atualizado!"

# ========== 4. COMMIT ==========
git add smart_api_service.py test_smart_api.py api_server.py
git commit -m "feat: integra Smart API para números ao vivo da roleta Imersiva"
git push origin main

echo "═══════════════════════════════════════════════════════════════"
echo "✅ SMART API INTEGRADA!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🚀 TESTE A API:"
echo "   python3 test_smart_api.py"
echo ""
echo "📋 O QUE FOI ADICIONADO:"
echo "   ✅ Smart API Service"
echo "   ✅ Polling automático"
echo "   ✅ Números ao vivo da roleta Imersiva"
echo "   ✅ Estatísticas em tempo real"
echo "   ✅ Histórico de 500 números"
echo ""
echo "🔧 A API usa:"
echo "   https://tool-api.smartanalise.com.br/api/history-delta"
echo "   source=immersivevip"
echo "   userEmail={email}"
echo "═══════════════════════════════════════════════════════════════"

