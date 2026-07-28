#!/usr/bin/env python3
"""
🎯 PEGA NÚMEROS DO IFRAME DA EVOLUTION
Não precisa de WebSocket! Os números já estão no HTML!
"""

import time
import re
from datetime import datetime
from collections import Counter
import requests
from bs4 import BeautifulSoup
import json

class EvolutionIframeScraper:
    def __init__(self):
        self.numeros = []
        self.ultimos_numeros = []
        self.total_numeros = 0
        
    def extrair_numeros_do_html(self, html):
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
            
            # 2. Procura por spans com a classe YLMNPL (números)
            for span in soup.find_all('span', class_='YLMNPL'):
                try:
                    num = int(span.text.strip())
                    if 0 <= num <= 36:
                        numeros.append(num)
                except:
                    pass
            
            # 3. Procura por números no texto
            texto = soup.get_text()
            nums = re.findall(r'\b([0-9]|[1-2][0-9]|3[0-6])\b', texto)
            for num in nums:
                if num.isdigit():
                    numeros.append(int(num))
            
            # Remove duplicatas mantendo ordem
            numeros = list(dict.fromkeys(numeros))
            
        except Exception as e:
            print(f"❌ Erro ao extrair HTML: {e}")
        
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
        
        # Mantém apenas os últimos 500
        if len(self.numeros) > 500:
            self.numeros = self.numeros[-500:]
        
        # Mantém apenas os últimos 10
        if len(self.ultimos_numeros) > 10:
            self.ultimos_numeros = self.ultimos_numeros[-10:]
    
    def get_ultimos_10(self):
        """Retorna os últimos 10 números"""
        return self.ultimos_numeros[-10:] if self.ultimos_numeros else []
    
    def get_historico(self, limit=500):
        """Retorna o histórico de números"""
        return self.numeros[-limit:] if self.numeros else []
    
    def get_estatisticas(self):
        """Retorna estatísticas dos números"""
        if not self.numeros:
            return {}
        
        red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
        
        cores = {
            'red': 0,
            'black': 0,
            'green': 0
        }
        
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
            'last_numbers': self.get_ultimos_10()
        }
    
    def mostrar_status(self):
        """Mostra status atual"""
        stats = self.get_estatisticas()
        
        print("\n" + "=" * 70)
        print("📊 STATUS DOS NÚMEROS")
        print("=" * 70)
        print(f"   📈 Total de números: {stats.get('total', 0)}")
        
        cores = stats.get('colors', {})
        print(f"   🔴 Vermelho: {cores.get('red', 0)}")
        print(f"   ⚫ Preto: {cores.get('black', 0)}")
        print(f"   🟢 Verde: {cores.get('green', 0)}")
        
        freq = stats.get('most_frequent', [])
        if freq:
            print(f"\n   🔥 Números mais frequentes:")
            for num, count in freq:
                cor = "🔴" if num in [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] else "⚫" if num != 0 else "🟢"
                print(f"      {cor} {num}: {count}x")
        
        ultimos = self.get_ultimos_10()
        if ultimos:
            print(f"\n   📋 Últimos 10:")
            linha = "   "
            for num in ultimos[-10:]:
                cor = "🔴" if num in [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] else "⚫" if num != 0 else "🟢"
                linha += f"{cor}{num} "
            print(linha)
        
        print("=" * 70)

# ========== FUNÇÃO PRINCIPAL ==========
def testar_scraper():
    """Testa o scraper com uma URL do iframe"""
    scraper = EvolutionIframeScraper()
    
    print("=" * 70)
    print("🎰 SCRAPER DO IFRAME EVOLUTION")
    print("=" * 70)
    print("\n📌 Como funciona:")
    print("   1. O scraper acessa o iframe")
    print("   2. Extrai os números do HTML")
    print("   3. Mantém histórico de 500 números")
    print("   4. Mostra estatísticas em tempo real")
    
    # Exemplo de HTML (você pode substituir com o HTML real)
    html_exemplo = """
    <div class="BUsVvX wZb192">
        <div data-role="number-2" class="statisticsBranding_black">2</div>
        <div data-role="number-10" class="statisticsBranding_black">10</div>
        <div data-role="number-19" class="statisticsBranding_red">19</div>
        <div data-role="number-9" class="statisticsBranding_red">9</div>
        <div data-role="number-8" class="statisticsBranding_black">8</div>
        <div data-role="number-18" class="statisticsBranding_red">18</div>
        <div data-role="number-1" class="statisticsBranding_red">1</div>
        <div data-role="number-30" class="statisticsBranding_red">30</div>
        <div data-role="number-3" class="statisticsBranding_red">3</div>
        <div data-role="number-31" class="statisticsBranding_black">31</div>
    </div>
    """
    
    print("\n🔍 Extraindo números do HTML de exemplo...")
    numeros = scraper.extrair_numeros_do_html(html_exemplo)
    scraper.processar_numeros(numeros)
    scraper.mostrar_status()
    
    print("\n" + "=" * 70)
    print("✅ Teste concluído!")
    print("=" * 70)

if __name__ == "__main__":
    testar_scraper()
