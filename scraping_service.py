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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
        })
        
    def set_iframe_url(self, url):
        """Define a URL do iframe para scraping"""
        self.iframe_url = url
        logger.info(f"🔗 URL do iframe definida: {url[:100]}...")
        
    def extrair_numeros_do_html(self, html):
        """Extrai números do HTML do iframe"""
        numeros = []
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # 1. data-role="number-X"
            for elem in soup.find_all(attrs={"data-role": True}):
                data_role = elem.get('data-role', '')
                if data_role.startswith('number-'):
                    num = data_role.replace('number-', '')
                    if num.isdigit():
                        numeros.append(int(num))
            
            # 2. spans com classe YLMNPL (números)
            for span in soup.find_all('span', class_='YLMNPL'):
                try:
                    num = int(span.text.strip())
                    if 0 <= num <= 36:
                        numeros.append(num)
                except:
                    pass
            
            # 3. Classe statisticsBranding_black/red/green
            for elem in soup.find_all(class_=re.compile(r'statisticsBranding')):
                try:
                    texto = elem.text.strip()
                    num = int(texto)
                    if 0 <= num <= 36:
                        numeros.append(num)
                except:
                    pass
            
            # 4. Regex no texto
            texto = soup.get_text()
            nums = re.findall(r'\b([0-9]|[1-2][0-9]|3[0-6])\b', texto)
            for num in nums:
                if num.isdigit():
                    numeros.append(int(num))
            
            # Remove duplicatas mantendo ordem
            numeros = list(dict.fromkeys(numeros))
            
            if numeros:
                logger.info(f"🔍 Extraídos {len(numeros)} números do HTML")
            
        except Exception as e:
            logger.error(f"❌ Erro ao extrair HTML: {e}")
        
        return numeros
    
    def processar_numeros(self, numeros):
        """Processa e atualiza os números"""
        if not numeros:
            return
        
        novos = 0
        for num in numeros:
            if num not in self.ultimos_numeros:
                self.ultimos_numeros.append(num)
                self.numeros.append(num)
                self.total_numeros += 1
                novos += 1
        
        # Mantém últimos 500
        if len(self.numeros) > 500:
            self.numeros = self.numeros[-500:]
        
        # Mantém últimos 10
        if len(self.ultimos_numeros) > 10:
            self.ultimos_numeros = self.ultimos_numeros[-10:]
        
        if novos > 0:
            logger.info(f"🎯 +{novos} novos números! Total: {self.total_numeros}")
    
    def fetch_and_process(self):
        """Busca o iframe e processa os números"""
        if not self.iframe_url:
            return
        
        try:
            response = self.session.get(self.iframe_url, timeout=10)
            if response.status_code == 200:
                numeros = self.extrair_numeros_do_html(response.text)
                if numeros:
                    self.processar_numeros(numeros)
                    return True
        except Exception as e:
            logger.error(f"❌ Erro: {e}")
        
        return False
    
    def start_scraping(self, interval=3):
        """Inicia o scraping contínuo"""
        self.running = True
        
        def scrape_loop():
            while self.running:
                self.fetch_and_process()
                time.sleep(interval)
        
        thread = threading.Thread(target=scrape_loop, daemon=True)
        thread.start()
        logger.info(f"✅ Scraping iniciado (intervalo: {interval}s)")
    
    def stop_scraping(self):
        """Para o scraping"""
        self.running = False
        logger.info("🔌 Scraping parado")
    
    def get_history(self, limit=500):
        """Retorna o histórico de números"""
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
        for num in self.numeros[-100:]:
            if num == 0:
                cores['green'] += 1
            elif num in red:
                cores['red'] += 1
            else:
                cores['black'] += 1
        
        freq = Counter(self.numeros[-100:])
        
        return {
            'total': len(self.numeros),
            'colors': cores,
            'most_frequent': freq.most_common(5),
            'last_numbers': self.get_last_numbers(10)
        }

# Instância global
scraping_service = ScrapingService()
