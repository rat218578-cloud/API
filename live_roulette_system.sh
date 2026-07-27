#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🎰 SISTEMA COMPLETO - RODADAS AO VIVO + 500 HISTÓRICO"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. CRIA TABELA NO BANCO ==========
cat > create_roulette_table.sql << 'SQLEOF'
-- Tabela para armazenar rodadas da roleta
CREATE TABLE IF NOT EXISTS roulette_spins (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(100) NOT NULL,
    number INTEGER NOT NULL,
    color VARCHAR(10) NOT NULL,
    parity VARCHAR(10) NOT NULL,
    range VARCHAR(20) NOT NULL,
    dozen VARCHAR(20) NOT NULL,
    column_pos VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB,
    table_id VARCHAR(50)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_roulette_spins_timestamp ON roulette_spins(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_spins_number ON roulette_spins(number);
CREATE INDEX IF NOT EXISTS idx_roulette_spins_game_id ON roulette_spins(game_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

ALTER TABLE roulette_spins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS update_roulette_spins_updated_at ON roulette_spins;
CREATE TRIGGER update_roulette_spins_updated_at
    BEFORE UPDATE ON roulette_spins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
SQLEOF

echo "✅ SQL da tabela criado!"

# ========== 2. CRIA MODELO ROULETTE ==========
cat > roulette_model.py << 'PYEOF'
import json
from datetime import datetime
from db import db
import logging

logger = logging.getLogger(__name__)

class RouletteSpin:
    def __init__(self, number: int, game_id: str = None, raw_data: dict = None):
        self.number = number
        self.game_id = game_id
        self.raw_data = raw_data
        self.color = self.get_color()
        self.parity = self.get_parity()
        self.range = self.get_range()
        self.dozen = self.get_dozen()
        self.column = self.get_column()
        self.timestamp = datetime.now()
        
    def get_color(self) -> str:
        red_numbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
        if self.number == 0:
            return "green"
        return "red" if self.number in red_numbers else "black"
    
    def get_parity(self) -> str:
        if self.number == 0:
            return "zero"
        return "even" if self.number % 2 == 0 else "odd"
    
    def get_range(self) -> str:
        if self.number == 0:
            return "zero"
        return "low" if self.number <= 18 else "high"
    
    def get_dozen(self) -> str:
        if self.number == 0:
            return "zero"
        elif self.number <= 12:
            return "first"
        elif self.number <= 24:
            return "second"
        else:
            return "third"
    
    def get_column(self) -> str:
        if self.number == 0:
            return "zero"
        elif self.number % 3 == 1:
            return "first"
        elif self.number % 3 == 2:
            return "second"
        else:
            return "third"
    
    def to_dict(self) -> dict:
        return {
            'number': self.number,
            'color': self.color,
            'parity': self.parity,
            'range': self.range,
            'dozen': self.dozen,
            'column': self.column,
            'game_id': self.game_id,
            'timestamp': self.timestamp.isoformat(),
            'raw_data': self.raw_data
        }
    
    def save(self) -> bool:
        """Salva a rodada no banco de dados"""
        try:
            if db is None:
                return False
            
            query = """
                INSERT INTO roulette_spins (
                    number, color, parity, range, dozen, column_pos,
                    game_id, timestamp, raw_data
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            db.execute(query, (
                self.number,
                self.color,
                self.parity,
                self.range,
                self.dozen,
                self.column,
                self.game_id,
                self.timestamp,
                json.dumps(self.raw_data) if self.raw_data else None
            ))
            
            logger.info(f"✅ Rodada {self.number} salva no banco")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao salvar rodada: {e}")
            return False

class RouletteHistory:
    @staticmethod
    def get_last_spins(limit: int = 500, table_id: str = None) -> list:
        """Busca as últimas rodadas do banco"""
        try:
            if db is None:
                return []
            
            query = """
                SELECT * FROM roulette_spins 
                WHERE (%s IS NULL OR table_id = %s)
                ORDER BY timestamp DESC 
                LIMIT %s
            """
            
            result = db.execute(query, (table_id, table_id, limit))
            return result if result else []
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar histórico: {e}")
            return []
    
    @staticmethod
    def get_statistics(limit: int = 100) -> dict:
        """Retorna estatísticas das rodadas"""
        try:
            if db is None:
                return {}
            
            # Últimos números
            query = """
                SELECT number, color, timestamp 
                FROM roulette_spins 
                ORDER BY timestamp DESC 
                LIMIT %s
            """
            last = db.execute(query, (limit,))
            
            # Frequência por número
            query = """
                SELECT number, COUNT(*) as count 
                FROM roulette_spins 
                GROUP BY number 
                ORDER BY count DESC 
                LIMIT 10
            """
            frequency = db.execute(query)
            
            # Estatísticas por cor
            query = """
                SELECT color, COUNT(*) as count 
                FROM roulette_spins 
                GROUP BY color
            """
            colors = db.execute(query)
            
            return {
                'total': len(last) if last else 0,
                'last': last[:10] if last else [],
                'frequency': frequency if frequency else [],
                'colors': colors if colors else []
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao buscar estatísticas: {e}")
            return {}

PYEOF

echo "✅ roulette_model.py criado!"

# ========== 3. CRIA WEBSOCKET COM SALVAMENTO ==========
cat > live_roulette_ws.py << 'PYEOF'
#!/usr/bin/env python3
"""
🎰 LIVE ROULETTE - NÚMEROS AO VIVO + 500 RODADAS
"""

import json
import time
import hashlib
import base64
import secrets
import re
import ssl
import threading
import logging
from datetime import datetime
from typing import Optional, List, Dict
import websocket

from roulette_model import RouletteSpin, RouletteHistory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========== CONFIGURAÇÕES ==========
SITE_KEY = "0x4AAAAAAADmr68KUqpnEKo-9"
SECRET_KEY = "0x4AAAAAAADmr62kWZNpTLxzKtYOYbpw7wzY"
API_BASE = "https://sortenabet.bet.br"

EMAIL = "gcriste268@gmail.com"
PASSWORD = "284050"

# ========== VARIÁVEIS ==========
access_token = None
evo_session_id = None
ultimos_numeros: List[Dict] = []
historico_numeros: List[Dict] = []
ws_connected = False
session = requests.Session()

# ========== FUNÇÕES ==========

def gerar_token_turnstile():
    timestamp = int(time.time())
    nonce = secrets.token_hex(16)

    payload = {
        "sitekey": SITE_KEY,
        "timestamp": timestamp,
        "nonce": nonce,
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "action": "login",
        "cdata": ""
    }

    payload_json = json.dumps(payload, separators=(',', ':'))
    payload_b64 = base64.b64encode(payload_json.encode()).decode()

    signature = hashlib.sha256(
        f"{payload_b64}.{SECRET_KEY}".encode()
    ).hexdigest()[:32]

    final_hash = hashlib.sha256(
        f"{payload_b64}.{signature}".encode()
    ).hexdigest()

    return f"t2:1.{payload_b64}.{signature}.{final_hash}"

def fazer_login(email, password):
    global access_token, session
    
    logger.info(f"🔐 FAZENDO LOGIN...")
    logger.info(f"   📧 Email: {email}")
    
    captcha_token = gerar_token_turnstile()
    
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'Origin': 'https://sortenabet.bet.br',
        'Referer': 'https://sortenabet.bet.br/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    
    login_data = {
        "login": email,
        "email": email,
        "password": password,
        "app_source": "web",
        "captcha_token": captcha_token
    }

    try:
        response = session.post(
            f'{API_BASE}/api/auth/login',
            json=login_data,
            timeout=15
        )

        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access_token')
            
            if access_token:
                session.headers.update({
                    'Authorization': f'Bearer {access_token}'
                })
                logger.info(f"   ✅ Login bem-sucedido!")
                logger.info(f"   👤 Usuário: {data.get('user', {}).get('name', email)}")
                return True
        else:
            logger.error(f"   ❌ Falha: {response.status_code}")
            return False

    except Exception as e:
        logger.error(f"   ❌ Erro: {e}")
        return False

def obter_url_jogo(slug):
    global access_token, evo_session_id, session
    
    if not access_token:
        logger.error("   ❌ Sem token de acesso")
        return None

    try:
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={
                'slug': slug,
                'platform': 'WEB',
                'use_demo': 0,
                'source': 'watchIsAuthenticated'
            },
            timeout=15
        )

        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            
            if game_url:
                match = re.search(r'EVOSESSIONID=([^&]+)', game_url)
                if match:
                    evo_session_id = match.group(1)
                    logger.info(f"   🔑 EVOSESSIONID: {evo_session_id[:30]}...")
                    return game_url
            return None
        else:
            logger.error(f"   ❌ Status: {response.status_code}")
            return None

    except Exception as e:
        logger.error(f"   ❌ Erro: {e}")
        return None

def extrair_numero(data: dict) -> Optional[int]:
    """Extrai número do JSON da Evolution"""
    
    if data.get('type') == 'roulette.winSpots':
        args = data.get('args', {})
        result = args.get('result', [])
        if result and isinstance(result, list):
            for item in result:
                if isinstance(item, dict) and 'number' in item:
                    try:
                        return int(item['number'])
                    except:
                        pass
                elif isinstance(item, str):
                    try:
                        return int(item)
                    except:
                        pass
    
    if data.get('type') == 'roulette.tableState':
        args = data.get('args', {})
        if args.get('state') == 'GAME_RESOLVED':
            result = args.get('result', [])
            if result and len(result) > 0:
                try:
                    return int(result[0])
                except:
                    pass
    
    # Busca em qualquer lugar
    if isinstance(data, dict):
        def buscar_numero(obj):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if key == 'number' or key == 'result':
                        if isinstance(value, (int, str)):
                            try:
                                num = int(value)
                                if 0 <= num <= 36:
                                    return num
                            except:
                                pass
                    elif isinstance(value, (dict, list)):
                        result = buscar_numero(value)
                        if result is not None:
                            return result
            elif isinstance(obj, list):
                for item in obj:
                    result = buscar_numero(item)
                    if result is not None:
                        return result
            return None
        
        return buscar_numero(data)
    
    return None

def processar_numero(numero: int, game_id: str = None, raw_data: dict = None):
    """Processa e salva o número"""
    
    # Cria objeto Spin
    spin = RouletteSpin(numero, game_id, raw_data)
    
    # Salva no banco
    spin.save()
    
    # Adiciona ao histórico local
    historico_numeros.append(spin.to_dict())
    
    # Mantém últimos 500
    if len(historico_numeros) > 500:
        historico_numeros = historico_numeros[-500:]
    
    # Atualiza últimos números
    ultimos_numeros.insert(0, spin.to_dict())
    if len(ultimos_numeros) > 10:
        ultimos_numeros = ultimos_numeros[:10]
    
    # Mostra na tela
    color_emoji = "🔴" if spin.color == "red" else "⚫" if spin.color == "black" else "🟢"
    print(f"\n🎯 {spin.timestamp.strftime('%H:%M:%S')} - NÚMERO {numero} {color_emoji} {spin.color.upper()}")
    print(f"   📊 {spin.parity.upper()} | {spin.range.upper()} | {spin.dozen.upper()} | COL {spin.column.upper()}")
    print(f"   📈 Total no banco: {len(historico_numeros)}")

def on_message(ws, message):
    try:
        data = json.loads(message)
        
        # Extrai game_id
        game_id = data.get('id', '').split('-')[0] if 'id' in data else None
        
        # Extrai número
        numero = extrair_numero(data)
        
        if numero is not None and 0 <= numero <= 36:
            processar_numero(numero, game_id, data)
        
    except json.JSONDecodeError:
        pass
    except Exception as e:
        logger.error(f"   ⚠️ Erro: {e}")

def on_error(ws, error):
    logger.error(f"   ❌ WebSocket Error: {error}")

def on_close(ws, close_status_code, close_msg):
    global ws_connected
    ws_connected = False
    logger.info(f"\n🔌 WebSocket fechado: {close_status_code}")

def on_open(ws):
    global ws_connected
    ws_connected = True
    print(f"\n✅ WebSocket CONECTADO!")
    print(f"📡 Aguardando números AO VIVO...")
    
    # Mostra histórico do banco
    history = RouletteHistory.get_last_spins(10)
    if history:
        print(f"\n📊 ÚLTIMAS {len(history)} RODADAS DO BANCO:")
        for spin in history:
            color_emoji = "🔴" if spin['color'] == 'red' else "⚫" if spin['color'] == 'black' else "🟢"
            print(f"   {spin['timestamp'].strftime('%H:%M:%S') if hasattr(spin['timestamp'], 'strftime') else spin['timestamp']} - {color_emoji} {spin['number']}")
    
    print(f"\n📡 Aguardando novos números...\n")

def conectar_websocket(session_id):
    global ws_connected
    
    if not session_id:
        logger.error("   ❌ Sem EVOSESSIONID")
        return None
    
    url = f"wss://ws-evolution.sortenabet.bet.br/ws?messageFormat=json&EVOSESSIONID={session_id}&client_version=6.20260724.73611.63604-633bb6d1d6-r2"
    
    logger.info(f"\n🔌 CONECTANDO WEBSOCKET...")
    
    try:
        ws = websocket.WebSocketApp(
            url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        
        wst = threading.Thread(target=ws.run_forever, kwargs={
            'sslopt': {'cert_reqs': ssl.CERT_NONE}
        })
        wst.daemon = True
        wst.start()
        
        time.sleep(2)
        
        if ws_connected:
            return ws
        else:
            return None
            
    except Exception as e:
        logger.error(f"   ❌ Erro: {e}")
        return None

def mostrar_estatisticas():
    """Mostra estatísticas das rodadas"""
    stats = RouletteHistory.get_statistics(100)
    
    print("\n" + "=" * 70)
    print("📊 ESTATÍSTICAS DAS RODADAS")
    print("=" * 70)
    
    print(f"\n📈 Total de rodadas: {stats.get('total', 0)}")
    
    # Últimos números
    last = stats.get('last', [])
    if last:
        print("\n🔢 ÚLTIMOS NÚMEROS:")
        for spin in last:
            color_emoji = "🔴" if spin['color'] == 'red' else "⚫" if spin['color'] == 'black' else "🟢"
            print(f"   {color_emoji} {spin['number']}")
    
    # Frequência
    freq = stats.get('frequency', [])
    if freq:
        print("\n📊 NÚMEROS MAIS FREQUENTES:")
        for item in freq:
            print(f"   {item['number']}: {item['count']}x")
    
    # Cores
    colors = stats.get('colors', [])
    if colors:
        print("\n🎨 DISTRIBUIÇÃO POR COR:")
        for item in colors:
            emoji = "🔴" if item['color'] == 'red' else "⚫" if item['color'] == 'black' else "🟢"
            print(f"   {emoji} {item['color']}: {item['count']}x")

def main():
    print("=" * 70)
    print("🎰 LIVE ROULETTE - NÚMEROS AO VIVO + 500 RODADAS")
    print("=" * 70)
    print(f"\n👤 Email: {EMAIL}")
    
    # 1. Login
    if not fazer_login(EMAIL, PASSWORD):
        print("❌ Login falhou")
        return
    
    # 2. Obter URL do jogo
    slug = "evolution/lightning-roulette"
    url = obter_url_jogo(slug)
    
    if not url:
        print("\n❌ Não foi possível obter URL")
        return
    
    if not evo_session_id:
        print("\n❌ EVOSESSIONID não encontrado")
        return
    
    # 3. Conectar WebSocket
    ws = conectar_websocket(evo_session_id)
    
    if not ws_connected:
        print("\n❌ Falha ao conectar WebSocket")
        return
    
    # 4. Loop principal
    print("\n" + "=" * 70)
    print("📡 OUVINDO NÚMEROS AO VIVO...")
    print("=" * 70)
    print("\n   Comandos:")
    print("   - Ctrl+C: Sair")
    print("   - 's': Mostrar estatísticas")
    print("   - 'h': Mostrar histórico")
    print("   - 'q': Sair\n")
    
    try:
        while True:
            cmd = input("\n👉 Comando: ").strip().lower()
            
            if cmd == 's':
                mostrar_estatisticas()
            elif cmd == 'h':
                history = RouletteHistory.get_last_spins(20)
                if history:
                    print("\n📋 HISTÓRICO (últimas 20):")
                    for i, spin in enumerate(history, 1):
                        color_emoji = "🔴" if spin['color'] == 'red' else "⚫" if spin['color'] == 'black' else "🟢"
                        ts = spin['timestamp'].strftime('%H:%M:%S') if hasattr(spin['timestamp'], 'strftime') else spin['timestamp']
                        print(f"   {i:2}. {ts} - {color_emoji} {spin['number']}")
            elif cmd == 'q':
                break
            else:
                print("   Comandos: s=estatísticas, h=histórico, q=sair")
                
    except KeyboardInterrupt:
        print("\n\n⏹️ PARANDO...")
    
    # Fecha WebSocket
    if ws:
        ws.close()
    
    print(f"\n📊 RESULTADO FINAL:")
    print(f"   Total de números coletados: {len(historico_numeros)}")
    mostrar_estatisticas()

if __name__ == "__main__":
    try:
        from db import db
        if db is None:
            print("⚠️ Banco de dados não disponível!")
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Saindo...")
PYEOF

echo "✅ live_roulette_ws.py criado!"

echo "═══════════════════════════════════════════════════════════════"
echo "✅ SISTEMA COMPLETO CRIADO!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📦 Faça o commit e push:"
echo ""
echo "git add ."
echo "git commit -m \"feat: sistema completo de rodadas ao vivo + 500 histórico\""
echo "git push origin main"
echo ""
echo "🚀 PARA TESTAR:"
echo "   python3 live_roulette_ws.py"
echo ""
echo "📋 COMANDOS:"
echo "   s - Estatísticas"
echo "   h - Histórico (últimas 20)"
echo "   q - Sair"
echo ""
echo "✅ O que o sistema faz:"
echo "   1. Conecta WebSocket da Evolution"
echo "   2. Pega números AO VIVO"
echo "   3. Salva no banco de dados"
echo "   4. Mantém 500+ rodadas"
echo "   5. Mostra estatísticas em tempo real"
echo "═══════════════════════════════════════════════════════════════"

