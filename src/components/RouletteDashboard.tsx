import { useState, useMemo, useEffect } from "react";
import { SignalGenerator } from "./SignalGenerator";
import { LiveGameView } from "./LiveGameView";
import { ROLETAS, gameLinkService } from "../services/gameLinkService";
import {
  STRATEGIES,
  getNumberInfo,
  getColorClass
} from "../utils/roulette";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

// ========== COMPONENTE ==========
export function RouletteDashboard() {
  const [activeRoom, setActiveRoom] = useState(ROLETAS[0].id);
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRealData, setIsRealData] = useState(false);
  const [totalNumbers, setTotalNumbers] = useState(0);
  const [topNumbersList, setTopNumbersList] = useState<{number: number, count: number}[]>([]);
  const [currentSource, setCurrentSource] = useState<string | null>(null);

  // ========== BUSCAR NÚMEROS ==========
  const fetchNumbers = async (source: string | null) => {
    if (!source) {
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const email = localStorage.getItem('user_email') || 'gcriste268@gmail.com';
      const url = `https://tool-api.smartanalise.com.br/api/history-delta?source=${source}&userEmail=${encodeURIComponent(email)}`;
      
      console.log(`📡 Buscando números para source: ${source}`);
      
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Dados do source ${source}:`, data);
        
        if (data.data && data.data.length > 0) {
          const numbers = data.data.map((item: any) => parseInt(item.signal));
          const validNumbers = numbers.filter((n: number) => !isNaN(n) && n >= 0 && n <= 36);
          setHistory(validNumbers);
          setIsRealData(true);
          setIsConnected(true);
          setTotalNumbers(validNumbers.length);
          
          const counts: Record<number, number> = {};
          validNumbers.forEach((n: number) => {
            counts[n] = (counts[n] || 0) + 1;
          });
          const top = Object.entries(counts)
            .map(([n, count]) => ({ number: Number(n), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
          setTopNumbersList(top);
          
          console.log(`✅ Carregados ${validNumbers.length} números do source ${source}`);
        } else {
          console.warn(`⚠️ Nenhum número para source ${source}`);
          setHistory([]);
          setIsRealData(false);
        }
      } else {
        console.error(`❌ Erro ao carregar source ${source}:`, response.status);
        setHistory([]);
        setIsRealData(false);
      }
    } catch (error) {
      console.error(`❌ Erro ao carregar source ${source}:`, error);
      setHistory([]);
      setIsRealData(false);
    } finally {
      setLoading(false);
    }
  };

  // ========== CARREGA QUANDO MUDA A MESA ==========
  useEffect(() => {
    if (selectedSlug) {
      const source = gameLinkService.getSourceBySlug(selectedSlug);
      setCurrentSource(source);
      fetchNumbers(source);
    }
  }, [selectedSlug]);

  // ========== POLLING ==========
  useEffect(() => {
    if (!currentSource) return;

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const email = localStorage.getItem('user_email') || 'gcriste268@gmail.com';
        const url = `https://tool-api.smartanalise.com.br/api/history-delta?source=${currentSource}&userEmail=${encodeURIComponent(email)}`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const numbers = data.data.map((item: any) => parseInt(item.signal));
            const validNumbers = numbers.filter((n: number) => !isNaN(n) && n >= 0 && n <= 36);
            if (validNumbers.length > 0) {
              setHistory(validNumbers);
              setIsRealData(true);
              setIsConnected(true);
              setTotalNumbers(validNumbers.length);
              
              const counts: Record<number, number> = {};
              validNumbers.forEach((n: number) => {
                counts[n] = (counts[n] || 0) + 1;
              });
              const top = Object.entries(counts)
                .map(([n, count]) => ({ number: Number(n), count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 8);
              setTopNumbersList(top);
            }
          }
        }
      } catch (error) {
        // Ignora
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentSource]);

  // ========== FUNÇÕES ==========
  const openGame = (slug: string) => {
    setSelectedSlug(slug);
  };

  const closeGame = () => {
    setSelectedSlug(null);
    setCurrentSource(null);
    setHistory([]);
    setIsRealData(false);
    setIsConnected(false);
  };

  const topNumbers = useMemo(() => {
    if (!isRealData || history.length === 0) return [];
    return topNumbersList;
  }, [history, isRealData, topNumbersList]);

  const refreshHistory = () => {
    if (!currentSource) return;
    setLoading(true);
    fetchNumbers(currentSource);
  };

  const getLastThree = () => {
    if (!isRealData || history.length === 0) return ['--', '--', '--'];
    return history.slice(0, 3);
  };

  const roletaAtual = ROLETAS.find(r => r.slug === selectedSlug);
  const showRealData = isRealData;

  const lastThree = getLastThree();

  return (
    <div className="p-4 space-y-4">
      {/* Status */}
      <div className="flex items-center gap-2 text-xs">
        <span className={`w-2 h-2 rounded-full ${isConnected && isRealData ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`} />
        <span className={isConnected && isRealData ? 'text-emerald-400' : 'text-yellow-400'}>
          {isConnected && isRealData ? `📡 ${roletaAtual?.nome || 'Números'} REAIS` : '📡 Conectado'}
        </span>
        {isRealData && (
          <span className="text-emerald-400">✅ {totalNumbers} números</span>
        )}
      </div>

      {/* Botões das roletas */}
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
            {activeRoom === r.id && isRealData && (
              <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">REAL</span>
            )}
          </button>
        ))}
      </div>

      {/* CATÁLOGO + VÍDEO + GRUPOS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* ========== CATÁLOGO COMPLETO ========== */}
        {showRealData && (
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
                {currentSource && (
                  <button
                    onClick={refreshHistory}
                    disabled={loading}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1"
                  >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    {isRealData ? 'REAL' : '⏳'}
                  </button>
                )}
              </div>

              {/* Estratégias */}
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

              {/* Tabela de números */}
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
                    ⏳ Aguardando números...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========== VÍDEO ========== */}
        <div className={showRealData ? "xl:col-span-7" : "xl:col-span-12"}>
          {selectedSlug ? (
            <LiveGameView
              slug={selectedSlug}
              isOpen={true}
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

        {/* ========== GRUPOS E ASSERTIVIDADE ========== */}
        {showRealData && (
          <div className="xl:col-span-3 space-y-4">
            {/* GRUPOS */}
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
                      <span className="text-[8px] text-emerald-400">● REAL</span>
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

            {/* ASSERTIVIDADE */}
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
        )}
      </div>

      {/* ========== SIGNAL GENERATOR ========== */}
      {showRealData && (
        <div className="grid grid-cols-1 gap-4">
          <SignalGenerator history={isRealData ? history : []} />
        </div>
      )}
    </div>
  );
}
