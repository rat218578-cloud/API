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
