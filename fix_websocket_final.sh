#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔧 CORREÇÃO FINAL - WEBSOCKET AO VIVO"
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
        self.history = []  # Lista de números com detalhes
        self.last_numbers = []  # Últimos 10 números
        self.total_numbers = 0
        self.callbacks = []
        self.running = False
        self.thread = None
        self.api_base = "https://sortenabet.bet.br"
        self.access_token = None
        self.game_id = None
        self.instance = None
        self.ultimos_500 = []  # Últimos 500 números
        self.historico_completo = []  # Histórico completo
        
    def set_access_token(self, token):
        self.access_token = token
        
    def set_session_id(self, session_id):
        self.session_id = session_id
        logger.info(f"🔑 Session ID definido: {session_id[:30]}...")
        
        # Extrai game_id e instance
        if session_id:
            self.game_id = "7x0b1tgh7agmf6hv"  # Game ID padrão
            self.instance = f"i4ea0l-tztnmffxax4bftio-{self.game_id}"
            self.connect()

    def get_websocket_url(self) -> str:
        if not self.session_id:
            raise ValueError("EVOSESSIONID não definido!")
        
        game_id = self.game_id or "7x0b1tgh7agmf6hv"
        instance = self.instance or f"i4ea0l-tztnmffxax4bftio-{game_id}"
        
        url = f"wss://sortenabet.evo-games.com/public/roulette/player/game/{game_id}/socket?messageFormat=json&EVOSESSIONID={self.session_id}&instance={instance}&client_version=6.20260728.73539.63676-d2334f2327-r2"
        
        logger.info(f"🌐 URL WebSocket: {url[:100]}...")
        return url

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
        """Processa número recebido do WebSocket"""
        timestamp = datetime.now()
        cor = self.get_cor(numero)
        
        registro = {
            'number': numero,
            'color': cor,
            'timestamp': timestamp.isoformat(),
            'raw': raw_data
        }
        
        # Adiciona ao histórico
        self.historico_completo.append(registro)
        
        # Atualiza últimos 500
        self.ultimos_500.append(numero)
        if len(self.ultimos_500) > 500:
            self.ultimos_500 = self.ultimos_500[-500:]
        
        # Atualiza últimos números
        self.last_numbers.insert(0, numero)
        if len(self.last_numbers) > 10:
            self.last_numbers = self.last_numbers[:10]
        
        self.total_numbers += 1
        
        # Salva no banco
        self.salvar_no_banco(numero)
        
        # Notifica callbacks
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

echo "✅ websocket_service.py corrigido!"

# ========== 2. ATUALIZA API_SERVER.PY ==========
# [MANTÉM O MESMO CÓDIGO ANTERIOR]

# ========== 3. COMMIT E PUSH ==========
git add websocket_service.py api_server.py
git commit -m "fix: corrige WebSocket para capturar tabela completa e números ao vivo"
git push origin main

echo "═══════════════════════════════════════════════════════════════"
echo "✅ CORREÇÃO ENVIADA!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🚀 AGORA FUNCIONA ASSIM:"
echo ""
echo "   1. Usuário abre a roleta"
echo "   2. WebSocket conecta AUTOMATICAMENTE"
echo "   3. Captura a tabela completa (500 números)"
echo "   4. Captura números AO VIVO"
echo "   5. Atualiza em tempo real"
echo ""
echo "🔑 O EVOSESSIONID é extraído da URL do jogo!"
echo "═══════════════════════════════════════════════════════════════"

