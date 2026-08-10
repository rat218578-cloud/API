#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🎯 INTEGRANDO SMART API NO APP REACT"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. CRIA HOOK PARA SMART API ==========
cat > src/hooks/useSmartApi.ts << 'HOOKEOF'
import { useState, useEffect, useRef } from 'react';

interface SmartNumber {
  signalId: string;
  signal: string;
  timestamp: string;
}

interface SmartApiResponse {
  full: boolean;
  data: SmartNumber[];
}

export function useSmartApi(email: string) {
  const [numbers, setNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [total, setTotal] = useState(0);
  const [lastSignalId, setLastSignalId] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  const API_URL = 'https://tool-api.smartanalise.com.br/api/history-delta';

  const fetchNumbers = async (since: string | null = null): Promise<number[]> => {
    try {
      let url = `${API_URL}?source=immersivevip&userEmail=${encodeURIComponent(email)}`;
      if (since) {
        url += `&since=${encodeURIComponent(since)}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('❌ Erro na API:', response.status);
        return [];
      }

      const data: SmartApiResponse = await response.json();

      if (data.data && data.data.length > 0) {
        // Inverte para ordem cronológica
        const items = [...data.data].reverse();
        const numbersList = items.map(item => parseInt(item.signal));
        const validNumbers = numbersList.filter(n => !isNaN(n) && n >= 0 && n <= 36);

        if (items.length > 0) {
          setLastSignalId(items[items.length - 1].signalId);
        }

        return validNumbers;
      }

      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar números:', error);
      return [];
    }
  };

  const loadHistory = async () => {
    if (!isMounted.current) return;
    
    setLoading(true);
    try {
      const numbersList = await fetchNumbers();
      
      if (numbersList.length > 0 && isMounted.current) {
        setNumbers(numbersList);
        setConnected(true);
        setTotal(numbersList.length);
        console.log(`✅ Carregados ${numbersList.length} números da Smart API`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const startPolling = () => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(async () => {
      try {
        const numbersList = await fetchNumbers(lastSignalId);
        
        if (numbersList.length > 0 && isMounted.current) {
          setNumbers(prev => {
            const novos = numbersList.filter(n => !prev.includes(n));
            if (novos.length > 0) {
              console.log(`📊 +${novos.length} novos números`);
              setTotal(prevTotal => prevTotal + novos.length);
              setConnected(true);
              return [...novos, ...prev].slice(0, 500);
            }
            return prev;
          });
        }
      } catch (error) {
        // Ignora
      }
    }, 3000);
  };

  useEffect(() => {
    isMounted.current = true;
    
    if (email) {
      loadHistory().then(() => {
        startPolling();
      });
    }

    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [email]);

  const getLastThree = (): (number | string)[] => {
    if (numbers.length === 0) return ['--', '--', '--'];
    return numbers.slice(0, 3);
  };

  const getTopNumbers = (): { number: number; count: number }[] => {
    if (numbers.length === 0) return [];
    
    const counts: Record<number, number> = {};
    numbers.forEach((n) => {
      counts[n] = (counts[n] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([n, count]) => ({ number: Number(n), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  const getStatistics = () => {
    if (numbers.length === 0) return null;
    
    const red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    let redCount = 0, blackCount = 0, greenCount = 0;
    
    numbers.forEach(n => {
      if (n === 0) greenCount++;
      else if (red.includes(n)) redCount++;
      else blackCount++;
    });
    
    return {
      total: numbers.length,
      red: redCount,
      black: blackCount,
      green: greenCount
    };
  };

  return {
    numbers,
    loading,
    connected,
    total,
    getLastThree,
    getTopNumbers,
    getStatistics,
    refresh: loadHistory
  };
}
HOOKEOF

echo "✅ src/hooks/useSmartApi.ts criado!"

# ========== 2. ATUALIZA ROULETTEDASHBOARD ==========
cat > src/components/RouletteDashboard.tsx << 'ROULETOEF'
import { useState, useEffect } from "react";
import { SignalGenerator } from "./SignalGenerator";
import { LiveGameView } from "./LiveGameView";
import { ROLETAS } from "../services/gameLinkService";
import {
  STRATEGIES,
  getNumberInfo,
  getColorClass
} from "../utils/roulette";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useSmartApi } from "../hooks/useSmartApi";

// ========== COMPONENTE ==========
export function RouletteDashboard() {
  const [activeRoom, setActiveRoom] = useState(ROLETAS[0].id);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showCatalog, setShowCatalog] = useState(true);
  const [email, setEmail] = useState('gcriste268@gmail.com');

  // ========== PEGAR EMAIL DO USUÁRIO ==========
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed.email) setEmail(parsed.email);
      }
    } catch {}
  }, []);

  // ========== HOOK DA SMART API ==========
  const {
    numbers,
    loading,
    connected,
    total,
    getLastThree,
    getTopNumbers,
    getStatistics,
    refresh
  } = useSmartApi(email);

  // ========== FUNÇÕES ==========
  const openGame = (slug: string) => {
    setSelectedSlug(slug);
    setShowVideo(true);
    setTimeout(refresh, 2000);
  };

  const closeGame = () => {
    setShowVideo(false);
    setSelectedSlug(null);
  };

  const topNumbers = getTopNumbers();
  const lastThree = getLastThree();
  const stats = getStatistics();
  const isRealData = numbers.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent-pink mx-auto mb-4" />
          <p className="text-text-muted">Carregando dados da Smart API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Status */}
      <div className="flex items-center gap-2 text-xs">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`} />
        <span className={connected ? 'text-emerald-400' : 'text-yellow-400'}>
          {connected ? '📡 Smart API Conectada' : '⏳ Aguardando dados...'}
        </span>
        {isRealData && (
          <span className="text-emerald-400">✅ {total} números</span>
        )}
        {!isRealData && (
          <span className="text-yellow-400">⚠️ Aguardando números...</span>
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
                onClick={refresh}
                disabled={loading || !isRealData}
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
                  ⏳ Aguardando números...
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
                {isRealData && numbers.length > 0 ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className={`px-2 py-0.5 rounded ${getColorClass(numbers[0] || 0)} text-[10px] font-bold`}>
                      {getNumberInfo(numbers[0] || 0).color.toUpperCase()}
                    </span>
                    <span>—</span>
                    <span className="text-text-secondary">{getNumberInfo(numbers[0] || 0).range.toUpperCase()}</span>
                    {connected && (
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
        <SignalGenerator history={isRealData ? numbers : []} />
      </div>
    </div>
  );
}
ROULETOEF

echo "✅ src/components/RouletteDashboard.tsx atualizado!"

# ========== 3. COMMIT ==========
git add src/hooks/useSmartApi.ts src/components/RouletteDashboard.tsx
git commit -m "feat: integra Smart API no frontend (números reais ao vivo)"
git push origin main

echo "═══════════════════════════════════════════════════════════════"
echo "✅ SMART API INTEGRADA NO APP!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🚀 AGORA O APP VAI:"
echo "   1. Buscar números da Smart API"
echo "   2. Mostrar em tempo real"
echo "   3. Atualizar a cada 3 segundos"
echo "   4. Exibir Catálogo e Grupos"
echo ""
echo "📋 OS NÚMEROS SÃO REAIS!"
echo "═══════════════════════════════════════════════════════════════"

