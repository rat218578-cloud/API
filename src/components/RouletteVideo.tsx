import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { gameTokenService, GameTokenResponse } from '../services/gameToken';
import { Loader2, Play, X, Key, Copy, Check } from 'lucide-react';

interface RouletteVideoProps {
  isOpen: boolean;
  roomId: string;
  onClose: () => void;
}

const ROOM_SLUGS = {
  'brasileira': 'evolution/brasileira',
  'immersive': 'evolution/immersive-roulette',
  'lightning': 'evolution/lightning-roulette',
};

const ROOM_NAMES = {
  'brasileira': '🇧🇷 Roleta Brasileira',
  'immersive': '🎥 Roleta Imersiva',
  'lightning': '⚡ Lightning Roulette',
};

export function RouletteVideo({ isOpen, roomId, onClose }: RouletteVideoProps) {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [gameData, setGameData] = useState<GameTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      const slug = ROOM_SLUGS[roomId as keyof typeof ROOM_SLUGS] || ROOM_SLUGS['brasileira'];
      const data = await gameTokenService.getGameToken(slug);
      
      if (data) {
        setGameData(data);
        console.log('🎰 Token JWT do cassino gerado!');
        console.log('🔑 Token:', data.token.substring(0, 50) + '...');
      } else {
        setError('Não foi possível gerar o token do jogo');
      }
    } catch (err) {
      setError('Erro ao carregar o jogo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (gameData?.token) {
      navigator.clipboard.writeText(gameData.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border-default rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-bold text-text-primary">
              {ROOM_NAMES[roomId as keyof typeof ROOM_NAMES] || 'Roleta'} - AO VIVO
            </h2>
            {gameData?.token && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                Token ✓
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {gameData?.token && (
              <button
                onClick={copyToken}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-default text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado!' : 'Copiar Token'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player / Token Info */}
        <div className="w-full h-[calc(85vh-80px)] bg-black/50 flex items-center justify-center">
          {loading ? (
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-accent-pink mx-auto mb-4" />
              <p className="text-text-muted">Gerando token do cassino...</p>
              <p className="text-xs text-text-muted mt-1">Aguarde, isso pode levar alguns segundos</p>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="text-5xl mb-4">🎰</div>
              <p className="text-red-400 mb-2">{error}</p>
              <button
                onClick={loadGameToken}
                className="btn-primary px-6 py-2 rounded-xl text-sm flex items-center gap-2 mx-auto"
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
              <div className="text-5xl mb-4">🎰</div>
              <p className="text-text-muted">Selecione uma roleta para assistir</p>
              <button
                onClick={loadGameToken}
                className="btn-primary px-6 py-2 rounded-xl text-sm flex items-center gap-2 mx-auto mt-4"
              >
                <Key className="w-4 h-4" /> Gerar Token
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
