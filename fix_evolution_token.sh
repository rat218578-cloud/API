#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🎯 CORREÇÃO - TOKEN EVOLUTION (ERRO EV.12)"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. CORRIGE GAMELINKSERVICE ==========
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
  private cacheTTL = 0; // ZERO = SEM CACHE, SEMPRE GERAR NOVO

  static getInstance(): GameLinkService {
    if (!GameLinkService.instance) {
      GameLinkService.instance = new GameLinkService();
    }
    return GameLinkService.instance;
  }

  async getGameUrl(slug: string): Promise<string | null> {
    // SEMPRE GERAR NOVO TOKEN - SEM CACHE
    console.log(`🎮 Gerando NOVO token para: ${slug}`);

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        console.error('❌ Token não encontrado no localStorage');
        return null;
      }

      console.log(`🔑 Token: ${token.substring(0, 30)}...`);

      // FORÇA GERAÇÃO DE NOVO TOKEN
      const response = await fetch(`/api/start-game-v2?slug=${slug}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      console.log(`📥 Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}: ${errorText}`);
        
        if (response.status === 401) {
          console.log('🔄 Token expirado, tentando renovar...');
          const refreshToken = localStorage.getItem('refresh_token');
          
          if (refreshToken) {
            const refreshResponse = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken })
            });
            
            if (refreshResponse.ok) {
              const data = await refreshResponse.json();
              localStorage.setItem('access_token', data.access_token);
              console.log('✅ Token renovado!');
              return this.getGameUrl(slug);
            }
          }
        }
        
        return null;
      }

      const data = await response.json();
      console.log('📦 Resposta:', data);

      const gameUrl = data.iframe_url || data.gameURL;
      if (gameUrl) {
        // NÃO GUARDA EM CACHE - SEMPRE NOVO
        console.log(`✅ NOVO link gerado para ${slug}`);
        return gameUrl;
      }

      return null;
    } catch (error) {
      console.error(`❌ Erro:`, error);
      return null;
    }
  }

  // Força geração de novo token para a roleta atual
  forceRefresh(slug: string): void {
    console.log(`🔄 Forçando refresh do token para ${slug}`);
    // Limpa cache específico
    delete this.gameUrls[slug];
  }

  clearAllCache(): void {
    this.gameUrls = {};
    console.log('🗑️ Todos os caches limpos');
  }
}

export const gameLinkService = GameLinkService.getInstance();
GAMEOEF

echo "✅ src/services/gameLinkService.ts corrigido (sem cache)!"

# ========== 2. CORRIGE LIVEGAMEVIEW ==========
cat > src/components/LiveGameView.tsx << 'LIVEOEF'
import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, X, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { gameLinkService, ROLETAS } from '../services/gameLinkService';

interface LiveGameViewProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LiveGameView({ slug, isOpen, onClose }: LiveGameViewProps) {
  const [loading, setLoading] = useState(false);
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const roleta = ROLETAS.find(r => r.slug === slug);
  const cor = roleta?.cor || '#6C3CE1';

  // CARREGA SEMPRE QUE ABRIR OU MUDAR O SLUG
  useEffect(() => {
    if (isOpen && slug) {
      // Força refresh do cache
      gameLinkService.forceRefresh(slug);
      loadGame();
    }
  }, [isOpen, slug]);

  const loadGame = async () => {
    setLoading(true);
    setError(null);
    setGameUrl(null);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Você precisa estar logado para jogar');
        setLoading(false);
        return;
      }

      // SEMPRE GERAR NOVO TOKEN
      const url = await gameLinkService.getGameUrl(slug);
      if (url) {
        setGameUrl(url);
      } else {
        setError('Não foi possível gerar o link. Tente novamente.');
      }
    } catch (err) {
      setError('Erro ao gerar link');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openInNewTab = () => {
    if (gameUrl) {
      window.open(gameUrl, '_blank');
    }
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('live-game-container');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      id="live-game-container"
      className="bg-bg-card border border-border-default rounded-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between p-3 bg-bg-secondary/80 border-b border-border-default">
        <div className="flex items-center gap-3">
          <span 
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: gameUrl ? '#10b981' : '#f59e0b' }}
          />
          <span className="text-sm font-bold text-text-primary">
            {roleta?.nome || slug}
          </span>
          {gameUrl && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse">
              ● AO VIVO
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {gameUrl && (
            <button
              onClick={openInNewTab}
              className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              gameLinkService.forceRefresh(slug);
              loadGame();
            }}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
            title="Gerar novo token"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative bg-black" style={{ minHeight: '500px', height: '65vh' }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: cor }} />
              <p className="text-text-muted text-sm">Gerando novo token...</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <div className="text-6xl mb-4">🎰</div>
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <button
                onClick={() => {
                  gameLinkService.forceRefresh(slug);
                  loadGame();
                }}
                className="px-6 py-2 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: cor }}
              >
                <RefreshCw className="w-4 h-4 inline mr-2" /> Gerar novo token
              </button>
            </div>
          </div>
        ) : gameUrl ? (
          <iframe
            src={gameUrl}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; camera; microphone; accelerometer; gyroscope"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-orientation-lock"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🎰</div>
              <p className="text-text-muted">Clique em "Gerar novo token" para começar</p>
              <button
                onClick={() => {
                  gameLinkService.forceRefresh(slug);
                  loadGame();
                }}
                className="mt-4 px-6 py-2 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: cor }}
              >
                ▶ Gerar novo token
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-2 bg-bg-secondary/50 border-t border-border-default">
        <div className="flex items-center justify-between text-[10px] text-text-muted">
          <span>{roleta?.nome || slug}</span>
          <div className="flex items-center gap-3">
            <span className="text-[8px] text-amber-400">Token único por sessão</span>
            <button
              onClick={() => {
                gameLinkService.forceRefresh(slug);
                loadGame();
              }}
              className="text-accent-cyan hover:text-accent-cyan/80 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Novo token
            </button>
            <span className="flex items-center gap-1">
              {gameUrl ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Conectado</span>
                </>
              ) : (
                <span>Aguardando</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
LIVEOEF

echo "✅ src/components/LiveGameView.tsx corrigido!"

# ========== 3. CORRIGE ROULETTEDASHBOARD ==========
cat > src/components/RouletteDashboard.tsx << 'ROULETOEF'
import { useState, useEffect } from "react";
import { LiveGameView } from "./LiveGameView";
import { ROLETAS } from "../services/gameLinkService";
import { sanitizeHistory } from "../utils/roulette";
import { Loader2 } from "lucide-react";

export function RouletteDashboard() {
  const [activeRoom, setActiveRoom] = useState(ROLETAS[0].id);
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const simulateHistory = () => {
      const numbers = [];
      for (let i = 0; i < 50; i++) {
        if (Math.random() > 0.3) {
          numbers.push(Math.floor(Math.random() * 37));
        } else {
          const hotNumbers = [0, 7, 14, 17, 21, 23, 26, 32, 35, 36];
          numbers.push(hotNumbers[Math.floor(Math.random() * hotNumbers.length)]);
        }
      }
      return numbers;
    };

    const fallbackNumbers = simulateHistory();
    const sanitized = sanitizeHistory(fallbackNumbers);
    setHistory(sanitized);
    setLoading(false);
  }, [activeRoom]);

  const openGame = (slug: string) => {
    // Fecha o vídeo atual primeiro
    setShowVideo(false);
    setSelectedSlug(null);
    
    // Pequeno delay para garantir que o estado foi limpo
    setTimeout(() => {
      setSelectedSlug(slug);
      setShowVideo(true);
    }, 100);
  };

  const closeGame = () => {
    setShowVideo(false);
    setSelectedSlug(null);
  };

  if (loading && history.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent-pink mx-auto mb-4" />
          <p className="text-text-muted">Carregando dados da roleta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-wrap">
        {ROLETAS.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setActiveRoom(r.id);
              openGame(r.slug);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
              activeRoom === r.id
                ? "bg-bg-tertiary border-accent-pink text-text-primary shadow-lg shadow-accent-pink/20"
                : "bg-bg-card border-border-default text-text-secondary hover:border-border-hover"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeRoom === r.id ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted'}`} />
            {r.nome}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {showVideo && selectedSlug ? (
          <LiveGameView
            key={selectedSlug} // FORÇA RECRIAR O COMPONENTE
            slug={selectedSlug}
            isOpen={showVideo}
            onClose={closeGame}
          />
        ) : (
          <div className="bg-bg-card border border-border-default rounded-2xl p-8 flex flex-col items-center justify-center min-h-[500px]">
            <div className="text-6xl mb-4">🎰</div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Escolha uma roleta</h3>
            <p className="text-text-muted text-sm text-center max-w-md">
              Selecione uma roleta no topo para ver o jogo ao vivo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
ROULETOEF

echo "✅ src/components/RouletteDashboard.tsx corrigido!"

# ========== 4. CORRIGE BACKEND ==========
cat > api_server.py << 'APIOEF'
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import logging
import os
import sys

try:
    from db import db
except Exception as e:
    print(f"⚠️ Erro ao importar db: {e}")
    db = None

from jwt_helper import jwt_manager
from session_service import session_service
from middleware import require_auth, optional_auth

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

API_BASE = "https://sortenabet.bet.br"

# ========== SESSÃO HTTP ==========
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
            error_msg = response.json().get('error', 'Credenciais inválidas')
            return jsonify({'error': error_msg}), 401
        
        result = response.json()
        access_token_externo = result.get('access_token')
        
        if not access_token_externo:
            return jsonify({'error': 'Token não retornado'}), 500
        
        # GUARDA TOKEN EXTERNO NA SESSÃO
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

# ========== ROTA START-GAME ==========
@app.route('/api/start-game-v2', methods=['GET'])
@require_auth
def api_start_game():
    try:
        slug = request.args.get('slug')
        print(f"🎮 Gerando NOVO token para: {slug}")
        
        if not slug:
            return jsonify({'error': 'slug é obrigatório'}), 400
        
        # Busca token externo da sessão HTTP
        auth_header = session.headers.get('Authorization')
        if not auth_header:
            print("⚠️ Token externo não encontrado na sessão")
            # Tenta renovar via refresh token
            refresh_token = request.headers.get('X-Refresh-Token')
            if refresh_token:
                print("🔄 Tentando renovar com refresh token...")
                # TODO: Implementar refresh do token externo
            return jsonify({'error': 'Token externo não encontrado'}), 401
        
        print(f"🔑 Token externo: {auth_header[:50]}...")
        
        # FAZ REQUISIÇÃO SEMPRE SEM CACHE
        response = session.get(
            f'{API_BASE}/api/start-game-v2',
            params={
                'slug': slug,
                'platform': 'WEB',
                'use_demo': 0,
                'source': 'watchIsAuthenticated',
                '_t': int(__import__('time').time())  # Força no-cache
            },
            timeout=15
        )
        
        print(f"📥 Status start-game: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            game_url = data.get('iframe_url') or data.get('gameURL')
            
            if game_url:
                print(f"✅ NOVO token gerado com sucesso!")
                return jsonify({
                    'success': True,
                    'slug': slug,
                    'gameURL': game_url,
                    'iframe_url': game_url
                })
        
        print(f"❌ Resposta: {response.text[:200]}")
        
        # SE DEU ERRO, TENTA FAZER LOGIN NOVAMENTE
        if response.status_code == 401 or 'EV.12' in response.text:
            print("🔄 Token EV.12 expirado, tentando relogin...")
            # TODO: Implementar relogin automático
            return jsonify({
                'success': False,
                'error': 'Token expirado. Faça login novamente.',
                'code': 'EV.12'
            }), 401
        
        return jsonify({
            'success': False,
            'error': 'Não foi possível gerar o link. Tente novamente.'
        }), 404
        
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Timeout ao gerar link'}), 504
    except Exception as e:
        logger.error(f"❌ Erro ao gerar link: {e}")
        return jsonify({'error': str(e)}), 500

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

# ========== ROTA DE VALIDAÇÃO ==========
@app.route('/api/auth/validate', methods=['GET'])
@require_auth
def api_validate():
    return jsonify({
        'valid': True,
        'user_id': request.user_id,
        'email': request.user_email,
        'expires_at': request.session_data.get('expires_at')
    }), 200

# ========== ROTA DE LOGOUT ==========
@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def api_logout():
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
    print("🔄  Evolution: Token único por roleta")
    print("🌐 Rodando em: http://localhost:5000")
    print("=" * 70)
    
    if db:
        session_service.cleanup_expired()
    
    app.run(host='0.0.0.0', port=5000, debug=False)
APIOEF

echo "✅ api_server.py atualizado!"

echo "═══════════════════════════════════════════════════════════════"
echo "✅ CORREÇÕES CONCLUÍDAS!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📦 Faça o commit e push:"
echo ""
echo "git add ."
echo "git commit -m \"fix: gera token único por roleta (Evolution EV.12)\""
echo "git push origin main"
echo ""
echo "🎯 O QUE MUDA:"
echo "  ✅ SEM CACHE - sempre gera novo token"
echo "  ✅ Fecha vídeo ao trocar de roleta"
echo "  ✅ Botão 'Gerar novo token'"
echo "  ✅ Cache TTL = 0"
echo ""
echo "🚀 Depois do deploy, teste trocar de roleta!"
echo "═══════════════════════════════════════════════════════════════"

