#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 ENVIANDO LIVE ROULETTE PARA O REPOSITÓRIO"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. ADICIONA O SCRIPT ==========
echo ""
echo "📁 Adicionando live_roulette_updater.py..."

# O script já foi criado, agora vamos adicionar ao git
git add live_roulette_updater.py

# ========== 2. ATUALIZA REQUIREMENTS.TXT ==========
echo ""
echo "📦 Atualizando requirements.txt..."

cat > requirements.txt << 'REQEOF'
flask==2.3.3
flask-cors==4.0.0
requests==2.31.0
psycopg2-binary==2.9.9
python-dotenv==1.0.0
websocket-client==1.7.0
REQEOF

git add requirements.txt

# ========== 3. CRIA ARQUIVO DE TESTE ==========
echo ""
echo "🧪 Criando test_websocket.py..."

cat > test_websocket.py << 'TESTOEF'
#!/usr/bin/env python3
"""
🧪 TESTE RÁPIDO DO WEBSOCKET
Uso: python3 test_websocket.py
"""

import json
import time
import ssl
import websocket

# ========== CONFIG ==========
EVO_SESSION_ID = "tztnmffxax4bftiot6se7jftwwnmpam4137a381e"

def on_message(ws, message):
    try:
        data = json.loads(message)
        
        # Procura por número
        if 'args' in data:
            args = data['args']
            if 'result' in args:
                result = args['result']
                if result and len(result) > 0:
                    print(f"🎯 NÚMERO: {result[0]}")
            
            if 'number' in args:
                print(f"🎯 NÚMERO: {args['number']}")
                
    except Exception as e:
        pass

def on_error(ws, error):
    print(f"❌ Erro: {error}")

def on_close(ws, close_status_code, close_msg):
    print("🔌 WebSocket fechado")

def on_open(ws):
    print("✅ WebSocket CONECTADO!")
    print("📡 Aguardando números...\n")

def main():
    print("=" * 60)
    print("🧪 TESTE WEBSOCKET EVOLUTION")
    print("=" * 60)
    print(f"🔑 Session ID: {EVO_SESSION_ID[:30]}...")
    
    url = f"wss://ws-evolution.sortenabet.bet.br/ws?messageFormat=json&EVOSESSIONID={EVO_SESSION_ID}&client_version=6.20260724.73611.63604-633bb6d1d6-r2"
    
    ws = websocket.WebSocketApp(
        url,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )
    
    ws.run_forever(sslopt={'cert_reqs': ssl.CERT_NONE})

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Saindo...")
TESTOEF

git add test_websocket.py

# ========== 4. COMMIT E PUSH ==========
echo ""
echo "📤 Fazendo commit e push..."

git commit -m "feat: adiciona atualizador de roleta ao vivo via WebSocket

- live_roulette_updater.py: Atualiza Catálogo, Grupos, Assertividade
- test_websocket.py: Teste rápido do WebSocket
- Atualiza requirements.txt com websocket-client"

git push origin main

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ ENVIADO COM SUCESSO!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📋 ARQUIVOS ENVIADOS:"
echo "   ✅ live_roulette_updater.py"
echo "   ✅ test_websocket.py"
echo "   ✅ requirements.txt"
echo ""
echo "🚀 PARA TESTAR NO SERVIDOR:"
echo ""
echo "   # 1. Entra no servidor"
echo "   ssh seu_servidor"
echo ""
echo "   # 2. Puxa as atualizações"
echo "   git pull origin main"
echo ""
echo "   # 3. Instala dependências"
echo "   pip install websocket-client"
echo ""
echo "   # 4. Roda o teste"
echo "   python3 test_websocket.py"
echo ""
echo "   # 5. Roda o atualizador"
echo "   python3 live_roulette_updater.py"
echo ""
echo "🔑 Lembre-se de ter o EVOSESSIONID da roleta aberta!"
echo "═══════════════════════════════════════════════════════════════"

