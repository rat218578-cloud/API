import json
import logging
import threading
import time
from datetime import datetime
import websocket
import ssl

logger = logging.getLogger(__name__)

class EvolutionWebSocket:
    def __init__(self):
        self.ws = None
        self.connected = False
        self.session_id = None
        self.last_numbers = []
        self.history = []
        self.callbacks = []
        self.running = False
        self.thread = None
        
    def set_session_id(self, session_id: str):
        """Define o EVOSESSIONID da Evolution"""
        self.session_id = session_id
        logger.info(f"🔑 Session ID definido: {session_id[:20]}...")

    def get_websocket_url(self) -> str:
        """Monta a URL do WebSocket"""
        if not self.session_id:
            raise ValueError("EVOSESSIONID não definido!")
        
        # URL do WebSocket da Evolution
        return f"wss://ws-evolution.sortenabet.bet.br/ws?messageFormat=json&EVOSESSIONID={self.session_id}&client_version=6.20260724.73611.63604-633bb6d1d6-r2"

    def on_message(self, ws, message):
        """Processa mensagem recebida"""
        try:
            data = json.loads(message)
            logger.info(f"📩 Mensagem recebida: {data.get('type', 'unknown')}")
            
            # Procura por números da roleta
            if 'data' in data:
                game_data = data.get('data', {})
                
                # Verifica se tem número da roleta
                number = game_data.get('number')
                if number is not None:
                    self.process_number(number, game_data)
                    
                # Verifica se tem histórico de números
                history = game_data.get('history', [])
                if history:
                    for item in history:
                        if 'number' in item:
                            self.process_number(item['number'], item)
                            
                # Verifica se tem últimos números
                last_numbers = game_data.get('lastNumbers', [])
                if last_numbers:
                    for num in last_numbers:
                        self.process_number(num, {'number': num})
            
            # Procura por números em qualquer lugar
            self.extract_numbers_from_data(data)
            
        except json.JSONDecodeError:
            logger.warning(f"⚠️ JSON inválido: {message[:100]}...")
        except Exception as e:
            logger.error(f"❌ Erro ao processar mensagem: {e}")

    def extract_numbers_from_data(self, data):
        """Extrai números de qualquer lugar do JSON"""
        if isinstance(data, dict):
            # Procura números em campos comuns
            for key in ['number', 'result', 'winningNumber', 'lastNumber']:
                if key in data and isinstance(data[key], (int, str)):
                    try:
                        num = int(data[key])
                        if 0 <= num <= 36:
                            self.process_number(num, {key: num})
                    except:
                        pass
            
            # Procura em listas
            for key in ['numbers', 'results', 'history', 'spins']:
                if key in data and isinstance(data[key], list):
                    for item in data[key]:
                        if isinstance(item, (int, str)):
                            try:
                                num = int(item)
                                if 0 <= num <= 36:
                                    self.process_number(num, {key: num})
                            except:
                                pass
                        elif isinstance(item, dict):
                            self.extract_numbers_from_data(item)
        
        elif isinstance(data, list):
            for item in data:
                self.extract_numbers_from_data(item)

    def process_number(self, number: int, raw_data: dict):
        """Processa um número recebido"""
        timestamp = datetime.now().isoformat()
        
        # Calcula cor
        red_numbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
        color = "red" if number in red_numbers else "black" if number != 0 else "green"
        
        number_data = {
            'number': number,
            'color': color,
            'timestamp': timestamp,
            'raw': raw_data
        }
        
        # Adiciona ao histórico
        self.history.append(number_data)
        
        # Mantém apenas os últimos 500 números
        if len(self.history) > 500:
            self.history = self.history[-500:]
        
        # Atualiza últimos números
        self.last_numbers.insert(0, number)
        if len(self.last_numbers) > 10:
            self.last_numbers = self.last_numbers[:10]
        
        logger.info(f"🎯 Número AO VIVO: {number} ({color}) - Total: {len(self.history)}")
        
        # Notifica callbacks
        for callback in self.callbacks:
            try:
                callback(number_data)
            except Exception as e:
                logger.error(f"❌ Erro no callback: {e}")

    def on_error(self, ws, error):
        logger.error(f"❌ WebSocket error: {error}")

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
        
        # Envia mensagem de ping inicial
        ping_msg = json.dumps({
            "type": "ping",
            "timestamp": int(time.time() * 1000)
        })
        ws.send(ping_msg)

    def connect(self):
        """Conecta ao WebSocket"""
        if not self.session_id:
            logger.error("❌ EVOSESSIONID não definido!")
            return False
        
        url = self.get_websocket_url()
        logger.info(f"🌐 Conectando ao WebSocket: {url[:80]}...")
        
        try:
            self.ws = websocket.WebSocketApp(
                url,
                on_open=self.on_open,
                on_message=self.on_message,
                on_error=self.on_error,
                on_close=self.on_close
            )
            
            # Executa em thread separada
            self.thread = threading.Thread(target=self.ws.run_forever, kwargs={
                'sslopt': {'cert_reqs': ssl.CERT_NONE}
            })
            self.thread.daemon = True
            self.thread.start()
            
            self.running = True
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

    def add_callback(self, callback):
        """Adiciona um callback para receber números AO VIVO"""
        self.callbacks.append(callback)

    def remove_callback(self, callback):
        """Remove um callback"""
        if callback in self.callbacks:
            self.callbacks.remove(callback)

# Instância global
evolution_ws = EvolutionWebSocket()
