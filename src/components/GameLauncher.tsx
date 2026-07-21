import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { JOGOS } from '../services/api';
import { Loader2, ExternalLink, Gamepad2, X } from 'lucide-react';

interface GameLauncherProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameLauncher({ isOpen, onClose }: GameLauncherProps) {
  const { getGameLink, isAuthenticated } = useAuth();
  const [links, setLinks] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && isAuthenticated && Object.keys(links).length === 0) {
      loadGameLinks();
    }
  }, [isOpen, isAuthenticated]);

  const loadGameLinks = async () => {
    setLoading(true);
    try {
      const newLinks: Record<string, string | null> = {};
      for (const [key, jogo] of Object.entries(JOGOS)) {
        try {
          const url = await getGameLink(jogo.slug);
          newLinks[key] = url;
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch {
          newLinks[key] = null;
        }
      }
      setLinks(newLinks);
    } catch (error) {
      console.error('Erro ao carregar jogos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-bg-card border border-border-default rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden slide-in">
          <div className="flex items-center justify-between p-4 border-b border-border-default">
            <div className="flex items-center gap-3">
              <Gamepad2 className="w-5 h-5 text-accent-pink" />
              <div>
                <h2 className="text-lg font-bold text-text-primary">Jogos Disponíveis</h2>
                <p className="text-xs text-text-muted">Selecione um jogo para começar</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[70vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-accent-pink" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(JOGOS).map(([key, jogo]) => {
                  const url = links[key];
                  return (
                    <div
                      key={key}
                      onClick={() => url && setSelectedGame(key)}
                      className={`p-4 rounded-xl border transition-all ${
                        url
                          ? 'bg-bg-tertiary border-border-default hover:border-accent-pink cursor-pointer hover:scale-105'
                          : 'bg-bg-secondary border-border-default opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-3xl mb-2">{jogo.emoji}</div>
                      <div className="font-bold text-sm text-text-primary">{jogo.nome}</div>
                      <div className="text-xs text-text-muted">{jogo.provedor}</div>
                      {url ? (
                        <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Disponível
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Indisponível
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-border-default flex justify-between items-center">
            <span className="text-xs text-text-muted">{Object.values(links).filter(Boolean).length} jogos disponíveis</span>
            <button
              onClick={loadGameLinks}
              disabled={loading}
              className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {selectedGame && links[selectedGame] && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border-default rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden slide-in">
            <div className="flex items-center justify-between p-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{JOGOS[selectedGame].emoji}</span>
                <span className="font-bold text-text-primary">{JOGOS[selectedGame].nome}</span>
                <span className="text-xs text-text-muted">{JOGOS[selectedGame].provedor}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={links[selectedGame]!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary text-sm flex items-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" /> Abrir
                </a>
                <button
                  onClick={() => setSelectedGame(null)}
                  className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="w-full h-[calc(100%-60px)]">
              <iframe
                src={links[selectedGame]!}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen; camera; microphone"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
