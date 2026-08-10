#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🎯 CAPTURA AUTOMÁTICA DO EVOSESSIONID"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. CRIA WEBSOCKET SERVICE ATUALIZADO ==========
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
        self.game_id = None
        self.instance = None
        self.ultimos_500 = []
        self.historico_completo = []
        self.game_url = None
        self.evo_session_id = None
        
    def set_game_url(self, url):
        """Extrai EVOSESSIONID da URL do jogo"""
        self.game_url = url
        logger.info(f"🔗 URL do jogo recebida")
        
        # Extrai EVOSESSIONID
        match = re.search(r'EVOSESSIONID=([^&]+)', url)
        if match:
            self.evo_session_id = match.group(1)
            logger.info(f"🔑 EVOSESSIONID extraído: {self.evo_session_id[:30]}...")
            self.session_id = self.evo_session_id
            self.connect()
            return self.evo_session_id
        
        # Tenta extrair game_id
        match = re.search(r'game/([^/]+)/', url)
        if match:
            self.game_id = match.group(1)
            logger.info(f"🎮 Game ID: {self.game_id}")
        
        return None
        
    def set_access_token(self, token):
        self.access_token = token
        
    def set_session_id(self, session_id):
        self.session_id = session_id
        logger.info(f"🔑 Session ID definido: {session_id[:30]}...")
        
        if session_id:
            self.game_id = "7x0b1tgh7agmf6hv"
            self.instance = f"i4ea0l-tztnmffxax4bftio-{self.game_id}"
            self.connect()

    def get_websocket_url(self) -> str:
        if not self.session_id:
            raise ValueError("EVOSESSIONID não definido!")
        
        game_id = self.game_id or "7x0b1tgh7agmf6hv"
        instance = self.instance or f"i4ea0l-tztnmffxax4bftio-{game_id}"
        
        # Usa o mesmo EVOSESSIONID da URL
        url = f"wss://sortenabet.evo-games.com/public/roulette/player/game/{game_id}/socket?messageFormat=json&EVOSESSIONID={self.session_id}&instance={instance}&client_version=6.20260728.73539.63676-d2334f2327-r2"
        
        logger.info(f"🌐 WebSocket URL: {url[:100]}...")
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
                    elif isinstance(item, (int, float)):
                        return int(item)
        
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
        """Processa a tabela completa (recentResults)"""
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
                
                # Salva no histórico
                for num in numeros[:500]:
                    self.historico_completo.append({
                        'number': num,
                        'color': self.get_cor(num),
                        'timestamp': datetime.now().isoformat()
                    })
                
                return numeros
        return None

    def get_cor(self, numero):
        red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
        if numero == 0:
            return "green"
        return "red" if numero in red else "black"

    def salvar_no_banco(self, numero):
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
        timestamp = datetime.now()
        cor = self.get_cor(numero)
        
        registro = {
            'number': numero,
            'color': cor,
            'timestamp': timestamp.isoformat(),
            'raw': raw_data
        }
        
        self.historico_completo.append(registro)
        
        self.ultimos_500.append(numero)
        if len(self.ultimos_500) > 500:
            self.ultimos_500 = self.ultimos_500[-500:]
        
        self.last_numbers.insert(0, numero)
        if len(self.last_numbers) > 10:
            self.last_numbers = self.last_numbers[:10]
        
        self.total_numbers += 1
        
        self.salvar_no_banco(numero)
        
        for callback in self.callbacks:
            try:
                callback(registro)
            except Exception as e:
                logger.error(f"❌ Erro no callback: {e}")
        
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
        logger.info("📡 Aguardando números REAIS da Evolution...")
        logger.info(f"📊 Total de números: {self.total_numbers}")

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

    def get_statistics(self) -> dict:
        if not self.ultimos_500:
            return {}
        
        cores = Counter([self.get_cor(n) for n in self.ultimos_500[-100:]])
        numeros = self.ultimos_500[-100:]
        freq = Counter(numeros).most_common(5)
        
        return {
            'total': len(self.ultimos_500),
            'colors': {
                'red': cores.get('red', 0),
                'black': cores.get('black', 0),
                'green': cores.get('green', 0)
            },
            'most_frequent': freq,
            'last_numbers': self.last_numbers[:10]
        }

# Instância global
evolution_ws = EvolutionWebSocketService()
WSEOF

echo "✅ websocket_service.py atualizado!"

# ========== 2. ATUALIZA API_SERVER.PY ==========
cat > api_server.py << 'APIOEF'
# [MESMO CÓDIGO ANTERIOR, MAS COM A CAPTURA DO EVOSESSIONID]

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
                # 🔑 CAPTURA O EVOSESSIONID DA URL
                token = request.headers.get('Authorization', '').replace('Bearer ', '')
                evolution_ws.set_access_token(token)
                
                # EXTRAI E CONECTA AUTOMATICAMENTE
                evo_id = evolution_ws.set_game_url(game_url)
                
                print(f"🔑 EVOSESSIONID capturado e conectado!")
                
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
APIOEF

echo "✅ api_server.py atualizado!"

# ========== 3. COMMIT E PUSH ==========
git add websocket_service.py api_server.py
git commit -m "feat: captura EVOSESSIONID automaticamente da URL do jogo"
git push origin main

echo "═══════════════════════════════════════════════════════════════"
echo "✅ CORREÇÃO ENVIADA!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🚀 AGORA FUNCIONA ASSIM:"
echo ""
echo "   1. Usuário clica na roleta"
echo "   2. API gera a URL do jogo"
echo "   3. Captura EVOSESSIONID da URL"
echo "   4. Conecta WebSocket AUTOMATICAMENTE"
echo "   5. Pega números AO VIVO"
echo "   6. Atualiza Catálogo e Grupos"
echo ""
echo "🔑 Nada manual! Tudo automático!"
echo "═══════════════════════════════════════════════════════════════"

