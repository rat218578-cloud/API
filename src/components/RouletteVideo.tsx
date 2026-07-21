import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { gameTokenService, GameTokenResponse } from '../services/gameToken';
import { Loader2, Play, X } from 'lucide-react';

interface RouletteVideoProps {
  isOpen: boolean;
  roomId: string;
  onClose: () => void;
}

const ROOM_SLUGS: Record<string, string> = {
  'brasileira': 'evolution/brasileira',
  'immersive': 'evolution/immersive-roulette',
  'lightning': 'evolution/lightning-roulette',
};

const ROOM_NAMES: Record<string, string> = {
  'brasileira': '🇧🇷 Roleta Brasileira',
  'immersive': '🎥 Roleta Imersiva',
  'lightning': '⚡ Lightning Roulette',
};

export function RouletteVideo({ isOpen, roomId, onClose }: RouletteVideoProps) {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState<GameTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && isAuthenticated && roomId) {
      loadGameToken();
    }
  }, [isOpen, roomId]);

  const loadGameToken = async () => {
    setLoading(true);
    setError(null);
    setGameData(null);
    
    try {
      const slug = ROOM_SLUGS[roomId];
      if (!slug) {
        setError(`Slug não encontrado`);
        setLoading(false);
        return;
      }
      
      const data = await gameTokenService.getGameToken(slug);
      
      if (data?.gameURL) {
        setGameData(data);
      } else {
        setError('Não foi possível carregar o jogo');
      }
    } catch (err) {
      setError('Erro ao carregar o jogo');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-2">
      <div className="relative w-full max-w-7xl h-[92vh] bg-bg-card border border-border-default rounded-2xl overflow-hidden shadow-2xl">
        {/* Header - Minimalista */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-white">
              {ROOM_NAMES[roomId] || 'Roleta'} AO VIVO
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Principal - CENTRALIZADO */}
        <div className="w-full h-full flex items-center justify-center">
          {loading ? (
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-accent-pink mx-auto mb-4" />
              <p className="text-text-muted">Gerando link do jogo...</p>
            </div>
          ) : error ? (
            <div className="text-center max-w-md p-8">
              <div className="text-6xl mb-4">🎰</div>
              <p className="text-red-400 mb-2 text-lg">{error}</p>
              <button
                onClick={loadGameToken}
                className="btn-primary px-6 py-3 rounded-xl text-sm flex items-center gap-2 mx-auto"
              >
                <Play className="w-4 h-4" /> Tentar novamente
              </button>
            </div>
          ) : gameData?.gameURL ? (
            <iframe
              src={gameData.gameURL}
              className="w-full h-full border-0"
              allow="autoplay; fullscreen; camera; microphone"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">🎰</div>
              <p className="text-text-muted">Selecione uma roleta</p>
            </div>
          )}
        </div>

        {/* Rodapé com Token */}
        {gameData?.token && (
          <div className="absolute bottom-0 left-0 right-0 z-10 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center">
              <span className="text-[10px] text-text-muted font-mono truncate max-w-[80%]">
                Token: {gameData.token.substring(0, 40)}...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
