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
        
    def set_game_url(self, url):
        """Extrai EVOSESSIONID da URL do jogo (decodificando base64 se necessário)"""
        self.game_url = url
        logger.info(f"🔗 URL do jogo: {url[:120]}...")
        
        # Tenta encontrar EVOSESSIONID diretamente
        match = re.search(r'EVOSESSIONID=([^&]+)', url)
        if match:
            self.evo_session_id = match.group(1)
            self.session_id = self.evo_session_id
            logger.info(f"🔑 EVOSESSIONID encontrado diretamente: {self.session_id[:30]}...")
            self._extract_game_id(url)
            self.connect()
            return self.session_id
        
        # Tenta extrair do parâmetro 'params' (base64)
        match = re.search(r'params=([^&]+)', url)
        if match:
            params_b64 = match.group(1)
            logger.info(f"📦 Params base64 encontrado: {params_b64[:50]}...")
            
            try:
                # Decodifica base64 (adiciona padding se necessário)
                params_b64_padded = params_b64 + '=' * (4 - len(params_b64) % 4) if len(params_b64) % 4 else params_b64
                decoded = base64.b64decode(params_b64_padded).decode('utf-8', errors='ignore')
                logger.info(f"📄 Params decodificado: {decoded[:100]}...")
                
                # Procura EVOSESSIONID no texto decodificado
                match_evo = re.search(r'EVOSESSIONID[=:]([A-Za-z0-9_\-]+)', decoded)
                if match_evo:
                    self.evo_session_id = match_evo.group(1)
                    self.session_id = self.evo_session_id
                    logger.info(f"🔑 EVOSESSIONID encontrado no base64: {self.session_id[:30]}...")
                    self._extract_game_id(url)
                    self.connect()
                    return self.session_id
                
                # Procura por token no formato tzt...
                match_token = re.search(r'(tzt[A-Za-z0-9_\-]{20,})', decoded)
                if match_token:
                    self.evo_session_id = match_token.group(1)
                    self.session_id = self.evo_session_id
                    logger.info(f"🔑 Token encontrado no base64: {self.session_id[:30]}...")
                    self._extract_game_id(url)
                    self.connect()
                    return self.session_id
                    
            except Exception as e:
                logger.error(f"❌ Erro ao decodificar base64: {e}")
        
        # Tenta extrair de qualquer token na URL
        match = re.search(r'(tzt[A-Za-z0-9_\-]{20,})', url)
        if match:
            self.evo_session_id = match.group(1)
            self.session_id = self.evo_session_id
            logger.info(f"🔑 Token encontrado na URL: {self.session_id[:30]}...")
            self._extract_game_id(url)
            self.connect()
            return self.session_id
        
        logger.error("❌ EVOSESSIONID não encontrado em nenhum lugar da URL")
        return None
    
    def _extract_game_id(self, url):
        """Extrai game_id da URL"""
        match = re.search(r'game[/:]([^/&]+)', url)
        if match:
            self.game_id = match.group(1)
            logger.info(f"🎮 Game ID: {self.game_id}")
        self.instance = f"i4ea0l-{self.evo_session_id[:20]}-{self.game_id}" if self.evo_session_id else None
        
    def set_access_token(self, token):
        self.access_token = token

    def get_websocket_url(self) -> str:
        if not self.session_id:
            raise ValueError("EVOSESSIONID não definido!")
        
        url = f"wss://sortenabet.evo-games.com/public/roulette/player/game/{self.game_id}/socket?messageFormat=json&EVOSESSIONID={self.session_id}&instance={self.instance}&client_version=6.20260728.73539.63676-d2334f2327-r2"
        
        logger.info(f"🌐 WebSocket URL: {url[:120]}...")
        return url

    def extrair_numero(self, data):
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
            logger.info("🔄 Tentando reconectar em 3 segundos...")
            time.sleep(3)
            self.connect()

    def on_open(self, ws):
        self.connected = True
        logger.info("✅ WebSocket CONECTADO com sucesso!")
        logger.info("📡 Aguardando números REAIS da Evolution...")

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
