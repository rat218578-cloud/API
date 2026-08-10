import json
import logging
import time
import threading
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from collections import Counter
import re

logger = logging.getLogger(__name__)

class ScrapingService:
    def __init__(self):
        self.numeros = []
        self.ultimos_numeros = []
        self.total_numeros = 0
        self.running = False
        self.iframe_url = None
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
    def set_iframe_url(self, url):
        self.iframe_url = url
        logger.info(f"🔗 URL do iframe: {url[:100]}...")
        
    def extrair_numeros(self, html):
        numeros = []
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # data-role="number-X"
            for elem in soup.find_all(attrs={"data-role": True}):
                data_role = elem.get('data-role', '')
                if data_role.startswith('number-'):
                    num = data_role.replace('number-', '')
                    if num.isdigit():
                        numeros.append(int(num))
            
            # spans com classe TWb2Bi
            for span in soup.find_all('span', class_='TWb2Bi'):
                try:
                    num = int(span.text.strip())
                    if 0 <= num <= 36:
                        numeros.append(num)
                except:
                    pass
            
            numeros = list(dict.fromkeys(numeros))
            
        except Exception as e:
            logger.error(f"❌ Erro: {e}")
        
        return numeros
    
    def processar_numeros(self, numeros):
        if not numeros:
            return
        
        novos = 0
        for num in numeros:
            if num not in self.ultimos_numeros:
                self.ultimos_numeros.append(num)
                self.numeros.append(num)
                self.total_numeros += 1
                novos += 1
        
        if len(self.numeros) > 500:
            self.numeros = self.numeros[-500:]
        if len(self.ultimos_numeros) > 10:
            self.ultimos_numeros = self.ultimos_numeros[-10:]
        
        if novos > 0:
            logger.info(f"🎯 +{novos} números! Total: {self.total_numeros}")
    
    def fetch_and_process(self):
        if not self.iframe_url:
            return
        
        try:
            response = self.session.get(self.iframe_url, timeout=10)
            if response.status_code == 200:
                numeros = self.extrair_numeros(response.text)
                if numeros:
                    self.processar_numeros(numeros)
                    return True
        except Exception as e:
            logger.error(f"❌ Erro: {e}")
        
        return False
    
    def start_scraping(self, interval=3):
        self.running = True
        
        def scrape_loop():
            while self.running:
                self.fetch_and_process()
                time.sleep(interval)
        
        thread = threading.Thread(target=scrape_loop, daemon=True)
        thread.start()
        logger.info(f"✅ Scraping iniciado (intervalo: {interval}s)")
    
    def stop_scraping(self):
        self.running = False
        logger.info("🔌 Scraping parado")
    
    def get_history(self, limit=500):
        return self.numeros[-limit:] if self.numeros else []
    
    def get_last_numbers(self, count=10):
        return self.ultimos_numeros[-count:] if self.ultimos_numeros else []

# Instância global
scraping_service = ScrapingService()
