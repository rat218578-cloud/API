// src/components/GruposUnificado.tsx
import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Bell, BellOff } from 'lucide-react';
import { notificationService } from '../services/notificationService';

interface GruposUnificadoProps {
  history: any[];
  stats: { total: number; wins: number; losses: number; draws: number };
}

export function GruposUnificado({ history, stats }: GruposUnificadoProps) {
  const [patterns, setPatterns] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeStrategy, setActiveStrategy] = useState<'g1' | 'g2'>('g1');
  const [lastSignal, setLastSignal] = useState<string | null>(null);
  const [signalHistory, setSignalHistory] = useState<string[]>([]);
  const [patternStrength, setPatternStrength] = useState(0);
  const [patternMax, setPatternMax] = useState(5);
  const [prediction, setPrediction] = useState<string>('AGUARDAR');
  const [mentalistaTop, setMentalistaTop] = useState<any[]>([]);

  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const copiesPerCard = 8;
  const totalShoeCards = 416;

  useEffect(() => {
    notificationService.requestPermission();
  }, []);

  // ✅ ESTRATÉGIAS G1
  const strategiesG1 = [
    { id: 'g1_1', name: '1-2-1', pattern: ['E', 'C', 'C', 'E'], next: 'C', size: 4 },
    { id: 'g1_2', name: '1-2-1', pattern: ['C', 'E', 'E', 'C'], next: 'C', size: 4 },
    { id: 'g1_3', name: '1-3-1', pattern: ['E', 'C', 'C', 'C', 'E'], next: 'E', size: 5 },
    { id: 'g1_4', name: '1-3-1', pattern: ['C', 'E', 'E', 'E', 'C'], next: 'C', size: 5 },
    { id: 'g1_5', name: 'Alternância', pattern: ['E', 'C', 'E'], next: 'C', size: 3 },
    { id: 'g1_6', name: 'Alternância', pattern: ['C', 'E', 'C'], next: 'E', size: 3 },
    { id: 'g1_7', name: 'Predominância', pattern: ['E', 'C', 'C', 'C', 'C'], next: 'C', size: 5 },
    { id: 'g1_8', name: 'Predominância', pattern: ['C', 'E', 'E', 'E', 'E'], next: 'E', size: 5 },
    { id: 'g1_9', name: 'Surf pós quebra', pattern: ['C', 'C', 'C', 'C', 'E', 'C'], next: 'C', size: 6 },
    { id: 'g1_10', name: 'Surf pós quebra', pattern: ['E', 'E', 'E', 'E', 'C', 'E'], next: 'E', size: 6 },
    { id: 'g1_11', name: 'Vermelha após Empate', pattern: ['D', 'C', 'C', 'C'], next: 'C', size: 4 },
    { id: 'g1_12', name: 'Azul após Empate', pattern: ['D', 'E', 'E', 'E'], next: 'E', size: 4 },
  ];

  // ✅ ESTRATÉGIAS G2
  const strategiesG2 = [
    { id: 'g2_1', name: 'TOP G2 #1', pattern: ['E', 'E', 'E', 'C'], next: 'C', size: 4 },
    { id: 'g2_2', name: 'TOP G2 #2', pattern: ['E', 'C', 'E', 'V'], next: 'V', size: 4 },
    { id: 'g2_3', name: 'TOP G2 #3', pattern: ['E', 'E', 'V', 'V'], next: 'V', size: 4 },
    { id: 'g2_4', name: 'TOP G2 #4', pattern: ['E', 'E', 'C', 'C'], next: 'C', size: 4 },
    { id: 'g2_5', name: 'TOP G2 #5', pattern: ['V', 'E', 'C', 'C'], next: 'C', size: 4 },
    { id: 'g2_6', name: 'TOP G2 #6', pattern: ['E', 'V', 'V'], next: 'V', size: 3 },
    { id: 'g2_7', name: 'TOP G2 #7', pattern: ['V', 'V', 'C', 'C'], next: 'C', size: 4 },
    { id: 'g2_8', name: 'TOP G2 #8', pattern: ['C', 'C', 'V', 'V'], next: 'V', size: 4 },
    { id: 'g2_9', name: 'TOP G2 #9', pattern: ['C', 'E', 'E', 'C'], next: 'C', size: 4 },
    { id: 'g2_10', name: 'TOP G2 #10', pattern: ['V', 'E', 'V', 'V'], next: 'V', size: 4 },
    { id: 'g2_11', name: 'TOP G2 #11', pattern: ['V', 'C', 'C'], next: 'C', size: 3 },
    { id: 'g2_12', name: 'TOP G2 #12', pattern: ['E', 'C', 'C'], next: 'C', size: 3 },
    { id: 'g2_13', name: 'TOP G2 #13', pattern: ['C', 'E', 'C', 'V'], next: 'V', size: 4 },
    { id: 'g2_14', name: 'TOP G2 #14', pattern: ['V', 'E', 'V', 'C'], next: 'C', size: 4 },
    { id: 'g2_15', name: 'TOP G2 #15', pattern: ['C', 'V', 'V'], next: 'V', size: 3 },
  ];

  const getSymbol = (resultado: string): string => {
    if (resultado === 'H') return 'C';
    if (resultado === 'A') return 'V';
    if (resultado === 'D') return 'E';
    return '';
  };

  const getBetColor = (bet: string): string => {
    if (bet === 'CASA') return 'text-emerald-400';
    if (bet === 'VISITANTE') return 'text-red-400';
    if (bet === 'EMPATE') return 'text-yellow-400';
    return 'text-text-muted';
  };

  // ✅ MENTALISTA - ANALISA O SHOE
  const analyzeShoe = (history: any[]) => {
    if (!history || history.length === 0) return { topCards: [] };

    const counts: Record<string, number> = {};
    for (const suit of suits) {
      for (const rank of ranks) {
        counts[`${rank}${suit}`] = 0;
      }
    }

    let cards = 0;
    const reversedHistory = [...history].reverse();
    let foundShoeChange = false;

    for (const round of reversedHistory) {
      if (round.troca_de_baralho) {
        foundShoeChange = true;
        for (const suit of suits) {
          for (const rank of ranks) {
            counts[`${rank}${suit}`] = 0;
          }
        }
        cards = 0;
        continue;
      }

      if (!foundShoeChange) {
        if (round.home && counts[round.home] !== undefined) {
          counts[round.home] = (counts[round.home] || 0) + 1;
          cards++;
        }
        if (round.away && counts[round.away] !== undefined) {
          counts[round.away] = (counts[round.away] || 0) + 1;
          cards++;
        }
      }
    }

    const totalRemaining = totalShoeCards - cards;
    
    // ✅ RANKING POR DISPONIBILIDADE
    const ranked = Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([card, count]) => ({
        card,
        remaining: copiesPerCard - count,
        probability: totalRemaining > 0 ? (copiesPerCard - count) / totalRemaining : 0
      }))
      .sort((a, b) => b.remaining - a.remaining);

    const top5 = ranked.slice(0, 5);

    return { topCards: top5 };
  };

  // ✅ CALCULA O SCORE COMBINADO
  const calculateCombinedScore = (patternNext: string, patternConfidence: number, mentalistaData: any) => {
    const patternWeight = 0.6;
    const mentalistaWeight = 0.4;

    let mentalistaPrediction = 'AGUARDAR';
    let mentalistaScore = 0;

    if (mentalistaData.topCards && mentalistaData.topCards.length > 0) {
      let casaCount = 0, visitanteCount = 0, empateCount = 0;
      for (const card of mentalistaData.topCards) {
        const rank = card.card.slice(0, -1);
        const suit = card.card.slice(-1);
        const isHigh = ['A', 'K', 'Q', 'J', '10'].includes(rank);
        const isRed = suit === '♥️' || suit === '♦️';
        
        if (isHigh && isRed) casaCount += card.remaining;
        else if (isHigh && !isRed) visitanteCount += card.remaining;
        else if (rank === 'A' || rank === 'K') empateCount += card.remaining;
      }
      
      const total = casaCount + visitanteCount + empateCount || 1;
      if (casaCount > visitanteCount && casaCount > empateCount) {
        mentalistaPrediction = 'CASA';
        mentalistaScore = (casaCount / total) * 100;
      } else if (visitanteCount > casaCount && visitanteCount > empateCount) {
        mentalistaPrediction = 'VISITANTE';
        mentalistaScore = (visitanteCount / total) * 100;
      } else if (empateCount > 0) {
        mentalistaPrediction = 'EMPATE';
        mentalistaScore = (empateCount / total) * 100;
      }
    }

    let bestName = 'AGUARDAR';
    let bestScore = 0;

    const options = ['CASA', 'VISITANTE', 'EMPATE'];
    for (const option of options) {
      let patternScore = 0;
      if (patternNext === option) patternScore = patternConfidence;

      let mentalScore = 0;
      if (mentalistaPrediction === option) mentalScore = mentalistaScore;

      const totalScore = (patternScore * patternWeight) + (mentalScore * mentalistaWeight);
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestName = option;
      }
    }

    return { prediction: bestName, confidence: Math.round(Math.min(bestScore, 95)) };
  };

  // ✅ PROCESSA DADOS
  useEffect(() => {
    if (!history || history.length === 0) {
      setPrediction('AGUARDAR');
      setPatternStrength(0);
      setPatternMax(5);
      return;
    }

    const validRounds = history.filter((h: any) => !h.troca_de_baralho);
    if (validRounds.length < 3) {
      setPrediction('AGUARDAR');
      setPatternStrength(0);
      setPatternMax(5);
      return;
    }

    // ✅ 1. ANALISA PADRÕES G1/G2
    const recentes = validRounds.slice(0, 10).map((h: any) => getSymbol(h.resultado));
    const currentStrategies = activeStrategy === 'g1' ? strategiesG1 : strategiesG2;
    
    let foundPatterns: string[] = [];
    let nextName = 'AGUARDAR';
    let bestConfidence = 0;
    let strength = 0;
    let maxSize = 5;

    for (const strategy of currentStrategies) {
      const pattern = strategy.pattern;
      const size = strategy.size;
      
      if (recentes.length < size) continue;
      
      const lastN = recentes.slice(0, size);
      let match = true;
      for (let i = 0; i < size; i++) {
        if (lastN[i] !== pattern[i]) {
          match = false;
          break;
        }
      }

      if (match) {
        const nextSymbol = strategy.next;
        if (nextSymbol === 'C') nextName = 'CASA';
        else if (nextSymbol === 'V') nextName = 'VISITANTE';
        else if (nextSymbol === 'E') nextName = 'EMPATE';
        
        bestConfidence = Math.max(100 - (size * 2), 70);
        strength = Math.min(recentes.length, size);
        maxSize = size;
        
        const patternStr = pattern.map(s => 
          s === 'C' ? 'CASA' : s === 'V' ? 'VISIT' : 'EMP'
        ).join(' → ');
        foundPatterns.push(`↔️ ${patternStr} → ${nextName} (${strategy.name})`);
        break;
      }
    }

    // ✅ 2. ANALISA O SHOE (MENTALISTA)
    const mentalistaData = analyzeShoe(history);
    setMentalistaTop(mentalistaData.topCards);

    // ✅ 3. COMBINA OS SCORES
    const combined = calculateCombinedScore(nextName, bestConfidence, mentalistaData);
    
    setPrediction(combined.prediction);
    setPatterns(foundPatterns);
    setPatternStrength(strength);
    setPatternMax(maxSize);

    // ✅ NOTIFICA SE ENCONTROU PADRÃO
    if (combined.confidence > 70 && combined.prediction !== 'AGUARDAR') {
      const type = combined.prediction === 'CASA' ? 'casa' : 
                   combined.prediction === 'VISITANTE' ? 'visitante' : 'empate';
      const message = `${combined.prediction} - ${combined.confidence}% de confiança`;
      
      setSignalHistory(prev => [`${new Date().toLocaleTimeString()} - ${message}`, ...prev].slice(0, 20));
      
      if (notificationsEnabled && soundEnabled) {
        notificationService.notify(message, type);
      }
      setLastSignal(`${combined.prediction} (${combined.confidence}%)`);
    }

  }, [history, activeStrategy, notificationsEnabled, soundEnabled]);

  // ✅ PEGA OS ÚLTIMOS 4 RESULTADOS
  const getLastFour = () => {
    if (!history || history.length === 0) return ['--', '--', '--', '--'];
    const recentes = history.filter((h: any) => !h.troca_de_baralho).slice(0, 4);
    return recentes.map((item: any) => {
      if (item.resultado === 'H') return 'C';
      if (item.resultado === 'A') return 'V';
      if (item.resultado === 'D') return 'E';
      return '--';
    });
  };

  const getLastResult = () => {
    if (!history || history.length === 0) return 'Aguardando...';
    const last = history.find((h: any) => !h.troca_de_baralho);
    if (!last) return 'Aguardando...';
    if (last.resultado === 'H') return 'CASA';
    if (last.resultado === 'A') return 'VISITANTE';
    if (last.resultado === 'D') return 'EMPATE';
    return '--';
  };

  const lastFour = getLastFour();
  const lastResult = getLastResult();
  const nomesSequencia = ['Último', 'Penúlt', 'Antep', '2º Antep'];
  const strengthPercent = patternMax > 0 ? (patternStrength / patternMax) * 100 : 0;

  const getResultadoColor = (resultado: string) => {
    if (resultado === 'CASA') return 'bg-emerald-500/20 text-emerald-400';
    if (resultado === 'VISITANTE') return 'bg-red-500/20 text-red-400';
    if (resultado === 'EMPATE') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-bg-tertiary text-text-muted';
  };

  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-4 space-y-4">
      <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-3">📈 Grupos</h3>
      
      {/* ✅ SEQUÊNCIA ATUAL */}
      <div className="text-[10px] text-text-muted uppercase mb-2">Sequência atual</div>
      <div className="p-3 rounded-xl bg-gradient-to-r from-bg-tertiary to-bg-secondary border border-border-default text-center mb-3">
        <div className="text-xs font-bold text-text-primary">
          <span className="flex items-center justify-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getResultadoColor(lastResult)}`}>
              {lastResult}
            </span>
            <span className="text-[8px] text-emerald-400">● REAL</span>
          </span>
        </div>
      </div>
      
      {/* ✅ ÚLTIMOS 4 RESULTADOS */}
      <div className="flex items-center justify-center gap-3 text-center">
        {lastFour.map((num, idx) => (
          <div key={idx} className="text-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              num !== '--' ? (
                num === 'C' ? 'bg-emerald-500/20 text-emerald-400' :
                num === 'V' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              ) : 'bg-bg-tertiary text-text-muted'
            }`}>{num}</div>
            <div className="text-[7px] text-text-muted mt-0.5">{nomesSequencia[idx]}</div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 p-2 rounded-lg bg-bg-tertiary border border-border-default text-center">
        <div className="text-[10px] text-text-muted">Tendência</div>
        <div className="text-sm font-bold text-emerald-400">⬆ Forte</div>
      </div>

      {/* ✅ DIVISOR */}
      <div className="border-t border-border-default my-3"></div>

      {/* ✅ ESTRATÉGIAS G1/G2 */}
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider">🎯 Estratégias</h4>
        <div className="flex items-center gap-1">
          <div className="flex rounded-lg overflow-hidden border border-border-default">
            <button
              onClick={() => setActiveStrategy('g1')}
              className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                activeStrategy === 'g1' 
                  ? 'bg-accent-pink text-white' 
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              G1
            </button>
            <button
              onClick={() => setActiveStrategy('g2')}
              className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                activeStrategy === 'g2' 
                  ? 'bg-accent-pink text-white' 
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              G2
            </button>
          </div>
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`p-1.5 rounded-lg transition-colors ${
              notificationsEnabled ? 'text-emerald-400 hover:bg-bg-tertiary' : 'text-text-muted'
            }`}
          >
            {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg transition-colors ${
              soundEnabled ? 'text-text-primary hover:bg-bg-tertiary' : 'text-text-muted'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ✅ PREVISÃO COMBINADA */}
      <div className={`p-3 rounded-xl text-center border ${
        prediction !== 'AGUARDAR' 
          ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-emerald-500/30' 
          : 'bg-bg-tertiary border-border-default'
      }`}>
        <div className="text-[10px] text-text-muted">
          {prediction !== 'AGUARDAR' ? '🚀 SINAL ATIVO' : '⏳ AGUARDANDO'}
        </div>
        <div className={`text-xl font-bold ${getBetColor(prediction)}`}>
          {prediction !== 'AGUARDAR' ? prediction : 'Selecione as fichas'}
        </div>
        {lastSignal && (
          <div className="text-[8px] text-emerald-400 mt-1 animate-pulse">
            🔔 Último sinal: {lastSignal}
          </div>
        )}
      </div>

      {/* ✅ FORÇA DO PADRÃO + MENTALISTA */}
      {prediction !== 'AGUARDAR' && (
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-text-muted">FORÇA — POS {patternStrength}/{patternMax}</span>
              <span className="font-bold text-emerald-400">{strengthPercent.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${strengthPercent}%` }}
              />
            </div>
          </div>
          
          {/* ✅ MENTALISTA - TOP 3 CARTAS */}
          <div className="bg-bg-tertiary/50 rounded-lg p-2">
            <div className="text-[8px] text-text-muted mb-1">🧠 Mentalista — Top 3 disponíveis</div>
            <div className="flex gap-2">
              {mentalistaTop.slice(0, 3).map((card, idx) => (
                <div key={idx} className="flex items-center gap-1 text-[10px] bg-bg-card px-2 py-0.5 rounded border border-border-default">
                  <span className="font-bold">{card.card}</span>
                  <span className="text-text-muted">{card.remaining}/8</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ✅ PADRÕES DETECTADOS */}
      <div className="space-y-1 max-h-[120px] overflow-y-auto">
        {patterns.length > 0 ? (
          patterns.map((p, idx) => (
            <div key={idx} className="text-[10px] text-text-secondary py-1 px-2 rounded-lg bg-bg-tertiary/50">
              {p}
            </div>
          ))
        ) : (
          <div className="text-center text-[10px] text-text-muted py-3">
            ⏳ Aguardando padrão...
          </div>
        )}
      </div>

      {/* ✅ HISTÓRICO DE SINAIS */}
      {signalHistory.length > 0 && (
        <div className="border-t border-border-default pt-2">
          <div className="text-[8px] text-text-muted mb-1">📋 Últimos sinais:</div>
          <div className="space-y-0.5 max-h-[60px] overflow-y-auto">
            {signalHistory.slice(0, 5).map((s, i) => (
              <div key={i} className="text-[8px] text-text-secondary">{s}</div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ ASSERTIVIDADE DENTRO DE GRUPOS */}
      <div className="border-t border-border-default pt-3">
        <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-2">🎯 Assertividade</h4>
        <div className="space-y-2">
          {[
            { id: 'casa', name: 'CASA', value: stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0, color: '#10b981' },
            { id: 'empate', name: 'EMPATE', value: stats.total > 0 ? ((stats.draws / stats.total) * 100).toFixed(1) : 0, color: '#f59e0b' },
            { id: 'visitante', name: 'VISITANTE', value: stats.total > 0 ? ((stats.losses / stats.total) * 100).toFixed(1) : 0, color: '#ef4444' }
          ].map((s) => (
            <div key={s.id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-secondary">{s.name}</span>
                <span className="font-bold" style={{ color: s.color }}>{s.value}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.value}%`, backgroundColor: s.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LEGENDA */}
      <div className="flex items-center justify-center gap-3 text-[8px] text-text-muted border-t border-border-default pt-2">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> C = Casa
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> C = Casa
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" /> E = Empate
        </span>
      </div>
    </div>
  );
}
