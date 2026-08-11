import { useState, useEffect, useRef } from 'react';
import { RefreshCw, X, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { gameLinkService, ROLETAS } from '../services/gameLinkService';

interface LiveGameViewProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LiveGameView({ slug, isOpen, onClose }: LiveGameViewProps) {
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadedRef = useRef(false);

  const roleta = ROLETAS.find(r => r.slug === slug);
  const cor = roleta?.cor || '#6C3CE1';

  // ========== CARREGA O JOGO (SEM LOADER) ==========
  const loadGame = async () => {
    // Se já carregou, não recarrega
    if (loadedRef.current && gameUrl) return;

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Você precisa estar logado para jogar');
        return;
      }

      // Busca a URL (pode ser do cache)
      const url = await gameLinkService.getGameUrl(slug);
      
      if (url) {
        setGameUrl(url);
        loadedRef.current = true;
      } else {
        setError('Não foi possível gerar o link. Tente novamente.');
      }
    } catch (err) {
      setError('Erro ao gerar link');
      console.error(err);
    }
  };

  // ========== CARREGA AO ABRIR ==========
  useEffect(() => {
    if (isOpen && slug) {
      loadedRef.current = false;
      setGameUrl(null);
      setError(null);
      loadGame();
    }
  }, [isOpen, slug]);

  // ========== QUANDO O IFRAME CARREGA ==========
  const handleIframeLoad = () => {
    console.log('✅ Iframe carregado com sucesso!');
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
      {/* Header */}
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
              loadedRef.current = false;
              setGameUrl(null);
              loadGame();
            }}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
            title="Gerar novo token"
          >
            <RefreshCw className="w-4 h-4" />
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

      {/* Conteúdo - SEM LOADER */}
      <div className="relative bg-black" style={{ minHeight: '400px', height: '60vh' }}>
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <div className="text-6xl mb-4">🎰</div>
              <p className="text-red-400 text-sm mb-2">{error}</p>
              <button
                onClick={() => {
                  loadedRef.current = false;
                  setGameUrl(null);
                  loadGame();
                }}
                className="px-6 py-2 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: cor }}
              >
                <RefreshCw className="w-4 h-4 inline mr-2" /> Tentar novamente
              </button>
            </div>
          </div>
        ) : gameUrl ? (
          <iframe
            ref={iframeRef}
            src={gameUrl}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; camera; microphone; accelerometer; gyroscope"
            loading="eager"
            onLoad={handleIframeLoad}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-orientation-lock"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🎰</div>
              <p className="text-text-muted">Clique em "Gerar link" para começar</p>
              <button
                onClick={() => {
                  loadedRef.current = false;
                  setGameUrl(null);
                  loadGame();
                }}
                className="mt-4 px-6 py-2 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: cor }}
              >
                ▶ Gerar link
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
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
