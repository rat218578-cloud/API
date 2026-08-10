#!/usr/bin/env python3
"""
🎯 API GAMES - IGUAL AO SCRIPT PYTHON
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
        self.numeros = []  # Lista completa de números
        self.ultimos_numeros = []  # Últimos 10 números
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
        self.email = email
        logger.info(f"📧 Email definido: {email}")
        
    def carregar_historico(self):
        """Carrega o histórico completo (IGUAL AO SCRIPT)"""
        if not self.email:
            logger.warning("⚠️ Email não definido!")
            return False
        
        try:
            url = f"{self.base_url}/full-history?source={self.source}&userEmail={self.email}"
            logger.info(f"📥 Carregando histórico: {url}")
            
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                items = data.get('data') or data.get('results', [])
                
                # Inverte para ordem cronológica (mais antigo primeiro) - IGUAL AO SCRIPT
                items = items[::-1]
                
                for item in items:
                    signal_id = item.get('signalId') or item.get('id')
                    signal = item.get('signal') or item.get('number')
                    
                    if signal_id and signal:
                        self.numeros.append({
                            'number': int(signal),
                            'signalId': signal_id,
                            'timestamp': item.get('timestamp')
                        })
                        self.total_numeros += 1
                        self.last_signal_id = signal_id
                
                # Atualiza últimos 10 números
                self.ultimos_numeros = self.numeros[-10:] if self.numeros else []
                
                logger.info(f"✅ {self.total_numeros} números carregados do histórico")
                return True
            else:
                logger.warning(f"⚠️ Status: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erro ao carregar histórico: {e}")
            return False
    
    def buscar_novos(self):
        """Busca novos números desde o último signal_id (IGUAL AO SCRIPT)"""
        if not self.email:
            logger.warning("⚠️ Email não definido!")
            return []
        
        try:
            url = f"{self.base_url}/history-delta?source={self.source}&userEmail={self.email}"
            if self.last_signal_id:
                url += f"&since={self.last_signal_id}"
            
            response = requests.get(url, headers=self.headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('data'):
                    # Inverte para ordem cronológica (mais antigo primeiro) - IGUAL AO SCRIPT
                    novos = data['data'][::-1]
                    numeros_novos = []
                    
                    for item in novos:
                        signal_id = item.get('signalId')
                        signal = item.get('signal')
                        
                        # Verifica se já existe
                        if signal_id and not any(n.get('signalId') == signal_id for n in self.numeros):
                            self.numeros.append({
                                'number': int(signal),
                                'signalId': signal_id,
                                'timestamp': item.get('timestamp')
                            })
                            numeros_novos.append(signal)
                            self.total_numeros += 1
                            self.last_signal_id = signal_id
                    
                    # Atualiza últimos 10 números
                    self.ultimos_numeros = self.numeros[-10:] if self.numeros else []
                    
                    if numeros_novos:
                        logger.info(f"✅ +{len(numeros_novos)} novos números")
                    
                    return numeros_novos
            return []
            
        except Exception as e:
            logger.error(f"❌ Erro: {e}")
            return []
    
    def start_polling(self, interval=3):
        """Inicia polling contínuo (IGUAL AO SCRIPT)"""
        self.running = True
        logger.info(f"🚀 Iniciando polling (intervalo: {interval}s)")
        
        # Carrega histórico completo primeiro
        self.carregar_historico()
        
        def poll_loop():
            while self.running:
                try:
                    novos = self.buscar_novos()
                    if novos:
                        logger.info(f"🎯 NOVO(S) NÚMERO(S): {' '.join(novos)}")
                    time.sleep(interval)
                except Exception as e:
                    logger.error(f"❌ Erro no polling: {e}")
                    time.sleep(interval)
        
        thread = threading.Thread(target=poll_loop, daemon=True)
        thread.start()
        logger.info("✅ Polling iniciado")
    
    def stop_polling(self):
        self.running = False
        logger.info("🔌 Polling parado")
    
    def get_history(self, limit=500):
        """Retorna histórico de números (mais recentes primeiro)"""
        if not self.numeros:
            return []
        # Mantém a ordem correta para o frontend (mais recente primeiro)
        return self.numeros[-limit:][::-1] if self.numeros else []
    
    def get_last_numbers(self, count=10):
        """Retorna os últimos números (mais recentes primeiro)"""
        if not self.ultimos_numeros:
            return []
        return self.ultimos_numeros[::-1]
    
    def get_top_numbers(self, count=8):
        if not self.numeros:
            return []
        
        nums = [n['number'] for n in self.numeros]
        freq = Counter(nums).most_common(count)
        return [{'number': num, 'count': cnt} for num, cnt in freq]
    
    def get_statistics(self):
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
            'total': self.total_numeros,
            'colors': cores,
            'most_frequent': self.get_top_numbers(5),
            'last_numbers': [n['number'] for n in self.get_last_numbers(10)]
        }

# Instância global
apigames = ApiGamesService()
