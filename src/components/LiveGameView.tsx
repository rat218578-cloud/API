import { useState, useEffect, useRef } from 'react';
import { RefreshCw, X, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { gameLinkService, ROLETAS } from '../services/gameLinkService';

interface LiveGameViewProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  gameId?: string;
}

export function LiveGameView({ slug, isOpen, onClose, gameId }: LiveGameViewProps) {
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const loadAttempts = useRef(0);
  const lastGameId = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const roleta = ROLETAS.find(r => 
    (gameId && r.gameId === gameId) || r.slug === slug
  );
  const cor = roleta?.cor || '#6C3CE1';

  // GERA URL DIRETA PARA FOOTBALL STUDIO
  const gerarUrlDireta = (gameId: string): string => {
    const lobbyId = crypto.randomUUID().replace(/-/g, '');
    return `https://sortenabet.evo-games.com/frontend/evo/r2/#category=all_games&game=topcard&table_id=${gameId}&lobby_launch_id=${lobbyId}`;
  };

  useEffect(() => {
    if (isOpen && slug) {
      console.log('🎮 LiveGameView - slug:', slug, 'gameId:', gameId);
      
      if (lastGameId.current !== gameId) {
        console.log('🔄 GameId mudou, recarregando:', gameId);
        lastGameId.current = gameId || null;
        loadAttempts.current = 0;
        setGameUrl(null);
        setIsLoading(true);
        loadGame();
      } else if (!gameUrl) {
        setIsLoading(true);
        loadGame();
      }
    }
  }, [isOpen, slug, gameId]);

  const loadGame = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Você precisa estar logado para jogar');
        setIsLoading(false);
        return;
      }

      let url = null;

      // SE FOR FOOTBALL STUDIO (gameId TopCard), USA URL DIRETA
      if (gameId && gameId.startsWith('TopCard')) {
        url = gerarUrlDireta(gameId);
        console.log('🎯 Football Studio - URL direta gerada:', url);
      } else {
        url = await gameLinkService.getGameUrl(slug);
      }

      if (url) {
        console.log('✅ URL carregada com sucesso!');
        setGameUrl(url);
        setError(null);
      } else {
        setError('Não foi possível gerar o link. Tente novamente.');
      }
    } catch (err) {
      console.error('❌ Erro ao carregar jogo:', err);
      setError('Erro ao gerar link');
    } finally {
      setIsLoading(false);
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

  // ✅ QUANDO O IFRAME CARREGAR, ESCONDE O LOADING
  const handleIframeLoad = () => {
    console.log('✅ Iframe carregou!');
    setIsLoading(false);
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
            {gameId && (
              <span className="text-[10px] text-text-muted ml-2">
                ({gameId})
              </span>
            )}
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
              loadAttempts.current = 0;
              setGameUrl(null);
              setIsLoading(true);
              loadGame();
            }}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
            title="Gerar novo token"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <div className="text-6xl mb-4">🎰</div>
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <button
                onClick={() => {
                  setGameUrl(null);
                  setIsLoading(true);
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
          <>
            {/* ✅ SEM ANIMAÇÃO DE LOADING - IFRAME DIRETO */}
            <iframe
              ref={iframeRef}
              key={gameUrl + gameId}
              src={gameUrl}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; camera; microphone; accelerometer; gyroscope"
              loading="eager"
              onLoad={handleIframeLoad}
              onError={() => {
                console.log('⚠️ Iframe error, gerando novo token...');
                setGameUrl(null);
                setIsLoading(true);
                loadGame();
              }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-orientation-lock"
            />
            {/* ✅ INDICADOR MINIMALISTA DE CARREGAMENTO */}
            {isLoading && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-8 border-2 border-accent-pink/30 border-t-accent-pink rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">⚽</div>
              <p className="text-text-muted">Clique em "Gerar novo token" para começar</p>
              <button
                onClick={() => {
                  setIsLoading(true);
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
          <span>{roleta?.nome || slug} {gameId && `(${gameId})`}</span>
          <div className="flex items-center gap-3">
            <span className="text-[8px] text-amber-400">Token único por sessão</span>
            <button
              onClick={() => {
                setGameUrl(null);
                setIsLoading(true);
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
