#!/usr/bin/env python3
import json, time, ssl, threading, sys
import websocket
from datetime import datetime
from collections import Counter

EVO_SESSION_ID = sys.argv[1] if len(sys.argv) > 1 else None
historico_numeros = []
ultimos_numeros = []
ws_connected = False

def extrair_numero(data):
    if data.get('type') == 'roulette.winSpots':
        args = data.get('args', {})
        result = args.get('result', [])
        if result:
            for item in result:
                if isinstance(item, dict) and 'number' in item:
                    try:
                        return int(item['number'])
                    except:
                        pass
    if data.get('type') == 'roulette.tableState':
        args = data.get('args', {})
        if args.get('state') == 'GAME_RESOLVED':
            result = args.get('result', [])
            if result:
                try:
                    return int(result[0])
                except:
                    pass
    def buscar(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key in ['number', 'result']:
                    try:
                        num = int(value)
                        if 0 <= num <= 36:
                            return num
                    except:
                        pass
                result = buscar(value)
                if result is not None:
                    return result
        elif isinstance(obj, list):
            for item in obj:
                result = buscar(item)
                if result is not None:
                    return result
        return None
    return buscar(data)

def on_message(ws, message):
    try:
        data = json.loads(message)
        numero = extrair_numero(data)
        if numero is not None and 0 <= numero <= 36:
            timestamp = datetime.now().strftime("%H:%M:%S")
            historico_numeros.append({'number': numero, 'timestamp': timestamp})
            ultimos_numeros.insert(0, numero)
            if len(ultimos_numeros) > 10:
                ultimos_numeros = ultimos_numeros[:10]
            print(f"\n🎯 {timestamp} - NÚMERO {numero}")
            print(f"   📊 Total: {len(historico_numeros)} números")
            if ultimos_numeros:
                print(f"   📋 Últimos: {ultimos_numeros[:5]}")
    except:
        pass

def on_open(ws):
    global ws_connected
    ws_connected = True
    print("\n✅ WebSocket CONECTADO!")
    print("📡 Aguardando números AO VIVO...\n")

def main():
    if not EVO_SESSION_ID:
        print("❌ Use: python3 live_roulette_debug.py SEU_EVOSESSIONID")
        return
    print("=" * 60)
    print("🎰 ROLETA AO VIVO - DEBUG")
    print("=" * 60)
    print(f"🔑 EVOSESSIONID: {EVO_SESSION_ID[:30]}...")
    url = f"wss://ws-evolution.sortenabet.bet.br/ws?messageFormat=json&EVOSESSIONID={EVO_SESSION_ID}&client_version=6.20260724.73611.63604-633bb6d1d6-r2"
    ws = websocket.WebSocketApp(url, on_open=on_open, on_message=on_message)
    wst = threading.Thread(target=ws.run_forever, kwargs={'sslopt': {'cert_reqs': ssl.CERT_NONE}})
    wst.daemon = True
    wst.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n\n📊 Total: {len(historico_numeros)} números")
        ws.close()

if __name__ == "__main__":
    try:
        import websocket
        main()
    except ImportError:
        print("❌ pip install websocket-client")
