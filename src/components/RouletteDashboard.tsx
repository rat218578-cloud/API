import { useState, useMemo, useEffect, useCallback } from "react";
import { SignalGenerator } from "./SignalGenerator";
import { RouletteVideo } from "./RouletteVideo";
import {
  STRATEGIES,
  getNumberInfo,
  calculateDistribution,
  getColorClass,
  generateRandomHistory,
  sanitizeHistory
} from "../utils/roulette";
import { rouletteApi } from "../services/api";
import { gameTokenService } from "../services/gameToken";
import { RefreshCw, Play, Loader2, Key } from "lucide-react";

const ROOMS = [
  { id: "brasileira", name: "🇧🇷 Brasileira", type: "live" as const },
  { id: "immersive", name: "🎥 Imersiva", type: "live" as const },
  { id: "lightning", name: "⚡ Lightning", type: "live" as const },
];

export function RouletteDashboard() {
  const [activeRoom, setActiveRoom] = useState("brasileira");
  const [trigger, setTrigger] = useState(1);
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [videoOpen, setVideoOpen] = useState(false);

  const fetchRouletteData = useCallback(async (roomId: string = activeRoom) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      if (!token) {
        const fallbackNumbers = generateRandomHistory(30);
        setHistory(fallbackNumbers);
        setError('Usando dados simulados');
        setLoading(false);
        return;
      }

      const historyData = await rouletteApi.getLiveRouletteHistory(roomId, 50);
      
      if (historyData && historyData.spins && historyData.spins.length > 0) {
        const numbers = historyData.spins.map(spin => spin.number);
        const sanitized = sanitizeHistory(numbers);
        setHistory(sanitized);
      } else {
        const fallbackNumbers = generateRandomHistory(30);
        setHistory(fallbackNumbers);
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      const fallbackNumbers = generateRandomHistory(30);
      setHistory(fallbackNumbers);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [activeRoom]);

  useEffect(() => {
    fetchRouletteData(activeRoom);
  }, [activeRoom, fetchRouletteData]);

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

  const distribution = useMemo(() => {
    if (history.length === 0) {
      return { red: 0, black: 0, zero: 0, odd: 0, even: 0, high: 0, low: 0 };
    }
    return calculateDistribution(history);
  }, [history]);

  const refreshHistory = () => {
    fetchRouletteData(activeRoom);
  };

  const clearTokenCache = () => {
    gameTokenService.clearCache();
    alert('Cache de tokens limpo! O próximo jogo vai gerar um novo token.');
  };

  if (initialLoad && loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent-pink mx-auto mb-4" />
          <p className="text-text-muted">Carregando dados da roleta...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {error && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-sm text-amber-400 text-center">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {ROOMS.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveRoom(r.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border ${
                  activeRoom === r.id
                    ? "bg-gradient-to-r from-pink-500/20 to-violet-600/20 border-pink-500/30 text-text-primary"
                    : "bg-bg-card border-border-default text-text-secondary hover:border-border-hover"
                }`}
              >
                {r.name}
                {r.type === "live" && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearTokenCache}
              className="px-3 py-2 rounded-xl bg-bg-tertiary border border-border-default text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              🔄 Novo Token
            </button>

            <button
              onClick={() => setVideoOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold hover:scale-105 transition-transform shadow-lg shadow-red-500/30"
            >
              <Key className="w-4 h-4" />
              GERAR TOKEN
              <Play className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-3 bg-bg-card border border-border-default rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-text-primary text-sm">CATALOGAÇÃO</h3>
                <p className="text-[10px] text-text-muted uppercase">📡 Dados ao vivo</p>
              </div>
              <button
                onClick={refreshHistory}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                AO VIVO
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {STRATEGIES.slice(0, 3).map((s) => (
                <div key={s.id} className="p-3 rounded-xl border border-border-default" style={{ backgroundColor: `${s.color}10` }}>
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
              {topNumbers.slice(0, 10).map((item) => {
                const info = getNumberInfo(item.number);
                return (
                  <div key={item.number} className="grid grid-cols-6 items-center py-2 text-xs border-b border-border-default/50 text-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] mx-auto ${getColorClass(item.number)}`}>
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

          <div className="xl:col-span-6 bg-bg-card border border-border-default rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-text-primary text-sm">ANÁLISE ISOLADA</h3>
                <p className="text-[10px] text-text-muted uppercase">Top 15 após gatilho</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">GATILHO</span>
                <div className="px-3 py-1 rounded-lg bg-bg-tertiary border border-border-default text-text-primary font-bold">
                  {trigger}
                </div>
                <button
                  onClick={() => setTrigger((t) => (t >= 9 ? 1 : t + 1))}
                  className="p-1.5 rounded-lg bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-[10px] text-text-muted uppercase py-2 border-b border-border-default text-center">
              <span>N</span><span>REP</span><span>A/B</span><span>I/P</span><span>COL</span><span>DUZ</span><span>SETOR</span>
            </div>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {topNumbers.map((item) => {
                const info = getNumberInfo(item.number);
                return (
                  <div key={item.number} className="grid grid-cols-7 items-center py-2 text-xs border-b border-border-default/50 text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mx-auto ${getColorClass(item.number)}`}>
                      {item.number}
                    </div>
                    <span className="text-text-secondary font-bold">{item.count}x</span>
                    <span className="text-text-secondary">{info.range === "high" ? "A" : info.range === "low" ? "B" : "Z"}</span>
                    <span className="text-text-secondary">{info.parity === "zero" ? "Z" : info.parity === "even" ? "P" : "I"}</span>
                    <span className="text-violet-400">{info.column}</span>
                    <span className="text-blue-400">{info.dozen}</span>
                    <span className="text-emerald-400">{info.sector}</span>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="p-2 rounded-lg bg-bg-tertiary text-center">
                <div className="text-[10px] text-text-muted">COR</div>
                <div className="text-xs font-bold text-text-primary">Vermelho {distribution.red}%</div>
              </div>
              <div className="p-2 rounded-lg bg-bg-tertiary text-center">
                <div className="text-[10px] text-text-muted">A/B</div>
                <div className="text-xs font-bold text-text-primary">Alto {distribution.high}%</div>
              </div>
              <div className="p-2 rounded-lg bg-bg-tertiary text-center">
                <div className="text-[10px] text-text-muted">I/P</div>
                <div className="text-xs font-bold text-text-primary">Ímpar {distribution.odd}%</div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-3 space-y-4">
            <div className="bg-bg-card border border-border-default rounded-2xl p-4">
              <h3 className="font-bold text-text-primary text-sm mb-4">GRUPOS</h3>
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
              <h3 className="font-bold text-text-primary text-sm mb-4">ASSERTIVIDADE</h3>
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

        <SignalGenerator history={history} />
      </div>

      <RouletteVideo
        isOpen={videoOpen}
        roomId={activeRoom}
        onClose={() => setVideoOpen(false)}
      />
    </>
  );
}
