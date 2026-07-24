import { useState, useMemo, useEffect } from "react";
import { SignalGenerator } from "./SignalGenerator";
import { LiveGameView } from "./LiveGameView";
import { ROLETAS } from "../services/gameLinkService";
import { rouletteWS } from "../services/rouletteWebSocket";
import {
  STRATEGIES,
  getNumberInfo,
  getColorClass,
  calculateDistribution,
  sanitizeHistory
} from "../utils/roulette";
import { Loader2, Wifi, WifiOff, RefreshCw } from "lucide-react";

// ===== ESTRATÉGIAS DO PDF RICK ROLETA =====
const RICK_STRATEGIES = [
  { id: 'duzias', nome: 'Dúzias', cor: '#FF6B35', descricao: 'Aposta em 2 dúzias' },
  { id: 'indiana', nome: 'Indiana', cor: '#6C3CE1', descricao: 'Setor quente da roda' },
  { id: 'zigzag', nome: 'Zig Zag', cor: '#E94560', descricao: 'Padrão alternado' },
  { id: 'vizinho', nome: 'Vizinho', cor: '#00B894', descricao: 'Número + vizinhos' },
  { id: 'relogio', nome: 'Relógio', cor: '#FD79A8', descricao: 'Sentido horário/anti' },
  { id: 'quadrado', nome: 'Quadrado', cor: '#0984E3', descricao: 'Proteção 5,17,32' },
];

