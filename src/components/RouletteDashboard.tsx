import { useState, useMemo, useEffect, useCallback } from "react";
import { SignalGenerator } from "./SignalGenerator";
import {
  STRATEGIES,
  getNumberInfo,
  calculateDistribution,
  getColorClass,
  generateRandomHistory,
  sanitizeHistory
} from "../utils/roulette";
import { rouletteApi } from "../services/api";
import { RefreshCw, Plus, X, Play, Loader2 } from "lucide-react";

const ROOMS = [
  { id: "brasileira", name: "Brasileira", type: "live" as const, spins: 0, lastNumber: null },
  { id: "immersive", name: "Immersive", type: "live" as const, spins: 0, lastNumber: null },
  { id: "lightning", name: "Lightning", type: "live" as const, spins: 0, lastNumber: null },
  { id: "manual1", name: "Manual 1", type: "manual" as const, spins: 0, lastNumber: null },
  { id: "manual2", name: "Manual 2", type: "manual" as const, spins: 0, lastNumber: null },
  { id: "free", name: "Free GRÁTIS", type: "free" as const, spins: 0, lastNumber: null },
];

export function RouletteDashboard() {
  const [activeRoom, setActiveRoom] = useState("brasileira");
  const [trigger, setTrigger] = useState(1);
  const auto = 1;
  const [manualInput, setManualInput] = useState("");
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomSpins, setRoomSpins] = useState<Record<string, number>>({});
  const [lastNumbers, setLastNumbers] = useState<Record<string, number | null>>({});
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchRouletteData = useCallback(async (roomId: string = activeRoom) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn('Nenhum token encontrado, usando dados de fallback');
        const fallbackNumbers = generateRandomHistory(30);
        setHistory(fallbackNumbers);
        setLastNumbers(prev => ({ ...prev, [roomId]: fallbackNumbers[0] || null }));
        setRoomSpins(prev => ({ ...prev, [roomId]: 30 }));
        setError('Não autenticado. Usando dados simulados.');
        setLoading(false);
        return;
      }

      const historyData = await rouletteApi.getLiveRouletteHistory(roomId, 50);
      
      if (historyData && historyData.spins && historyData.spins.length > 0) {
        const numbers = historyData.spins.map(spin => spin.number);
        const sanitized = sanitizeHistory(numbers);
        setHistory(sanitized);
        setRoomSpins(prev => ({ ...prev, [roomId]: historyData.total || sanitized.length }));
        setLastNumbers(prev => ({ ...prev, [roomId]: sanitized[0] || null }));
      } else {
        const fallbackNumbers = generateRandomHistory(30);
        setHistory(fallbackNumbers);
        setLastNumbers(prev => ({ ...prev, [roomId]: fallbackNumbers[0] || null }));
        setRoomSpins(prev => ({ ...prev, [roomId]: 30 }));
        if (initialLoad) {
          setError('Dados da API indisponíveis. Usando dados simulados.');
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados da roleta:', err);
      const fallbackNumbers = generateRandomHistory(30);
      setHistory(fallbackNumbers);
      setLastNumbers(prev => ({ ...prev, [roomId]: fallbackNumbers[0] || null }));
      setRoomSpins(prev => ({ ...prev, [roomId]: 30 }));
      setError('Erro ao carregar dados. Usando dados simulados.');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [activeRoom, initialLoad]);

  useEffect(() => {
    fetchRouletteData(activeRoom);
  }, [activeRoom, fetchRouletteData]);

  const room = ROOMS.find((r) => r.id === activeRoom) || ROOMS[0];

  const roomInfo = {
    ...room,
    spins: roomSpins[activeRoom] || room.spins,
    lastNumber: lastNumbers[activeRoom] !== undefined ? lastNumbers[activeRoom] : room.lastNumber
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

  const distribution = useMemo(() => {
    if (history.length === 0) {
      return { red: 0, black: 0, zero: 0, odd: 0, even: 0, high: 0, low: 0 };
    }
    return calculateDistribution(history);
  }, [history]);

  const addManualNumbers = () => {
    const nums = manualInput
      .split(/[\s,;]+/)
      .map((n) => parseInt(n))
      .filter((n) => !isNaN(n) && n >= 0 && n <= 36);
    if (nums.length) {
      setHistory((prev) => sanitizeHistory([...nums, ...prev]).slice(0, 200));
      setManualInput("");
    }
  };

  const refreshHistory = () => {
    fetchRouletteData(activeRoom);
  };

  if (initialLoad && loading) {
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

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {ROOMS.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveRoom(r.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors border ${
              activeRoom === r.id
                ? "bg-bg-tertiary border-border-hover text-text-primary"
                : "bg-bg-card border-border-default text-text-secondary hover:border-border-hover"
            }`}
          >
            {r.name}
            {r.type === "live" && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
            {r.type === "manual" && <span className="text-[10px] text-text-muted">MANUAL</span>}
          </button>
        ))}
        <button className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-text-muted hover:text-text-primary border border-dashed border-border-default hover:border-border-hover transition-colors">
          <Plus className="w-4 h-4" /> Manual
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-bg-card border border-border-default rounded-2xl p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider">Rodadas no banco</div>
          <div className="text-2xl font-bold text-text-primary mt-1">
            {roomInfo.spins.toLocaleString("pt-BR")}
          </div>
          <div className="text-xs text-text-muted">
            {history.length} carregadas
          </div>
        </div>

        <div className="bg-bg-card border border-border-default rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wider">Gatilho ativo</div>
            <div className="flex items-center gap-3 mt-2">
              <div className="px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-default text-text-primary font-bold">
                {trigger}
              </div>
              <span className="text-xs text-text-muted">previsões isoladas</span>
            </div>
          </div>
          <button
            onClick={() => setTrigger((t) => (t >= 9 ? 1 : t + 1))}
            className="p-2 rounded-lg bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-bg-card border border-border-default rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wider">Último número</div>
            <div className="flex items-center gap-3 mt-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                  roomInfo.lastNumber !== null ? getColorClass(roomInfo.lastNumber) : "bg-bg-tertiary"
                }`}
              >
                {roomInfo.lastNumber !== null ? roomInfo.lastNumber : "---"}
              </div>
              <div className="text-xs text-text-muted">
                {roomInfo.lastNumber !== null ? getNumberInfo(roomInfo.lastNumber).parity.toUpperCase() : "Aguardando"}
              </div>
            </div>
          </div>
          <div className="text-right">
            <button
              onClick={refreshHistory}
              disabled={loading}
              className="btn-primary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-3 bg-bg-card border border-border-default rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-text-primary text-sm">CATALOGAÇÃO</h3>
              <p className="text-[10px] text-text-muted uppercase">
                {roomInfo.type === "live" ? "Dados ao vivo" : "Aba manual"}
              </p>
            </div>
            <button
              onClick={refreshHistory}
              disabled={loading}
              className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              {roomInfo.type === "live" ? "AO VIVO" : "ONLINE"}
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
            <div className="grid grid-cols-6 text-[10px] text-text-muted uppercase py-2 border-b border-border-default">
              <span>N</span>
              <span>A/B</span>
              <span>I/P</span>
              <span>COL</span>
              <span>DUZ</span>
              <span>SETOR</span>
            </div>
            {topNumbers.map((item) => {
              const info = getNumberInfo(item.number);
              return (
                <div
                  key={item.number}
                  className="grid grid-cols-6 items-center py-2 text-xs border-b border-border-default/50"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${getColorClass(item.number)}`}>
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

        <div className="xl:col-span-3 bg-bg-card border border-border-default rounded-2xl p-4">
          <div className="mb-4">
            <h3 className="font-bold text-text-primary text-sm">ANÁLISE ISOLADA</h3>
            <p className="text-[10px] text-text-muted uppercase">Top 15 após gatilho</p>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-text-muted">GATILHO</span>
            <div className="px-3 py-1 rounded-lg bg-bg-tertiary border border-border-default text-text-primary font-bold">
              {trigger}
            </div>
            <span className="text-xs text-text-muted">Auto - {auto}</span>
          </div>
          <div className="space-y-1 max-h-[380px] overflow-y-auto">
            <div className="grid grid-cols-7 text-[10px] text-text-muted uppercase py-2 border-b border-border-default text-center">
              <span>N</span>
              <span>REP</span>
              <span>A/B</span>
              <span>I/P</span>
              <span>COL</span>
              <span>DUZ</span>
              <span>SETOR</span>
            </div>
            {topNumbers.map((item) => {
              const info = getNumberInfo(item.number);
              return (
                <div
                  key={item.number}
                  className="grid grid-cols-7 items-center py-1.5 text-xs border-b border-border-default/50 text-center"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] mx-auto ${getColorClass(item.number)}`}>
                    {item.number}
                  </div>
                  <span className="text-text-secondary">{item.count}x</span>
                  <span className="text-text-secondary">{info.range === "high" ? "A" : info.range === "low" ? "B" : "Z"}</span>
                  <span className="text-text-secondary">{info.parity === "zero" ? "Z" : info.parity === "even" ? "P" : "Í"}</span>
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
            <div className="p-2 rounded-lg bg-bg-tertiary text-center">
              <div className="text-[10px] text-text-muted">COL</div>
              <div className="text-xs font-bold text-text-primary">C2 / C1 67%</div>
            </div>
            <div className="p-2 rounded-lg bg-bg-tertiary text-center">
              <div className="text-[10px] text-text-muted">DUZ</div>
              <div className="text-xs font-bold text-text-primary">D1 / ... 67%</div>
            </div>
            <div className="p-2 rounded-lg bg-bg-tertiary text-center">
              <div className="text-[10px] text-text-muted">SETOR</div>
              <div className="text-xs font-bold text-text-primary">Oposto 53%</div>
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
            <div className="grid grid-cols-3 gap-2 text-center">
              {history.slice(0, 3).map((num, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-bg-tertiary text-[10px]">
                  <div className={`w-6 h-6 rounded-full mx-auto mb-1 flex items-center justify-center font-bold ${getColorClass(num)}`}>
                    {num}
                  </div>
                </div>
              ))}
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
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${s.assertiveness}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 space-y-4">
          <SignalGenerator history={history} />

          {STRATEGIES.map((s) => {
            return (
              <div key={s.id} className="bg-bg-card border border-border-default rounded-2xl p-4">
                <h3 className="font-bold text-text-primary text-sm text-center mb-3" style={{ color: s.color }}>
                  {s.name}
                </h3>
                <div className="grid grid-cols-8 gap-1 text-[10px] text-text-muted text-center mb-2">
                  <span>GAT</span>
                  <span>G1</span>
                  <span>G2</span>
                  <span>G3</span>
                  <span>COL</span>
                  <span>DUZ</span>
                  <span>SET</span>
                  <span>GR</span>
                </div>
                {[0, 1, 2].map((row) => (
                  <div key={row} className="grid grid-cols-8 gap-1 text-[10px] text-center items-center py-1">
                    <span className="text-text-secondary">{history[row] || "---"}</span>
                    {[0, 1, 2, 3, 4, 5, 6].map((col) => {
                      const idx = row * 7 + col + 1;
                      const num = history[idx] !== undefined ? history[idx] : Math.floor(Math.random() * 37);
                      return (
                        <div
                          key={col}
                          className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${getColorClass(num)}`}
                        >
                          {num}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {roomInfo.type === "manual" && (
        <div className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border-default p-4 z-30">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Cole números separados por espaço, vírgula ou linha para esta aba manual"
              className="flex-1 bg-bg-tertiary border border-border-default rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-pink"
            />
            <button
              onClick={addManualNumbers}
              className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl text-sm"
            >
              <Play className="w-4 h-4" />
              Adicionar
            </button>
            <button
              onClick={() => setManualInput("")}
              className="p-3 rounded-xl bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
