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
        
    def set_access_token(self, token):
        self.access_token = token
        
    def set_session_id(self, session_id):
        """Define o EVOSESSIONID da Evolution"""
        self.session_id = session_id
        logger.info(f"🔑 Session ID definido: {session_id[:30]}...")
        
        # Extrai game_id e instance da URL
        # Exemplo: game/7x0b1tgh7agmf6hv/socket
        # instance=i4ea0l-tztnmffxax4bftio-7x0b1tgh7agmf6hv
        if session_id:
            # Tenta extrair game_id da sessão
            # O game_id geralmente vem depois de "game/"
            match = re.search(r'game/([^/]+)/socket', str(session_id))
            if match:
                self.game_id = match.group(1)
                logger.info(f"🎮 Game ID: {self.game_id}")
            
            # Tenta conectar automaticamente
            self.connect()

    def get_websocket_url(self) -> str:
        """Monta a URL do WebSocket com os parâmetros corretos"""
        if not self.session_id:
            raise ValueError("EVOSESSIONID não definido!")
        
        # URL base do WebSocket da Evolution
        # Usando o formato correto com game_id
        base_url = "wss://sortenabet.evo-games.com/public/roulette/player/game"
        
        # Se não temos game_id, usamos o padrão
        game_id = self.game_id or "7x0b1tgh7agmf6hv"
        instance = self.instance or f"i4ea0l-tztnmffxax4bftio-{game_id}"
        
        url = f"{base_url}/{game_id}/socket?messageFormat=json&EVOSESSIONID={self.session_id}&instance={instance}&client_version=6.20260724.73611.63604-633bb6d1d6-r2"
        
        logger.info(f"🌐 URL WebSocket: {url[:100]}...")
        return url

    def extrair_numero(self, data):
        """Extrai número do JSON da Evolution"""
        # winSpots - MAIS COMUM!
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
        
        # Busca em qualquer lugar do JSON
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
            if response.status_code == 200:
                logger.info(f"💾 Número {numero} salvo no banco")
                return True
            return False
        except Exception as e:
            logger.error(f"❌ Erro ao salvar: {e}")
            return False

    def processar_numero(self, numero, raw_data):
        """Processa número recebido do WebSocket"""
        self.total_numbers += 1
        timestamp = datetime.now()
        cor = self.get_cor(numero)
        
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
            
            # Log para debug
            msg_type = data.get('type', 'unknown')
            if msg_type in ['roulette.winSpots', 'roulette.tableState']:
                logger.info(f"📩 Mensagem recebida: {msg_type}")
            
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
        logger.info(f"🎯 Total de números até agora: {self.total_numbers}")

    def connect(self):
        """Conecta ao WebSocket"""
        if not self.session_id:
            logger.error("❌ EVOSESSIONID não definido!")
            return False
        
        try:
            url = self.get_websocket_url()
            logger.info(f"🔌 Conectando ao WebSocket...")
            logger.info(f"   🔑 Session ID: {self.session_id[:30]}...")
            
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
            
            if self.connected:
                logger.info("✅ WebSocket conectado e pronto!")
                return True
            else:
                logger.warning("⚠️ WebSocket não conectou após 3 segundos")
                return False
            
        except Exception as e:
            logger.error(f"❌ Erro ao conectar: {e}")
            return False

    def disconnect(self):
        self.running = False
        if self.ws:
            self.ws.close()
        self.connected = False
        logger.info("🔌 Desconectado do WebSocket")

    def get_history(self, limit: int = 500) -> list:
        return self.history[-limit:] if self.history else []

    def get_last_numbers(self, count: int = 10) -> list:
        return self.last_numbers[:count]

    def get_statistics(self) -> dict:
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
        self.callbacks.append(callback)

    def remove_callback(self, callback):
        if callback in self.callbacks:
            self.callbacks.remove(callback)

# Instância global
evolution_ws = EvolutionWebSocketService()
