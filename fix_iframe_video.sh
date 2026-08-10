#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🎥 CORRIGINDO IFRAME DO VÍDEO"
echo "═══════════════════════════════════════════════════════════════"

# ========== CORRIGE LIVEGAMEVIEW ==========
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

  useEffect(() => {
    if (isOpen && slug) {
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

      // Usa o gameLinkService com o token
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
            onClick={loadGame}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
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
              <p className="text-text-muted text-sm">Carregando...</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <div className="text-6xl mb-4">🎰</div>
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <button
                onClick={loadGame}
                className="px-6 py-2 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: cor }}
              >
                <RefreshCw className="w-4 h-4 inline mr-2" /> Tentar novamente
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
              <p className="text-text-muted">Clique em "Gerar link" para começar</p>
              <button
                onClick={loadGame}
                className="mt-4 px-6 py-2 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: cor }}
              >
                ▶ Gerar link
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-2 bg-bg-secondary/50 border-t border-border-default">
        <div className="flex items-center justify-between text-[10px] text-text-muted">
          <span>{roleta?.nome || slug}</span>
          <div className="flex items-center gap-3">
            {gameUrl && (
              <button
                onClick={openInNewTab}
                className="text-accent-cyan hover:text-accent-cyan/80 transition-colors flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Nova aba
              </button>
            )}
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

# ========== CORRIGE GAMELINKSERVICE ==========
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
        
        // Se for 401, tenta renovar
        if (response.status === 401) {
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
        console.log(`✅ Link gerado para ${slug}`);
        return gameUrl;
      }

      return null;
    } catch (error) {
      console.error(`❌ Erro:`, error);
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

echo "✅ src/services/gameLinkService.ts corrigido!"

# ========== COMMIT ==========
git add src/components/LiveGameView.tsx src/services/gameLinkService.ts
git commit -m "fix: corrige iframe do vídeo com renovação automática de token"
git push origin main

echo "═══════════════════════════════════════════════════════════════"
echo "✅ IFRAME CORRIGIDO!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📋 O QUE FOI CORRIGIDO:"
echo "   ✅ Token é enviado no header Authorization"
echo "   ✅ Renovação automática se token expirar"
echo "   ✅ Iframe carrega normalmente"
echo ""
echo "🚀 DEPOIS DO DEPLOY, FAÇA LOGIN E ABRA A ROLETA!"
echo "═══════════════════════════════════════════════════════════════"

