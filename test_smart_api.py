#!/usr/bin/env python3
"""
🧪 TESTE DA API SMART ANALISE
"""

import time
import json
from smart_api_service import smart_api

print("=" * 80)
print("🧪 TESTE API SMART ANALISE")
print("=" * 80)

# Email do usuário
email = input("\n📧 Digite seu email: ").strip()

if not email:
    print("❌ Email não pode ficar vazio!")
    exit(1)

# Configurar
smart_api.set_email(email)

print(f"\n🔍 Buscando números para {email}...")

# Buscar números
numeros = smart_api.fetch_numbers()

if numeros:
    print(f"\n✅ Encontrados {len(numeros)} números!")
    
    print("\n📊 ÚLTIMOS NÚMEROS:")
    for i, item in enumerate(numeros[:10], 1):
        print(f"   {i}. {item['number']} - {item['timestamp']}")
    
    # Estatísticas
    stats = smart_api.get_statistics()
    print(f"\n📈 ESTATÍSTICAS:")
    print(f"   Total: {stats.get('total', 0)}")
    print(f"   🔴 Vermelho: {stats.get('colors', {}).get('red', 0)}")
    print(f"   ⚫ Preto: {stats.get('colors', {}).get('black', 0)}")
    print(f"   🟢 Verde: {stats.get('colors', {}).get('green', 0)}")
    
    if stats.get('most_frequent'):
        print(f"\n   🔥 Mais frequentes:")
        for num, count in stats['most_frequent']:
            print(f"      {num}: {count}x")
    
    print(f"\n📋 Últimos 10 números:")
    print(f"   {stats.get('last_numbers', [])}")
    
else:
    print("❌ Nenhum número encontrado!")
    print("\n💡 Dicas:")
    print("   1. Verifique se o email está correto")
    print("   2. Aguarde alguns minutos e tente novamente")
    print("   3. A API pode estar temporariamente indisponível")

print("\n" + "=" * 80)
