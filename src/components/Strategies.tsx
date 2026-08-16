// src/components/Strategies.tsx
import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface StrategiesProps {
  history: any[];
  onNotify?: (message: string, type: 'casa' | 'visitante' | 'empate') => void;
}

export function Strategies({ history, onNotify }: StrategiesProps) {
  const [patterns, setPatterns] = useState<string[]>([]);
  const [nextBet, setNextBet] = useState<string>('Aguardando');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [activeStrategy, setActiveStrategy] = useState<'g1' | 'g2'>('g1');
  const [lastSignal, setLastSignal] = useState<string | null>(null);

  // 🔵🔴 ESTRATÉGIAS G1
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

  // 🔵🔴 ESTRATÉGIAS G2 - TOP G2
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

  // Mapeia resultado para símbolo
  const getSymbol = (resultado: string): string => {
    if (resultado === 'H') return 'C'; // Casa
    if (resultado === 'A') return 'V'; // Visitante
    if (resultado === 'D') return 'E'; // Empate
    return '';
  };

  // Obtém a cor para o tipo de aposta
  const getBetColor = (bet: string): string => {
    if (bet === 'CASA') return 'text-emerald-400';
    if (bet === 'VISITANTE') return 'text-red-400';
    if (bet === 'EMPATE') return 'text-yellow-400';
    return 'text-text-muted';
  };

  // Verifica padrões
  useEffect(() => {
    if (!history || history.length === 0) return;

    const recentes = history
      .filter((h: any) => !h.troca_de_baralho)
      .slice(0, 15)
      .map((h: any) => getSymbol(h.resultado));

    if (recentes.length < 3) return;

    const foundPatterns: string[] = [];
    let bestNext = 'Aguardando';
    let bestConfidence = 0;
    const currentStrategies = activeStrategy === 'g1' ? strategiesG1 : strategiesG2;

    for (const strategy of currentStrategies) {
      const pattern = strategy.pattern;
      const lastN = recentes.slice(0, pattern.length);
      
      // Verifica se o padrão bate
      let match = true;
      for (let i = 0; i < pattern.length && i < lastN.length; i++) {
        if (lastN[i] !== pattern[i]) {
          match = false;
          break;
        }
      }

      if (match) {
        const nextSymbol = strategy.next;
        let nextName = 'Aguardando';
        if (nextSymbol === 'C') nextName = 'CASA';
        else if (nextSymbol === 'V') nextName = 'VISITANTE';
        else if (nextSymbol === 'E') nextName = 'EMPATE';
        
        const patternStr = pattern.join(' → ');
        foundPatterns.push(`↔️ ${patternStr} → ${nextName} (${strategy.name})`);
        
        if (nextName !== 'Aguardando') {
          bestNext = nextName;
          bestConfidence = 100 - (foundPatterns.length * 3);
          
          // Notifica se encontrou padrão
          if (onNotify && soundEnabled && bestConfidence > 70) {
            const type = nextSymbol === 'C' ? 'casa' : nextSymbol === 'V' ? 'visitante' : 'empate';
            onNotify(`🎯 Sinal: ${nextName} (${bestConfidence}%)`, type);
            setLastSignal(`${nextName} (${bestConfidence}%)`);
            
            // Vibração
            if (vibrationEnabled && navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
          }
        }
        break;
      }
    }

    setPatterns(foundPatterns);
    setNextBet(bestConfidence > 60 ? bestNext : 'Aguardando');
  }, [history, activeStrategy, soundEnabled, vibrationEnabled, onNotify]);

  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text-primary text-sm">🎯 Estratégias</h3>
        <div className="flex items-center gap-2">
          {/* ✅ BOTÕES G1 / G2 */}
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
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg transition-colors ${
              soundEnabled ? 'text-text-primary hover:bg-bg-tertiary' : 'text-text-muted'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Próxima entrada */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-accent-pink/10 to-violet-500/10 border border-accent-pink/20 text-center">
        <div className="text-[10px] text-text-muted">Próxima entrada</div>
        <div className={`text-xl font-bold ${getBetColor(nextBet)}`}>
          {nextBet}
        </div>
        {lastSignal && (
          <div className="text-[8px] text-text-muted mt-1">
            Último sinal: {lastSignal}
          </div>
        )}
      </div>

      {/* Padrões detectados */}
      <div className="space-y-1 max-h-[150px] overflow-y-auto">
        {patterns.length > 0 ? (
          patterns.map((p, idx) => (
            <div key={idx} className="text-[10px] text-text-secondary py-1 px-2 rounded-lg bg-bg-tertiary/50">
              {p}
            </div>
          ))
        ) : (
          <div className="text-center text-[10px] text-text-muted py-4">
            ⏳ Aguardando padrões...
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-4 text-[8px] text-text-muted border-t border-border-default pt-2">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          C = Casa
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          V = Visitante
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          E = Empate
        </span>
      </div>
    </div>
  );
}
