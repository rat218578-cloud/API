import { useState, useMemo, useEffect, useCallback } from "react";
import { SignalGenerator } from "./SignalGenerator";
import { LiveGameView } from "./LiveGameView";
import { ROLETAS } from "../services/gameLinkService";
import {
  STRATEGIES,
  getNumberInfo,
  getColorClass,
  generateRandomHistory,
  sanitizeHistory
} from "../utils/roulette";
import { rouletteApi } from "../services/api";
import { Loader2 } from "lucide-react";

export function RouletteDashboard() {
  const [activeRoom, setActiveRoom] = useState(ROLETAS[0].id);
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  const fetchRouletteData = useCallback(async (roomId: string = activeRoom) => {
    setLoading(true);
    setError(null);

    try {
      const historyData = await rouletteApi.getLiveRouletteHistory(roomId, 50);
      
      if (historyData && historyData.spins && historyData.spins.length > 0) {
        const numbers = historyData.spins.map(spin => spin.number);
        const sanitized = sanitizeHistory(numbers);
        setHistory(sanitized);
      } else {
        const fallbackNumbers = generateRandomHistory(30);
        setHistory(fallbackNumbers);
        setError('Dados da API indisponíveis. Usando dados simulados.');
      }
    } catch {
      const fallbackNumbers = generateRandomHistory(30);
      setHistory(fallbackNumbers);
      setError('Erro ao carregar dados. Usando dados simulados.');
    } finally {
      setLoading(false);
    }
  }, [activeRoom]);

  useEffect(() => {
    fetchRouletteData(activeRoom);
  }, [activeRoom, fetchRouletteData]);

  const openGame = (slug: string) => {
    setSelectedSlug(slug);
    setShowVideo(true);
  };

  const closeGame = () => {
    setShowVideo(false);
    setSelectedSlug(null);
  };

  const topNumbers = useMemo(() => {
    const validHistory = sanitizeHistory(history);
    const counts: Record<number, number> = {};
    validHistory.forEach((n) => {
      counts[n] = (counts[n] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([n, count]) => ({ number: Number(n), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [history]);

  const refreshHistory = () => {
    fetchRouletteData(activeRoom);
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
      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-sm text-amber-400">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-wrap">
        {ROLETAS.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setActiveRoom(r.id);
              openGame(r.slug);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border ${
              activeRoom === r.id
                ? "bg-bg-tertiary border-border-hover text-text-primary"
                : "bg-bg-card border-border-default text-text-secondary hover:border-border-hover"
            }`}
          >
            {r.nome}
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        
        <div className="xl:col-span-3 bg-bg-card border border-border-default rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-text-primary text-sm">📊 CATALOGAÇÃO</h3>
              <p className="text-[10px] text-text-muted uppercase">Dados ao vivo</p>
            </div>
            <button
              onClick={refreshHistory}
              disabled={loading}
              className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              AO VIVO
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {STRATEGIES.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl border border-border-default"
                style={{ backgroundColor: `${s.color}10` }}
              >
                <div className="text-[10px] text-text-secondary font-bold">{s.name}</div>
                <div className="text-xl font-bold" style={{ color: s.color }}>
                  {s.assertiveness}%
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1 max-h-[340px] overflow-y-auto">
            <div className="grid grid-cols-6 text-[10px] text-text-muted uppercase py-2 border-b border-border-default text-center">
              <span>N</span><span>A/B</span><span>I/P</span><span>COL</span><span>DUZ</span><span>SETOR</span>
            </div>
            {topNumbers.map((item) => {
              const info = getNumberInfo(item.number);
              return (
                <div key={item.number} className="grid grid-cols-6 items-center py-2 text-xs border-b border-border-default/50 text-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] mx-auto ${getColorClass(item.number)}`}>
                    {item.number}
                  </div>
                  <span className={info.range === "high" ? "text-accent-amber" : "text-text-secondary"}>
                    {info.range === "zero" ? "Zero" : info.range === "high" ? "Alto" : "Baixo"}
                  </span>
                  <span className="text-text-secondary">{info.parity === "zero" ? "Zero" : info.parity === "even" ? "Par" : "Ímpar"}</span>
                  <span className="text-violet-400">{info.column}</span>
                  <span className="text-blue-400">{info.dozen}</span>
                  <span className="text-emerald-400">{info.sector}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-6">
          {showVideo && selectedSlug ? (
            <LiveGameView
              slug={selectedSlug}
              isOpen={showVideo}
              onClose={closeGame}
            />
          ) : (
            <div className="bg-bg-card border border-border-default rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px]">
              <div className="text-6xl mb-4">🎰</div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Escolha uma roleta</h3>
              <p className="text-text-muted text-sm text-center max-w-md">
                Selecione uma roleta no topo para ver o jogo ao vivo
              </p>
            </div>
          )}
        </div>

        <div className="xl:col-span-3 space-y-4">
          <div className="bg-bg-card border border-border-default rounded-2xl p-4">
            <h3 className="font-bold text-text-primary text-sm mb-4">📈 GRUPOS</h3>
            <div className="text-[10px] text-text-muted uppercase mb-2">Sequência atual</div>
            <div className="p-3 rounded-xl bg-bg-tertiary border border-border-default text-center mb-3">
              <div className="text-lg font-bold text-text-primary">
                {history.length > 0 ? `${getNumberInfo(history[0] || 0).color.toUpperCase()} - ${getNumberInfo(history[0] || 0).range.toUpperCase()}` : "---"}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-text-secondary mb-3">
              <div className="p-2 rounded-lg bg-bg-tertiary">
                <div className="text-[10px] text-text-muted">Último</div>
                <div className="font-bold text-text-primary">{history.length > 0 ? history[0] : "---"}</div>
              </div>
              <div className="p-2 rounded-lg bg-bg-tertiary">
                <div className="text-[10px] text-text-muted">Penúltimo</div>
                <div className="font-bold text-text-primary">{history.length > 1 ? history[1] : "---"}</div>
              </div>
              <div className="p-2 rounded-lg bg-bg-tertiary">
                <div className="text-[10px] text-text-muted">Antepenúltimo</div>
                <div className="font-bold text-text-primary">{history.length > 2 ? history[2] : "---"}</div>
              </div>
            </div>
          </div>

          <div className="bg-bg-card border border-border-default rounded-2xl p-4">
            <h3 className="font-bold text-text-primary text-sm mb-4">🎯 ASSERTIVIDADE</h3>
            <div className="text-[10px] text-text-muted uppercase mb-3">Últimas rodadas</div>
            <div className="space-y-3">
              {STRATEGIES.map((s) => (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-text-secondary">{s.name}</span>
                    <span className="font-bold" style={{ color: s.color }}>
                      {s.assertiveness}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.assertiveness}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <SignalGenerator history={history} />
      </div>
    </div>
  );
}
