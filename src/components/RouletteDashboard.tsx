import { useState, useMemo, useEffect } from "react";
import { SignalGenerator } from "./SignalGenerator";
import { LiveGameView } from "./LiveGameView";
import { ROLETAS } from "../services/gameLinkService";
import {
  STRATEGIES,
  getNumberInfo,
  getColorClass,
  sanitizeHistory
} from "../utils/roulette";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

// ========== COMPONENTE ==========
export function RouletteDashboard() {
  const [activeRoom, setActiveRoom] = useState(ROLETAS[0].id);
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showCatalog, setShowCatalog] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRealData, setIsRealData] = useState(false);
  const [totalNumbers, setTotalNumbers] = useState(0);
  const [topNumbersList, setTopNumbersList] = useState<{number: number, count: number}[]>([]);

  // ========== BUSCAR NÚMEROS REAIS DO BACKEND ==========
  const fetchNumbers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/roulette/live?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Dados da API Games:', data);
        
        if (data.success && data.history && data.history.length > 0) {
          const numbers = data.history.map((item: any) => item.number);
          setHistory(numbers);
          setIsRealData(true);
          setIsConnected(data.connected || false);
          setTotalNumbers(data.total || numbers.length);
          setTopNumbersList(data.top_numbers || []);
          console.log(`✅ Carregados ${numbers.length} números REAIS`);
        } else {
          console.warn('⚠️ Nenhum número real disponível');
          // NÃO GERA NÚMEROS FALSOS!
          setHistory([]);
          setIsRealData(false);
        }
      } else {
        console.error('❌ Erro ao carregar histórico:', response.status);
        setHistory([]);
        setIsRealData(false);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
      setHistory([]);
      setIsRealData(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  // ========== POLLING PARA ATUALIZAR ==========
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch('/api/roulette/live?limit=10', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.history && data.history.length > 0) {
            const numbers = data.history.map((item: any) => item.number);
            if (numbers.length > 0) {
              setHistory(numbers.slice(0, 500));
              setIsRealData(true);
              setIsConnected(data.connected || false);
              setTotalNumbers(data.total || numbers.length);
              setTopNumbersList(data.top_numbers || []);
            }
          }
        }
      } catch (error) {
        // Ignora
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // ========== FUNÇÕES ==========
  const openGame = (slug: string) => {
    setSelectedSlug(slug);
    setShowVideo(true);
    setTimeout(fetchNumbers, 2000);
  };

  const closeGame = () => {
    setShowVideo(false);
    setSelectedSlug(null);
  };

  const topNumbers = useMemo(() => {
    if (!isRealData || history.length === 0) return [];
    
    if (topNumbersList.length > 0) {
      return topNumbersList;
    }
    
    const validHistory = sanitizeHistory(history);
    const counts: Record<number, number> = {};
    validHistory.forEach((n) => {
      counts[n] = (counts[n] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([n, count]) => ({ number: Number(n), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [history, isRealData, topNumbersList]);

  const refreshHistory = () => {
    setLoading(true);
    fetchNumbers();
  };

  const getLastThree = () => {
    if (!isRealData || history.length === 0) return ['--', '--', '--'];
    return history.slice(0, 3);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent-pink mx-auto mb-4" />
          <p className="text-text-muted">Carregando dados da roleta...</p>
        </div>
      </div>
    );
  }

  const lastThree = getLastThree();

  return (
    <div className="p-4 space-y-4">
      {/* Status */}
      <div className="flex items-center gap-2 text-xs">
        <span className={`w-2 h-2 rounded-full ${isConnected && isRealData ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`} />
        <span className={isConnected && isRealData ? 'text-emerald-400' : 'text-yellow-400'}>
          {isConnected && isRealData ? '📡 Números REAIS' : '⏳ Aguardando números reais...'}
        </span>
        {isRealData && (
          <span className="text-emerald-400">✅ {totalNumbers} números</span>
        )}
        {!isRealData && (
          <span className="text-yellow-400">⚠️ Nenhum número disponível</span>
        )}
      </div>

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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* CATÁLOGO */}
        <div className={`xl:col-span-2 transition-all duration-300 ${showCatalog ? 'block' : 'hidden xl:block'}`}>
          <div className="bg-bg-card border border-border-default rounded-2xl p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">
                📊 Catalogo {isRealData ? '🔴' : '⏳'}
              </h3>
              <button 
                onClick={() => setShowCatalog(!showCatalog)}
                className="xl:hidden p-1 rounded-lg hover:bg-bg-tertiary"
              >
                {showCatalog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={refreshHistory}
                disabled={loading}
                className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {isRealData ? 'REAL' : '⏳'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {STRATEGIES.slice(0, 3).map((s) => (
                <div
                  key={s.id}
                  className="p-2 rounded-lg text-center border border-border-default"
                  style={{ backgroundColor: `${s.color}10` }}
                >
                  <div className="text-[8px] text-text-secondary font-bold uppercase">{s.name}</div>
                  <div className="text-sm font-bold" style={{ color: s.color }}>
                    {s.assertiveness}%
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              <div className="grid grid-cols-6 text-[8px] text-text-muted uppercase py-1 border-b border-border-default text-center">
                <span>N</span><span>A/B</span><span>I/P</span><span>COL</span><span>DUZ</span><span>SET</span>
              </div>
              {topNumbers.length > 0 ? (
                topNumbers.map((item) => {
                  const info = getNumberInfo(item.number);
                  return (
                    <div key={item.number} className="grid grid-cols-6 items-center py-1 text-[10px] border-b border-border-default/30 text-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[8px] mx-auto ${getColorClass(item.number)}`}>
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
                })
              ) : (
                <div className="text-center py-4 text-text-muted text-xs">
                  ⏳ Aguardando números reais...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* VÍDEO */}
        <div className="xl:col-span-7">
          {showVideo && selectedSlug ? (
            <LiveGameView
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

        {/* GRUPOS E ASSERTIVIDADE */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-bg-card border border-border-default rounded-2xl p-4">
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-3">📈 Grupos</h3>
            <div className="text-[10px] text-text-muted uppercase mb-2">Sequência atual</div>
            <div className="p-3 rounded-xl bg-gradient-to-r from-bg-tertiary to-bg-secondary border border-border-default text-center mb-3">
              <div className="text-xs font-bold text-text-primary">
                {isRealData && history.length > 0 ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className={`px-2 py-0.5 rounded ${getColorClass(history[0] || 0)} text-[10px] font-bold`}>
                      {getNumberInfo(history[0] || 0).color.toUpperCase()}
                    </span>
                    <span>—</span>
                    <span className="text-text-secondary">{getNumberInfo(history[0] || 0).range.toUpperCase()}</span>
                    {isConnected && (
                      <span className="text-[8px] text-emerald-400">● REAL</span>
                    )}
                  </span>
                ) : (
                  <span className="text-yellow-400">⏳ Aguardando...</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 text-center">
              {lastThree.map((num, idx) => (
                <div key={idx} className="text-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${num !== '--' ? getColorClass(Number(num)) : 'bg-bg-tertiary text-text-muted'}`}>
                    {num}
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
                {isRealData ? '⬆ Forte' : '⏳ Aguardando...'}
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
                    <span className="font-bold" style={{ color: s.color }}>
                      {isRealData ? s.assertiveness : '--'}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: isRealData ? `${s.assertiveness}%` : '0%', backgroundColor: s.color }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <SignalGenerator history={isRealData ? history : []} />
      </div>
    </div>
  );
}
