#!/usr/bin/env python3
"""
🎯 API GAMES - NÚMEROS REAIS DA SMART API
Serviço separado para buscar números ao vivo
"""

import requests
import json
import time
import threading
import logging
from datetime import datetime
from collections import Counter

logger = logging.getLogger(__name__)

class ApiGamesService:
    def __init__(self):
        self.base_url = "https://tool-api.smartanalise.com.br/api"
        self.numeros = []
        self.ultimos_numeros = []
        self.total_numeros = 0
        self.last_signal_id = None
        self.running = False
        self.email = None
        self.source = "immersivevip"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://tool.smartanalise.com.br/',
            'Origin': 'https://tool.smartanalise.com.br'
        }
        
    def set_email(self, email):
        """Define o email do usuário"""
        self.email = email
        logger.info(f"📧 Email definido: {email}")
        
    def fetch_numbers(self, since: str = None):
        """Busca números da Smart API"""
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
            
            url = f"{self.base_url}/history-delta"
            logger.info(f"📡 Buscando números...")
            
            response = requests.get(
                url,
                params=params,
                headers=self.headers,
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
                    self.last_signal_id = numeros[0].get('signalId')
                    self.processar_numeros(numeros)
                    logger.info(f"✅ +{len(numeros)} números reais")
                
                return numeros
            else:
                logger.warning(f"⚠️ Status: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"❌ Erro: {e}")
            return []
    
    def processar_numeros(self, novos_numeros):
        """Processa e atualiza a lista de números"""
        for item in novos_numeros:
            numero = item['number']
            # Verifica se já existe
            if not any(n['number'] == numero and n.get('signalId') == item.get('signalId') for n in self.ultimos_numeros):
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
        logger.info(f"🚀 Iniciando polling (intervalo: {interval}s)")
        
        # Primeira carga
        self.fetch_numbers()
        
        def poll_loop():
            while self.running:
                try:
                    since = self.last_signal_id
                    if since:
                        self.fetch_numbers(since=since)
                    else:
                        self.fetch_numbers()
                    time.sleep(interval)
                except Exception as e:
                    logger.error(f"❌ Erro: {e}")
                    time.sleep(interval)
        
        thread = threading.Thread(target=poll_loop, daemon=True)
        thread.start()
        logger.info("✅ Polling iniciado")
    
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
    
    def get_top_numbers(self, count=8):
        """Retorna os números mais frequentes"""
        if not self.numeros:
            return []
        
        nums = [n['number'] for n in self.numeros]
        freq = Counter(nums).most_common(count)
        return [{'number': num, 'count': cnt} for num, cnt in freq]
    
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
        
        return {
            'total': len(self.numeros),
            'colors': cores,
            'most_frequent': self.get_top_numbers(5),
            'last_numbers': [n['number'] for n in self.get_last_numbers(10)]
        }

# Instância global
apigames = ApiGamesService()