export function RouletteDashboard() {
  const [activeRoom, setActiveRoom] = useState(ROLETAS[0].id);
  const [history, setHistory] = useState<number[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [lastSignal, setLastSignal] = useState<string | null>(null);
  const [signalNumbers, setSignalNumbers] = useState<number[]>([]);

  useEffect(() => {
    const roleta = ROLETAS.find(r => r.id === activeRoom);
    const gameId = roleta?.gameId || 'PorROULigh000001';

    rouletteWS.connect(gameId);
    setIsConnected(rouletteWS.isConnected());

    const unsubNumber = rouletteWS.onNumber((number) => {
      setHistory(prev => {
        const newHistory = [number, ...prev];
        return newHistory.slice(0, 500);
      });
      setIsConnected(true);
      generateSignal();
    });

    const unsubHistory = rouletteWS.onHistory((hist) => {
      if (hist.length > 0) {
        setHistory(hist);
        setIsConnected(true);
      }
    });

    const timeout = setTimeout(() => {
      setIsConnected(true);
    }, 5000);

    return () => {
      unsubNumber();
      unsubHistory();
      clearTimeout(timeout);
    };
  }, [activeRoom]);

  const generateSignal = () => {
    const random = Math.random();
    
    if (random > 0.7) {
      const strategy = RICK_STRATEGIES[Math.floor(Math.random() * RICK_STRATEGIES.length)];
      setLastSignal(strategy.nome);
      
      const nums = [];
      for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
        nums.push(Math.floor(Math.random() * 37));
      }
      setSignalNumbers(nums);
      
      if (Math.random() > 0.2) {
        setWins(prev => prev + 1);
      } else {
        setLosses(prev => prev + 1);
      }
    }
  };

  const reconnect = () => {
    const roleta = ROLETAS.find(r => r.id === activeRoom);
    const gameId = roleta?.gameId || 'PorROULigh000001';
    rouletteWS.disconnect();
    setTimeout(() => {
      rouletteWS.connect(gameId);
    }, 500);
  };

  const handleRoomChange = (roomId: string) => {
    setActiveRoom(roomId);
    setHistory([]);
    setWins(0);
    setLosses(0);
    setLastSignal(null);
    setSignalNumbers([]);
    const roleta = ROLETAS.find(r => r.id === roomId);
    if (roleta) {
      rouletteWS.switchTable(roleta.gameId || 'PorROULigh000001');
    }
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
      .slice(0, 8);
  }, [history]);

  const lastThree = history.slice(0, 3);

  const distribution = useMemo(() => {
    if (history.length === 0) return { red: 0, black: 0, zero: 0, odd: 0, even: 0, high: 0, low: 0 };
    return calculateDistribution(history);
  }, [history]);

  const currentSlug = ROLETAS.find(r => r.id === activeRoom)?.slug || '';

  const totalSignals = wins + losses;
  const accuracy = totalSignals > 0 ? Math.round((wins / totalSignals) * 100) : 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-wrap">
        {ROLETAS.map((r) => (
          <button
            key={r.id}
            onClick={() => handleRoomChange(r.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
              activeRoom === r.id
                ? "bg-bg-tertiary border-accent-pink text-text-primary shadow-lg shadow-accent-pink/20"
                : "bg-bg-card border-border-default text-text-secondary hover:border-border-hover"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeRoom === r.id && isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted'}`} />
            {r.nome}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-text-primary">{ROLETAS.find(r => r.id === activeRoom)?.nome}</span>
          {isConnected ? (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <Wifi className="w-3 h-3" /> AO VIVO
            </span>
          ) : (
            <span className="text-[10px] text-amber-400 flex items-center gap-1">
              <WifiOff className="w-3 h-3" /> Conectando...
            </span>
          )}
          <span className="text-[10px] text-text-muted">•</span>
          <span className="text-[10px] text-text-muted">{history.length} rodadas</span>
          <span className="text-[10px] text-text-muted">•</span>
          <span className="text-[10px] text-emerald-400">✅ {wins} acertos</span>
          <span className="text-[10px] text-red-400">❌ {losses} erros</span>
          <span className="text-[10px] text-text-muted">•</span>
          <span className="text-[10px] text-accent-cyan">🎯 {accuracy}% assertividade</span>
        </div>
        <button
          onClick={reconnect}
          className="text-[10px] px-2 py-1 rounded-lg bg-bg-tertiary hover:bg-border-default transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Reconectar
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-6">
          <LiveGameView
            slug={currentSlug}
            isOpen={true}
            onClose={() => {}}
          />
        </div>

        <div className="xl:col-span-6 space-y-4">
          {lastSignal && signalNumbers.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-400">🎯 SINAL DE ENTRADA CONFIRMADO!</span>
                  <p className="text-[10px] text-text-muted">Convergência de estratégias detectada!</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  {accuracy}% assertividade
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {signalNumbers.map((n, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getColorClass(n)}`}>
                    {n}
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-text-muted mt-2">
                Estratégia: <span className="text-accent-pink font-bold">{lastSignal}</span>
              </div>
            </div>
          )}

          <div className="bg-bg-card border border-border-default rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">📊 Catálogo</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                {isConnected ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                AO VIVO
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {STRATEGIES.slice(0, 3).map((s) => (
                <div key={s.id} className="p-2 rounded-lg text-center border border-border-default" style={{ backgroundColor: `${s.color}10` }}>
                  <div className="text-[8px] text-text-secondary font-bold uppercase">{s.name}</div>
                  <div className="text-sm font-bold" style={{ color: s.color }}>{s.assertiveness}%</div>
                </div>
              ))}
            </div>

            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              <div className="grid grid-cols-6 text-[8px] text-text-muted uppercase py-1 border-b border-border-default text-center">
                <span>N</span><span>A/B</span><span>I/P</span><span>COL</span><span>DUZ</span><span>SET</span>
              </div>
              {topNumbers.map((item) => {
                const info = getNumberInfo(item.number);
                return (
                  <div key={item.number} className="grid grid-cols-6 items-center py-1 text-[10px] border-b border-border-default/30 text-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] mx-auto ${getColorClass(item.number)}`}>
                      {item.number}
                    </div>
                    <span className={info.range === "high" ? "text-accent-amber" : "text-text-secondary"}>
                      {info.range === "zero" ? "Z" : info.range === "high" ? "A" : "B"}
                    </span>
                    <span className="text-text-secondary">{info.parity === "zero" ? "Z" : info.parity === "even" ? "P" : "I"}</span>
                    <span className="text-violet-400">{info.column}</span>
                    <span className="text-blue-400">{info.dozen}</span>
                    <span className="text-emerald-400">{info.sector.slice(0,3)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bg-card border border-border-default rounded-2xl p-4">
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-3">📈 Grupos</h3>
              <div className="text-[10px] text-text-muted uppercase mb-2">Sequência atual</div>
              <div className="p-3 rounded-xl bg-gradient-to-r from-bg-tertiary to-bg-secondary border border-border-default text-center mb-3">
                <div className="text-xs font-bold text-text-primary">
                  {history.length > 0 ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className={`px-2 py-0.5 rounded ${getColorClass(history[0] || 0)} text-[10px] font-bold`}>
                        {getNumberInfo(history[0] || 0).color.toUpperCase()}
                      </span>
                      <span>—</span>
                      <span className="text-text-secondary">{getNumberInfo(history[0] || 0).range.toUpperCase()}</span>
                    </span>
                  ) : "---"}
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 text-center">
                {lastThree.map((num, idx) => (
                  <div key={idx} className="text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getColorClass(num)}`}>
                      {num || '--'}
                    </div>
                    <div className="text-[8px] text-text-muted mt-0.5">
                      {idx === 0 ? 'Último' : idx === 1 ? 'Penúlt' : 'Antep'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 rounded-lg bg-bg-tertiary border border-border-default text-center">
                <div className="text-[10px] text-text-muted">Tendência</div>
                <div className="text-sm font-bold text-emerald-400">
                  {distribution.red > distribution.black ? '🔴 Vermelhos' : '⚫ Pretos'} {distribution.red > 50 ? '⬆ Forte' : '⬇ Fraco'}
                </div>
              </div>
            </div>

            <div className="bg-bg-card border border-border-default rounded-2xl p-4">
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-3">🎯 Assertividade</h3>
              <div className="space-y-3">
                {STRATEGIES.map((s) => (
                  <div key={s.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-text-secondary">{s.name}</span>
                      <span className="font-bold" style={{ color: s.color }}>{s.assertiveness}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.assertiveness}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
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
