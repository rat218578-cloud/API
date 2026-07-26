#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🎯 WEBSOCKET EVOLUTION - NÚMEROS AO VIVO"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. INSTALA DEPENDÊNCIAS ==========
cat > requirements.txt << 'REQEOF'
flask==2.3.3
flask-cors==4.0.0
requests==2.31.0
psycopg2-binary==2.9.9
python-dotenv==1.0.0
websocket-client==1.7.0
REQEOF

echo "✅ requirements.txt atualizado com websocket-client!"

# ========== 2. CRIA SERVICO WEBSOCKET ==========
cat > websocket_service.py << 'WSEOF'
import json
import logging
import threading
import time
from datetime import datetime
import websocket
import ssl

logger = logging.getLogger(__name__)

class EvolutionWebSocket:
    def __init__(self):
        self.ws = None
        self.connected = False
        self.session_id = None
        self.last_numbers = []
        self.history = []
        self.callbacks = []
        self.running = False
        self.thread = None
        
    def set_session_id(self, session_id: str):
        """Define o EVOSESSIONID da Evolution"""
        self.session_id = session_id
        logger.info(f"🔑 Session ID definido: {session_id[:20]}...")

    def get_websocket_url(self) -> str:
        """Monta a URL do WebSocket"""
        if not self.session_id:
            raise ValueError("EVOSESSIONID não definido!")
        
        # URL do WebSocket da Evolution
        return f"wss://ws-evolution.sortenabet.bet.br/ws?messageFormat=json&EVOSESSIONID={self.session_id}&client_version=6.20260724.73611.63604-633bb6d1d6-r2"

    def on_message(self, ws, message):
        """Processa mensagem recebida"""
        try:
            data = json.loads(message)
            logger.info(f"📩 Mensagem recebida: {data.get('type', 'unknown')}")
            
            # Procura por números da roleta
            if 'data' in data:
                game_data = data.get('data', {})
                
                # Verifica se tem número da roleta
                number = game_data.get('number')
                if number is not None:
                    self.process_number(number, game_data)
                    
                # Verifica se tem histórico de números
                history = game_data.get('history', [])
                if history:
                    for item in history:
                        if 'number' in item:
                            self.process_number(item['number'], item)
                            
                # Verifica se tem últimos números
                last_numbers = game_data.get('lastNumbers', [])
                if last_numbers:
                    for num in last_numbers:
                        self.process_number(num, {'number': num})
            
            # Procura por números em qualquer lugar
            self.extract_numbers_from_data(data)
            
        except json.JSONDecodeError:
            logger.warning(f"⚠️ JSON inválido: {message[:100]}...")
        except Exception as e:
            logger.error(f"❌ Erro ao processar mensagem: {e}")

    def extract_numbers_from_data(self, data):
        """Extrai números de qualquer lugar do JSON"""
        if isinstance(data, dict):
            # Procura números em campos comuns
            for key in ['number', 'result', 'winningNumber', 'lastNumber']:
                if key in data and isinstance(data[key], (int, str)):
                    try:
                        num = int(data[key])
                        if 0 <= num <= 36:
                            self.process_number(num, {key: num})
                    except:
                        pass
            
            # Procura em listas
            for key in ['numbers', 'results', 'history', 'spins']:
                if key in data and isinstance(data[key], list):
                    for item in data[key]:
                        if isinstance(item, (int, str)):
                            try:
                                num = int(item)
                                if 0 <= num <= 36:
                                    self.process_number(num, {key: num})
                            except:
                                pass
                        elif isinstance(item, dict):
                            self.extract_numbers_from_data(item)
        
        elif isinstance(data, list):
            for item in data:
                self.extract_numbers_from_data(item)

    def process_number(self, number: int, raw_data: dict):
        """Processa um número recebido"""
        timestamp = datetime.now().isoformat()
        
        # Calcula cor
        red_numbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
        color = "red" if number in red_numbers else "black" if number != 0 else "green"
        
        number_data = {
            'number': number,
            'color': color,
            'timestamp': timestamp,
            'raw': raw_data
        }
        
        # Adiciona ao histórico
        self.history.append(number_data)
        
        # Mantém apenas os últimos 500 números
        if len(self.history) > 500:
            self.history = self.history[-500:]
        
        # Atualiza últimos números
        self.last_numbers.insert(0, number)
        if len(self.last_numbers) > 10:
            self.last_numbers = self.last_numbers[:10]
        
        logger.info(f"🎯 Número AO VIVO: {number} ({color}) - Total: {len(self.history)}")
        
        # Notifica callbacks
        for callback in self.callbacks:
            try:
                callback(number_data)
            except Exception as e:
                logger.error(f"❌ Erro no callback: {e}")

    def on_error(self, ws, error):
        logger.error(f"❌ WebSocket error: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        self.connected = False
        logger.info(f"🔌 WebSocket fechado: {close_status_code} - {close_msg}")
        
        # Tenta reconectar após 5 segundos
        if self.running:
            logger.info("🔄 Tentando reconectar em 5 segundos...")
            time.sleep(5)
            self.connect()

    def on_open(self, ws):
        self.connected = True
        logger.info("✅ WebSocket conectado com sucesso!")
        
        # Envia mensagem de ping inicial
        ping_msg = json.dumps({
            "type": "ping",
            "timestamp": int(time.time() * 1000)
        })
        ws.send(ping_msg)

    def connect(self):
        """Conecta ao WebSocket"""
        if not self.session_id:
            logger.error("❌ EVOSESSIONID não definido!")
            return False
        
        url = self.get_websocket_url()
        logger.info(f"🌐 Conectando ao WebSocket: {url[:80]}...")
        
        try:
            self.ws = websocket.WebSocketApp(
                url,
                on_open=self.on_open,
                on_message=self.on_message,
                on_error=self.on_error,
                on_close=self.on_close
            )
            
            # Executa em thread separada
            self.thread = threading.Thread(target=self.ws.run_forever, kwargs={
                'sslopt': {'cert_reqs': ssl.CERT_NONE}
            })
            self.thread.daemon = True
            self.thread.start()
            
            self.running = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao conectar: {e}")
            return False

    def disconnect(self):
        """Desconecta do WebSocket"""
        self.running = False
        if self.ws:
            self.ws.close()
        self.connected = False
        logger.info("🔌 Desconectado do WebSocket")

    def get_history(self, limit: int = 500) -> list:
        """Retorna o histórico de números"""
        return self.history[-limit:] if self.history else []

    def get_last_numbers(self, count: int = 10) -> list:
        """Retorna os últimos números"""
        return self.last_numbers[:count]

    def add_callback(self, callback):
        """Adiciona um callback para receber números AO VIVO"""
        self.callbacks.append(callback)

    def remove_callback(self, callback):
        """Remove um callback"""
        if callback in self.callbacks:
            self.callbacks.remove(callback)

# Instância global
evolution_ws = EvolutionWebSocket()
WSEOF

echo "✅ websocket_service.py criado!"

# ========== 3. ATUALIZA API_SERVER.PY ==========
cat > api_server.py << 'APIOEF'
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import logging
import os
import json
from datetime import datetime

try:
    from db import db
except Exception as e:
    print(f"⚠️ Erro ao importar db: {e}")
    db = None

from jwt_helper import jwt_manager
from session_service import session_service
from middleware import require_auth, optional_auth
from websocket_service import evolution_ws

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

API_BASE = "https://sortenabet.bet.br"

session = requests.Session()
session.headers.update({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://sortenabet.bet.br',
    'Referer': 'https://sortenabet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})

# ========== ROTA DE LOGIN ==========
@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.json
        email = data.get('login') or data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email e senha são obrigatórios'}), 400
        
        print(f"🔐 Tentando login para: {email}")
        
        login_data = {
            "login": email,
            "email": email,
            "password": password,
            "app_source": "web"
        }
        
        response = session.post(f'{API_BASE}/api/auth/login', json=login_data, timeout=15)
        print(f"📥 Status login: {response.status_code}")
        
        if response.status_code != 200:
            return jsonify({'error': 'Credenciais inválidas'}), 401
        
        result = response.json()
        access_token_externo = result.get('access_token')
        
        if not access_token_externo:
            return jsonify({'error': 'Token não retornado'}), 500
        
        session.headers.update({'Authorization': f'Bearer {access_token_externo}'})
        
        user_id = str(result.get('user', {}).get('id', email))
        
        jwt_token = jwt_manager.generate_token(user_id, email)
        refresh_token = jwt_manager.generate_refresh_token(user_id, email)
        
        if db:
            session_service.create_session(user_id, email, password, jwt_token, refresh_token)
        
        return jsonify({
            'access_token': jwt_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': 7 * 24 * 60 * 60,
            'user': {
                'id': user_id,
                'name': result.get('user', {}).get('name', email.split('@')[0]),
                'email': email,
                'plan': 'pro'
            }
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Erro no login: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA START-GAME COM WEBSOCKET ==========
@app.route('/api/start-game-v2', methods=['GET'])
@require_auth
def api_start_game():
    try:
        slug = request.args.get('slug')
        print(f"🎮 Gerando link para: {slug}")
        
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        auth_header = session.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token não encontrado'}), 401
        
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
        
        print(f"📥 Status start-game: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            
            if game_url:
                # Extrai EVOSESSIONID da URL
                import re
                match = re.search(r'EVOSESSIONID=([^&]+)', game_url)
                if match:
                    evo_session_id = match.group(1)
                    print(f"🔑 EVOSESSIONID extraído: {evo_session_id[:20]}...")
                    
                    # Conecta WebSocket
                    evolution_ws.set_session_id(evo_session_id)
                    evolution_ws.connect()
                
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': game_url,
                    'iframe_url': game_url,
                    'evo_session_id': evo_session_id if 'evo_session_id' in locals() else None
                })
        
        return jsonify({
            'success': False,
            'error': 'Não foi possível gerar o link'
        }), 404
        
    except Exception as e:
        logger.error(f"❌ Erro: {e}")
        return jsonify({'error': str(e)}), 500

# ========== ROTA PARA PEGAR NÚMEROS AO VIVO ==========
@app.route('/api/roulette/live', methods=['GET'])
@require_auth
def get_live_numbers():
    """Retorna os números AO VIVO do WebSocket"""
    try:
        limit = int(request.args.get('limit', 500))
        history = evolution_ws.get_history(limit)
        last_numbers = evolution_ws.get_last_numbers(10)
        
        return jsonify({
            'success': True,
            'connected': evolution_ws.connected,
            'total': len(history),
            'last_numbers': last_numbers,
            'history': history,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== ROTA DE STATUS DO WEBSOCKET ==========
@app.route('/api/roulette/status', methods=['GET'])
@require_auth
def get_ws_status():
    """Retorna status do WebSocket"""
    return jsonify({
        'connected': evolution_ws.connected,
        'session_id': bool(evolution_ws.session_id),
        'history_count': len(evolution_ws.history),
        'last_numbers': evolution_ws.get_last_numbers(5)
    }), 200

# ========== ROTA DE REFRESH ==========
@app.route('/api/auth/refresh', methods=['POST'])
def api_refresh():
    try:
        data = request.json
        refresh_token = data.get('refresh_token')
        if not refresh_token:
            return jsonify({'error': 'Refresh token não fornecido'}), 400
        result = session_service.refresh_access_token(refresh_token)
        if not result:
            return jsonify({'error': 'Refresh token inválido'}), 401
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def api_me():
    return jsonify({
        'user_id': request.user_id,
        'email': request.user_email,
        'session': {
            'expires_at': request.session_data.get('expires_at'),
            'is_active': request.session_data.get('is_active')
        }
    }), 200

@app.route('/api/auth/validate', methods=['GET'])
@require_auth
def api_validate():
    return jsonify({
        'valid': True,
        'user_id': request.user_id,
        'email': request.user_email,
        'expires_at': request.session_data.get('expires_at')
    }), 200

@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def api_logout():
    evolution_ws.disconnect()
    if db:
        session_service.deactivate_session(request.user_id)
    return jsonify({'success': True}), 200

@app.route('/api/public/info', methods=['GET'])
@optional_auth
def public_info():
    user_info = None
    if hasattr(request, 'user_id'):
        user_info = {'user_id': request.user_id, 'email': request.user_email}
    return jsonify({'message': 'Rota pública', 'authenticated': user_info is not None, 'user': user_info}), 200

@app.before_request
def cleanup_expired_sessions():
    if db:
        session_service.cleanup_expired()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    if path and os.path.exists(os.path.join('dist', path)):
        return send_from_directory('dist', path)
    return send_from_directory('dist', 'index.html')

if __name__ == '__main__':
    print("=" * 70)
    print("🎯 API PROXY - QA.AI")
    print("=" * 70)
    print("📡 API Base:", API_BASE)
    print("🗄️  Banco: NeonDB (PostgreSQL)")
    print("🛡️  Auth: JWT + Refresh Token")
    print("🔌 WebSocket: Evolution AO VIVO")
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    if db:
        session_service.cleanup_expired()
    
    app.run(host='0.0.0.0', port=5000, debug=False)
APIOEF

echo "✅ api_server.py atualizado com WebSocket!"

# ========== 4. ATUALIZA GAMELINKSERVICE ==========
cat > src/services/gameLinkService.ts << 'GAMEOEF'
// ========== ROLETAS EVOLUTION ==========
export const ROLETAS = [
  { 
    id: 'lightning', 
    nome: '⚡ Lightning', 
    slug: 'evolution/lightning-roulette',
    gameId: 'LightningTable01',
    provedor: 'Evolution',
    cor: '#6C3CE1'
  },
  { 
    id: 'immersive', 
    nome: '🎥 Imersiva', 
    slug: 'evolution/immersive-roulette',
    gameId: 'ImmerRoulette0001',
    provedor: 'Evolution',
    cor: '#6C3CE1'
  },
  { 
    id: 'brasileira', 
    nome: '🇧🇷 Brasileira', 
    slug: 'evolution/brasileira',
    gameId: 'PorROULigh000001',
    provedor: 'Evolution',
    cor: '#6C3CE1'
  }
];

class GameLinkService {
  private static instance: GameLinkService;
  private gameUrls: Record<string, { url: string; timestamp: number }> = {};

  static getInstance(): GameLinkService {
    if (!GameLinkService.instance) {
      GameLinkService.instance = new GameLinkService();
    }
    return GameLinkService.instance;
  }

  async getGameUrl(slug: string): Promise<string | null> {
    console.log(`🎮 Gerando link para: ${slug}`);

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        console.error('❌ Token não encontrado');
        return null;
      }

      const response = await fetch(`/api/start-game-v2?slug=${slug}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      console.log(`📥 Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}: ${errorText}`);
        return null;
      }

      const data = await response.json();
      console.log('📦 Resposta:', data);

      const gameUrl = data.iframe_url || data.gameURL;
      if (gameUrl) {
        console.log(`✅ Link gerado para ${slug}`);
        return gameUrl;
      }

      return null;
    } catch (error) {
      console.error(`❌ Erro:`, error);
      return null;
    }
  }

  async getLiveNumbers(limit: number = 500): Promise<any> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;

      const response = await fetch(`/api/roulette/live?limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('❌ Erro ao buscar números ao vivo:', error);
      return null;
    }
  }

  async getWebSocketStatus(): Promise<any> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;

      const response = await fetch('/api/roulette/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('❌ Erro ao buscar status:', error);
      return null;
    }
  }

  forceRefresh(slug: string): void {
    delete this.gameUrls[slug];
    console.log(`🔄 Refresh forçado para ${slug}`);
  }

  clearAllCache(): void {
    this.gameUrls = {};
    console.log('🗑️ Todos os caches limpos');
  }
}

export const gameLinkService = GameLinkService.getInstance();
GAMEOEF

echo "✅ src/services/gameLinkService.ts atualizado!"

# ========== 5. CRIA HOOK PARA USAR NUMEROS AO VIVO ==========
cat > src/hooks/useLiveNumbers.ts << 'HOOKEOF'
import { useState, useEffect } from 'react';
import { gameLinkService } from '../services/gameLinkService';

interface LiveNumber {
  number: number;
  color: string;
  timestamp: string;
}

export function useLiveNumbers() {
  const [numbers, setNumbers] = useState<LiveNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveNumbers = async () => {
    try {
      const data = await gameLinkService.getLiveNumbers(500);
      if (data && data.success) {
        setNumbers(data.history || []);
        setConnected(data.connected || false);
        setError(null);
      }
    } catch (err) {
      setError('Erro ao buscar números ao vivo');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const status = await gameLinkService.getWebSocketStatus();
      if (status) {
        setConnected(status.connected || false);
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    }
  };

  useEffect(() => {
    fetchLiveNumbers();
    
    // Atualiza a cada 2 segundos
    const interval = setInterval(() => {
      fetchLiveNumbers();
      checkStatus();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    numbers,
    loading,
    connected,
    error,
    refresh: fetchLiveNumbers,
    lastNumber: numbers.length > 0 ? numbers[0] : null,
    lastTen: numbers.slice(0, 10),
    total: numbers.length
  };
}
HOOKEOF

echo "✅ src/hooks/useLiveNumbers.ts criado!"

echo "═══════════════════════════════════════════════════════════════"
echo "✅ WEBSOCKET EVOLUTION IMPLEMENTADO!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📦 Faça o commit e push:"
echo ""
echo "git add ."
echo "git commit -m \"feat: adiciona WebSocket Evolution para números ao vivo\""
echo "git push origin main"
echo ""
echo "🎯 O que foi adicionado:"
echo "  ✅ WebSocket Evolution (wss://)"
echo "  ✅ Extrai EVOSESSIONID automaticamente"
echo "  ✅ Salva últimos 500 números"
echo "  ✅ Rota /api/roulette/live"
echo "  ✅ Hook useLiveNumbers para React"
echo "  ✅ Atualização automática a cada 2 segundos"
echo ""
echo "🔄 Como funciona:"
echo "  1. Abre a roleta"
echo "  2. Extrai EVOSESSIONID da URL"
echo "  3. Conecta WebSocket"
echo "  4. Recebe números AO VIVO"
echo "  5. Salva histórico de 500 rodadas"
echo ""
echo "🚀 Depois do deploy, os números vão aparecer AO VIVO!"
echo "═══════════════════════════════════════════════════════════════"

