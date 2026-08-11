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
    // 🔥 FECHA O VÍDEO ATUAL
    setShowVideo(false);
    setSelectedSlug(null);
    
    // 🔥 DELAY PARA LIMPAR O ESTADO
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
            key={selectedSlug} // 🔥 FORÇA RECRIAR O COMPONENTE
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
