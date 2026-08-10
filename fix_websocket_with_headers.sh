#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔧 CORRIGINDO WEBSOCKET COM HEADERS E COOKIE"
echo "═══════════════════════════════════════════════════════════════"

# ========== CORRIGE WEBSOCKET_SERVICE.PY ==========
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
import base64
import urllib.parse

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
        self.game_url = None
        self.ws_url = None
        self.headers = None
        
    def set_game_url(self, url):
        """Extrai EVOSESSIONID e monta URL exata do WebSocket com HEADERS"""
        self.game_url = url
        logger.info(f"🔗 URL do jogo: {url[:120]}...")
        
        # Extrai EVOSESSIONID
        evo_id = None
        
        # Tenta encontrar diretamente
        match = re.search(r'EVOSESSIONID=([^&]+)', url)
        if match:
            evo_id = match.group(1)
        
        # Tenta encontrar no base64
        if not evo_id:
            match = re.search(r'params=([^&]+)', url)
            if match:
                try:
                    params_b64 = match.group(1)
                    params_b64_padded = params_b64 + '=' * (4 - len(params_b64) % 4) if len(params_b64) % 4 else params_b64
                    decoded = base64.b64decode(params_b64_padded).decode('utf-8', errors='ignore')
                    match_evo = re.search(r'EVOSESSIONID[=:]([A-Za-z0-9_\-]+)', decoded)
                    if match_evo:
                        evo_id = match_evo.group(1)
                    else:
                        match_token = re.search(r'(tzt[A-Za-z0-9_\-]{20,})', decoded)
                        if match_token:
                            evo_id = match_token.group(1)
                except Exception as e:
                    logger.error(f"❌ Erro ao decodificar: {e}")
        
        # Tenta encontrar token solto
        if not evo_id:
            match = re.search(r'(tzt[A-Za-z0-9_\-]{20,})', url)
            if match:
                evo_id = match.group(1)
        
        if not evo_id:
            logger.error("❌ EVOSESSIONID não encontrado")
            return None
        
        self.evo_session_id = evo_id
        self.session_id = evo_id
        logger.info(f"🔑 EVOSESSIONID: {evo_id[:30]}...")
        
        # Extrai game_id
        match = re.search(r'game[/:]([^/&]+)', url)
        if match:
            self.game_id = match.group(1)
            logger.info(f"🎮 Game ID: {self.game_id}")
        
        # Monta URL do WebSocket IGUAL à do navegador
        self.instance = f"i4ea0l-tztnmffxax4bftio-{self.game_id}"
        
        # URL EXATA do WebSocket (igual à do navegador)
        self.ws_url = f"wss://sortenabet.evo-games.com/public/roulette/player/game/{self.game_id}/socket?messageFormat=json&EVOSESSIONID={evo_id}&instance={self.instance}&client_version=6.20260728.73539.63676-d2334f2327-r2"
        
        logger.info(f"🌐 WebSocket URL: {self.ws_url[:120]}...")
        
        # ========== HEADERS IGUAIS AO DO NAVEGADOR ==========
        self.headers = {
            "Origin": "https://sortenabet.evo-games.com",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0",
            "Cookie": f"cdn=https://static.egcdn.com; lang=bp; locale=pt-BR; EVOSESSIONID={evo_id}"
        }
        
        logger.info(f"🍪 Cookie: {self.headers['Cookie'][:50]}...")
        
        # Conecta
        self.connect()
        return evo_id
        
    def set_access_token(self, token):
        self.access_token = token

    def get_websocket_url(self) -> str:
        if not self.ws_url:
            raise ValueError("URL do WebSocket não definida!")
        return self.ws_url

    def get_headers(self) -> dict:
        if not self.headers:
            return {}
        return self.headers

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
            self.processar_recent_results(data)
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
            logger.info("🔄 Tentando reconectar em 5 segundos...")
            time.sleep(5)
            self.connect()

    def on_open(self, ws):
        self.connected = True
        logger.info("✅ WebSocket CONECTADO com sucesso!")
        logger.info("📡 Aguardando números REAIS da Evolution...")

    def connect(self):
        if not self.evo_session_id:
            logger.error("❌ EVOSESSIONID não definido!")
            return False
        
        try:
            url = self.get_websocket_url()
            headers = self.get_headers()
            
            logger.info(f"🔌 Conectando ao WebSocket...")
            logger.info(f"🍪 Cookie: {headers.get('Cookie', '')[:50]}...")
            
            self.ws = websocket.WebSocketApp(
                url,
                header=headers,
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

echo "✅ websocket_service.py atualizado com HEADERS e COOKIE!"

# ========== COMMIT E PUSH ==========
git add websocket_service.py
git commit -m "fix: adiciona headers e cookie igual ao navegador para WebSocket"
git push origin main

echo "═══════════════════════════════════════════════════════════════"
echo "✅ CORREÇÃO ENVIADA!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🔧 O QUE FOI CORRIGIDO:"
echo "   ✅ Headers iguais ao do navegador"
echo "   ✅ Cookie com EVOSESSIONID"
echo "   ✅ Origin e User-Agent corretos"
echo "   ✅ URL exata do WebSocket"
echo ""
echo "🚀 DEPOIS DO DEPLOY:"
echo "   1. Faça login"
echo "   2. Abra a roleta"
echo "   3. WebSocket vai conectar e ficar conectado!"
echo "═══════════════════════════════════════════════════════════════"

