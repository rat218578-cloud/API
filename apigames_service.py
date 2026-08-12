#!/usr/bin/env python3
"""
🎯 API GAMES - NÚMEROS REAIS DA SMART API
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
        self.fontes = {}
        self.email = None
        self.running = False
        self.threads = []
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
        
    def inicializar_fonte(self, source: str):
        if source not in self.fontes:
            self.fontes[source] = {
                'numeros': [],
                'ultimos_numeros': [],
                'total_numeros': 0,
                'last_signal_id': None,
                'carregado': False
            }
            logger.info(f"📊 Fonte {source} inicializada")
        
    def carregar_historico(self, source: str):
        if not self.email:
            logger.warning("⚠️ Email não definido!")
            return False
        
        self.inicializar_fonte(source)
        dados = self.fontes[source]
        
        try:
            url = f"{self.base_url}/full-history?source={source}&userEmail={self.email}"
            logger.info(f"📥 Carregando histórico {source}")
            
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                items = data.get('data') or data.get('results', [])
                items = items[::-1]
                
                for item in items:
                    signal_id = item.get('signalId') or item.get('id')
                    signal = item.get('signal') or item.get('number')
                    
                    if signal_id and signal and str(signal).isdigit():
                        numero = int(signal)
                        if 0 <= numero <= 36:
                            dados['numeros'].append({
                                'number': numero,
                                'signalId': signal_id,
                                'timestamp': item.get('timestamp')
                            })
                            dados['total_numeros'] += 1
                            dados['last_signal_id'] = signal_id
                
                dados['ultimos_numeros'] = dados['numeros'][-10:] if dados['numeros'] else []
                dados['carregado'] = True
                logger.info(f"✅ {source}: {dados['total_numeros']} números carregados")
                return True
            else:
                logger.warning(f"⚠️ {source} Status: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erro ao carregar {source}: {e}")
            return False
    
    def buscar_novos(self, source: str):
        if not self.email:
            logger.warning("⚠️ Email não definido!")
            return []
        
        self.inicializar_fonte(source)
        dados = self.fontes[source]
        
        try:
            url = f"{self.base_url}/history-delta?source={source}&userEmail={self.email}"
            if dados['last_signal_id']:
                url += f"&since={dados['last_signal_id']}"
            
            response = requests.get(url, headers=self.headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('data'):
                    novos = data['data'][::-1]
                    numeros_novos = []
                    
                    for item in novos:
                        signal_id = item.get('signalId')
                        signal = item.get('signal')
                        
                        if signal_id and signal and str(signal).isdigit():
                            numero = int(signal)
                            if 0 <= numero <= 36:
                                if not any(n.get('signalId') == signal_id for n in dados['numeros']):
                                    dados['numeros'].append({
                                        'number': numero,
                                        'signalId': signal_id,
                                        'timestamp': item.get('timestamp')
                                    })
                                    numeros_novos.append(signal)
                                    dados['total_numeros'] += 1
                                    dados['last_signal_id'] = signal_id
                    
                    dados['ultimos_numeros'] = dados['numeros'][-10:] if dados['numeros'] else []
                    
                    if numeros_novos:
                        logger.info(f"✅ {source}: +{len(numeros_novos)} novos números")
                    
                    return numeros_novos
            return []
            
        except Exception as e:
            logger.error(f"❌ Erro {source}: {e}")
            return []
    
    def start_polling(self, interval=2):
        if self.running:
            return
        
        self.running = True
        logger.info(f"🚀 Iniciando polling (intervalo: {interval}s)")
        
        # 🔥 FONTES: immersive, lightning, xxxtreme (TODAS!)
        fontes = ['immersive', 'lightning', 'xxxtreme']
        for source in fontes:
            logger.info(f"🔄 Carregando {source}...")
            self.carregar_historico(source)
        
        def poll_loop():
            while self.running:
                try:
                    for source in ['immersive', 'lightning', 'xxxtreme']:
                        novos = self.buscar_novos(source)
                        if novos:
                            logger.info(f"🎯 {source}: +{len(novos)} novos números")
                    time.sleep(interval)
                except Exception as e:
                    logger.error(f"❌ Erro no polling: {e}")
                    time.sleep(interval)
        
        thread = threading.Thread(target=poll_loop, daemon=True)
        thread.start()
        self.threads.append(thread)
        logger.info("✅ Polling iniciado")
    
    def stop_polling(self):
        self.running = False
        logger.info("🔌 Polling parado")
    
    def get_history(self, source: str, limit=500):
        if source not in self.fontes:
            return []
        dados = self.fontes[source]
        if not dados['numeros']:
            return []
        return dados['numeros'][-limit:][::-1]
    
    def get_last_numbers(self, source: str, count=10):
        if source not in self.fontes:
            return []
        dados = self.fontes[source]
        if not dados['ultimos_numeros']:
            return []
        return dados['ultimos_numeros'][::-1]
    
    def get_top_numbers(self, source: str, count=8):
        if source not in self.fontes:
            return []
        dados = self.fontes[source]
        if not dados['numeros']:
            return []
        
        nums = [n['number'] for n in dados['numeros']]
        freq = Counter(nums).most_common(count)
        return [{'number': num, 'count': cnt} for num, cnt in freq]
    
    def get_total(self, source: str):
        if source not in self.fontes:
            return 0
        return self.fontes[source]['total_numeros']

# Instância global
apigames = ApiGamesService()
