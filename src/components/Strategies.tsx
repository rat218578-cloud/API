// src/components/Strategies.tsx
import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Bell, BellOff } from 'lucide-react';
import { notificationService } from '../services/notificationService';

interface StrategiesProps {
  history: any[];
}

export function Strategies({ history }: StrategiesProps) {
  const [patterns, setPatterns] = useState<string[]>([]);
  const [nextBet, setNextBet] = useState<string>('Aguardando');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeStrategy, setActiveStrategy] = useState<'g1' | 'g2'>('g1');
  const [lastSignal, setLastSignal] = useState<string | null>(null);
  const [signalHistory, setSignalHistory] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    notificationService.requestPermission();
  }, []);

  // ESTRATÉGIAS G1
  const strategiesG1 = [
    { id: 'g1_1', name: '1-2-1', pattern: ['E', 'C', 'C', 'E'], next: 'C' },
    { id: 'g1_2', name: '1-2-1', pattern: ['C', 'E', 'E', 'C'], next: 'C' },
    { id: 'g1_3', name: '1-3-1', pattern: ['E', 'C', 'C', 'C', 'E'], next: 'E' },
    { id: 'g1_4', name: '1-3-1', pattern: ['C', 'E', 'E', 'E', 'C'], next: 'C' },
    { id: 'g1_5', name: 'Alternância', pattern: ['E', 'C', 'E'], next: 'C' },
    { id: 'g1_6', name: 'Alternância', pattern: ['C', 'E', 'C'], next: 'E' },
    { id: 'g1_7', name: 'Predominância Vermelha', pattern: ['E', 'C', 'C', 'C', 'C'], next: 'C' },
    { id: 'g1_8', name: 'Predominância Azul', pattern: ['C', 'E', 'E', 'E', 'E'], next: 'E' },
    { id: 'g1_9', name: 'Cor do surf pós quebra', pattern: ['C', 'C', 'C', 'C', 'E', 'C'], next: 'C' },
    { id: 'g1_10', name: 'Cor do surf pós quebra', pattern: ['E', 'E', 'E', 'E', 'C', 'E'], next: 'E' },
    { id: 'g1_11', name: 'Vermelha após Empate', pattern: ['D', 'C', 'C', 'C'], next: 'C' },
    { id: 'g1_12', name: 'Azul após Empate', pattern: ['D', 'E', 'E', 'E'], next: 'E' },
    { id: 'g1_13', name: 'Duplo', pattern: ['D', 'D'], next: 'D' },
    { id: 'g1_14', name: 'Duas Casas', pattern: ['D', 'C', 'C', 'D'], next: 'D' },
    { id: 'g1_15', name: 'Duas Casas', pattern: ['D', 'C', 'E', 'D'], next: 'D' },
    { id: 'g1_16', name: 'Duas Casas', pattern: ['D', 'E', 'C', 'D'], next: 'D' },
    { id: 'g1_17', name: 'Duas Casas', pattern: ['D', 'E', 'E', 'D'], next: 'D' },
  ];

  // ESTRATÉGIAS G2
  const strategiesG2 = [
    { id: 'g2_1', name: 'TOP G2 #1', pattern: ['E', 'E', 'E', 'C'], next: 'C' },
    { id: 'g2_2', name: 'TOP G2 #2', pattern: ['E', 'C', 'E', 'V'], next: 'V' },
    { id: 'g2_3', name: 'TOP G2 #3', pattern: ['E', 'E', 'V', 'V'], next: 'V' },
    { id: 'g2_4', name: 'TOP G2 #4', pattern: ['E', 'E', 'C', 'C'], next: 'C' },
    { id: 'g2_5', name: 'TOP G2 #5', pattern: ['V', 'E', 'C', 'C'], next: 'C' },
    { id: 'g2_6', name: 'TOP G2 #6', pattern: ['E', 'V', 'V'], next: 'V' },
    { id: 'g2_7', name: 'TOP G2 #7', pattern: ['V', 'V', 'C', 'C'], next: 'C' },
    { id: 'g2_8', name: 'TOP G2 #8', pattern: ['C', 'C', 'V', 'V'], next: 'V' },
    { id: 'g2_9', name: 'TOP G2 #9', pattern: ['C', 'E', 'E', 'C'], next: 'C' },
    { id: 'g2_10', name: 'TOP G2 #10', pattern: ['V', 'E', 'V', 'V'], next: 'V' },
    { id: 'g2_11', name: 'TOP G2 #11', pattern: ['V', 'C', 'C'], next: 'C' },
    { id: 'g2_12', name: 'TOP G2 #12', pattern: ['E', 'C', 'C'], next: 'C' },
    { id: 'g2_13', name: 'TOP G2 #13', pattern: ['C', 'E', 'C', 'V'], next: 'V' },
    { id: 'g2_14', name: 'TOP G2 #14', pattern: ['V', 'E', 'V', 'C'], next: 'C' },
    { id: 'g2_15', name: 'TOP G2 #15', pattern: ['C', 'V', 'V'], next: 'V' },
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

  const getBetType = (bet: string): 'casa' | 'visitante' | 'empate' | 'info' => {
    if (bet === 'CASA') return 'casa';
    if (bet === 'VISITANTE') return 'visitante';
    if (bet === 'EMPATE') return 'empate';
    return 'info';
  };

  useEffect(() => {
    if (!history || history.length === 0) {
      setDebugInfo('⏳ Aguardando histórico...');
      return;
    }

    const validRounds = history.filter((h: any) => !h.troca_de_baralho);
    if (validRounds.length < 3) {
      setDebugInfo(`⏳ Aguardando mais rodadas... (${validRounds.length}/3)`);
      return;
    }

    const recentes = validRounds.slice(0, 10).map((h: any) => getSymbol(h.resultado));
    const currentStrategies = activeStrategy === 'g1' ? strategiesG1 : strategiesG2;
    
    let foundPatterns: string[] = [];
    let bestNext = 'Aguardando';
    let bestConfidence = 0;
    let bestType: 'casa' | 'visitante' | 'empate' = 'info';

    for (const strategy of currentStrategies) {
      const pattern = strategy.pattern;
      let match = true;
      for (let i = 0; i < pattern.length && i < recentes.length; i++) {
        if (recentes[i] !== pattern[i]) {
          match = false;
          break;
        }
      }

      if (match) {
        const nextSymbol = strategy.next;
        let nextName = 'Aguardando';
        let type: 'casa' | 'visitante' | 'empate' = 'info';
        
        if (nextSymbol === 'C') { nextName = 'CASA'; type = 'casa'; }
        else if (nextSymbol === 'V') { nextName = 'VISITANTE'; type = 'visitante'; }
        else if (nextSymbol === 'E') { nextName = 'EMPATE'; type = 'empate'; }
        
        const patternStr = pattern.map(s => s === 'C' ? 'CASA' : s === 'V' ? 'VISIT' : 'EMP').join(' → ');
        foundPatterns.push(`↔️ ${patternStr} → ${nextName} (${strategy.name})`);
        
        if (nextName !== 'Aguardando') {
          const confidence = Math.max(100 - (foundPatterns.length * 2), 65);
          bestNext = nextName;
          bestConfidence = confidence;
          bestType = type;
          
          if (confidence > 65 && notificationsEnabled) {
            const message = `${nextName} - ${confidence}% de confiança`;
            setSignalHistory(prev => [`${new Date().toLocaleTimeString()} - ${message}`, ...prev].slice(0, 20));
            
            if (soundEnabled) {
              notificationService.notify(message, type);
            }
            setLastSignal(`${nextName} (${confidence}%)`);
          }
        }
        break;
      }
    }

    if (foundPatterns.length === 0 && recentes.length >= 3) {
      const last3 = recentes.slice(0, 3);
      const last3Str = last3.join('');
      
      if (last3Str === 'CVC' || last3Str === 'VCV') {
        const next = last3Str === 'CVC' ? 'C' : 'V';
        const nextName = next === 'C' ? 'CASA' : 'VISITANTE';
        const type = next === 'C' ? 'casa' : 'visitante';
        foundPatterns.push(`↔️ ${last3.join(' → ')} → ${nextName} (Alternância 3)`);
        bestNext = nextName;
        bestConfidence = 75;
        bestType = type;
        if (notificationsEnabled && soundEnabled) {
          const message = `${nextName} - 75% de confiança`;
          notificationService.notify(message, type);
          setLastSignal(`${nextName} (75%)`);
        }
      }
      
      if (last3Str === 'EEE') {
        foundPatterns.push(`↔️ ${last3.join(' → ')} → CASA (3 Empates)`);
        bestNext = 'CASA';
        bestConfidence = 70;
        bestType = 'casa';
        if (notificationsEnabled && soundEnabled) {
          notificationService.notify('CASA - 70% de confiança', 'casa');
          setLastSignal('CASA (70%)');
        }
      }
    }

    setPatterns(foundPatterns);
    setNextBet(bestConfidence > 60 ? bestNext : 'Aguardando');
    setDebugInfo(`📊 ${validRounds.length} rodadas | Últimos: ${recentes.slice(0, 5).join(' ')}`);
    
  }, [history, activeStrategy, notificationsEnabled, soundEnabled]);

  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text-primary text-sm">🎯 Estratégias</h3>
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

      <div className="p-3 rounded-xl bg-gradient-to-r from-accent-pink/10 to-violet-500/10 border border-accent-pink/20 text-center">
        <div className="text-[10px] text-text-muted">Próxima entrada</div>
        <div className={`text-xl font-bold ${getBetColor(nextBet)}`}>
          {nextBet}
        </div>
        {lastSignal && (
          <div className="text-[8px] text-emerald-400 mt-1 animate-pulse">
            🔔 Último sinal: {lastSignal}
          </div>
        )}
        <div className="text-[6px] text-text-muted mt-1">{debugInfo}</div>
      </div>

      <div className="space-y-1 max-h-[120px] overflow-y-auto">
        {patterns.length > 0 ? (
          patterns.map((p, idx) => (
            <div key={idx} className="text-[10px] text-text-secondary py-1 px-2 rounded-lg bg-bg-tertiary/50">
              {p}
            </div>
          ))
        ) : (
          <div className="text-center text-[10px] text-text-muted py-3">
            ⏳ Aguardando padrões...
          </div>
        )}
      </div>

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

      <div className="flex items-center justify-center gap-3 text-[8px] text-text-muted border-t border-border-default pt-2">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> C = Casa
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> V = Visitante
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" /> E = Empate
        </span>
      </div>
    </div>
  );
}
