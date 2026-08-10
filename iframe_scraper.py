#!/usr/bin/env python3
"""
🎯 SCRAPER DO IFRAME - PEGA NÚMEROS DO HTML
Uso: python3 iframe_scraper.py
"""

import requests
import re
import time
from bs4 import BeautifulSoup
from datetime import datetime
from collections import Counter

class IframeScraper:
    def __init__(self):
        self.numeros = []
        self.ultimos_numeros = []
        self.total_numeros = 0
        
    def extrair_numeros(self, html):
        """Extrai números do HTML do iframe"""
        numeros = []
        
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # 1. Procura por data-role="number-X"
            for elem in soup.find_all(attrs={"data-role": True}):
                data_role = elem.get('data-role', '')
                if data_role.startswith('number-'):
                    num = data_role.replace('number-', '')
                    if num.isdigit():
                        numeros.append(int(num))
            
            # 2. Procura por spans com a classe TWb2Bi (números)
            for span in soup.find_all('span', class_='TWb2Bi'):
                try:
                    num = int(span.text.strip())
                    if 0 <= num <= 36:
                        numeros.append(num)
                except:
                    pass
            
            # 3. Procura por números em qualquer lugar
            texto = soup.get_text()
            nums = re.findall(r'\b([0-9]|[1-2][0-9]|3[0-6])\b', texto)
            for num in nums:
                if num.isdigit():
                    numeros.append(int(num))
            
            # Remove duplicatas mantendo ordem
            numeros = list(dict.fromkeys(numeros))
            
        except Exception as e:
            print(f"❌ Erro ao extrair: {e}")
        
        return numeros
    
    def processar_numeros(self, numeros):
        """Processa e atualiza os números"""
        if not numeros:
            return
        
        for num in numeros:
            if num not in self.ultimos_numeros:
                self.ultimos_numeros.append(num)
                self.numeros.append(num)
                self.total_numeros += 1
        
        # Mantém últimos 500
        if len(self.numeros) > 500:
            self.numeros = self.numeros[-500:]
        
        # Mantém últimos 10
        if len(self.ultimos_numeros) > 10:
            self.ultimos_numeros = self.ultimos_numeros[-10:]
    
    def get_ultimos(self, count=10):
        return self.ultimos_numeros[-count:] if self.ultimos_numeros else []
    
    def get_historico(self, limit=500):
        return self.numeros[-limit:] if self.numeros else []
    
    def mostrar_status(self):
        """Mostra status atual"""
        print("\n" + "=" * 70)
        print("📊 STATUS DOS NÚMEROS")
        print("=" * 70)
        print(f"   📈 Total: {self.total_numeros}")
        print(f"   📋 Histórico: {len(self.numeros)} números")
        
        ultimos = self.get_ultimos(10)
        if ultimos:
            print(f"\n   📋 Últimos 10 números:")
            linha = "   "
            for num in ultimos:
                cor = "🔴" if num in [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] else "⚫" if num != 0 else "🟢"
                linha += f"{cor}{num} "
            print(linha)
        
        print("=" * 70)

def testar_scraper():
    """Testa o scraper com HTML de exemplo"""
    scraper = IframeScraper()
    
    print("=" * 70)
    print("🎰 SCRAPER DO IFRAME")
    print("=" * 70)
    
    # HTML de exemplo com números
    html_exemplo = '''
    <div data-role="number-11" class="statisticsBranding_black">11</div>
    <div data-role="number-5" class="statisticsBranding_red">5</div>
    <div data-role="number-25" class="statisticsBranding_red">25</div>
    <div data-role="number-19" class="statisticsBranding_red">19</div>
    <div data-role="number-13" class="statisticsBranding_black">13</div>
    <div data-role="number-5" class="statisticsBranding_red">5</div>
    <div data-role="number-35" class="statisticsBranding_black">35</div>
    <div data-role="number-10" class="statisticsBranding_black">10</div>
    <div data-role="number-8" class="statisticsBranding_black">8</div>
    <div data-role="number-33" class="statisticsBranding_black">33</div>
    '''
    
    print("\n🔍 Extraindo números do HTML...")
    numeros = scraper.extrair_numeros(html_exemplo)
    scraper.processar_numeros(numeros)
    scraper.mostrar_status()
    
    print("\n" + "=" * 70)
    print("✅ Scraper funcionando!")
    print("=" * 70)

if __name__ == "__main__":
    testar_scraper()
