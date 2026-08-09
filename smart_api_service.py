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
