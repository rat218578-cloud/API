import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, X, Maximize2, Minimize2 } from 'lucide-react';
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
      const url = await gameLinkService.getGameUrl(slug);
      if (url) {
        setGameUrl(url);
      } else {
        setError('Não foi possível gerar o link. Tente novamente.');
      }
    } catch {
      setError('Erro ao gerar link');
    } finally {
      setLoading(false);
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
              <p className="text-text-muted text-sm">Gerando link do jogo...</p>
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
                ▶ Gerar link do jogo
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-2 bg-bg-secondary/50 border-t border-border-default">
        <div className="flex items-center justify-between text-[10px] text-text-muted">
          <span>{roleta?.nome || slug}</span>
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
  );
}
