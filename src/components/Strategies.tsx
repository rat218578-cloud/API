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

  // 🔵🔴 Estratégias G1
  const strategies = [
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

  // Mapeia resultado para símbolo
  const getSymbol = (resultado: string): string => {
    if (resultado === 'H') return 'C'; // Casa
    if (resultado === 'A') return 'V'; // Visitante
    if (resultado === 'D') return 'E'; // Empate
    return '';
  };

  // Verifica padrões
  useEffect(() => {
    if (!history || history.length === 0) return;

    const recentes = history
      .filter((h: any) => !h.troca_de_baralho)
      .slice(0, 10)
      .map((h: any) => getSymbol(h.resultado));

    if (recentes.length < 3) return;

    const foundPatterns: string[] = [];
    let bestNext = 'Aguardando';
    let bestConfidence = 0;

    for (const strategy of strategies) {
      const pattern = strategy.pattern;
      const lastN = recentes.slice(0, pattern.length);
      
      // Verifica se o padrão bate
      let match = true;
      for (let i = 0; i < pattern.length; i++) {
        if (lastN[i] !== pattern[i]) {
          match = false;
          break;
        }
      }

      if (match) {
        foundPatterns.push(`↔️ ${pattern.join(' → ')} → ${strategy.next}`);
        if (strategy.next === 'C') bestNext = 'CASA';
        else if (strategy.next === 'V') bestNext = 'VISITANTE';
        else if (strategy.next === 'E') bestNext = 'EMPATE';
        bestConfidence = 100 - (foundPatterns.length * 5);
        
        // Notifica se encontrou padrão
        if (onNotify && soundEnabled) {
          const type = strategy.next === 'C' ? 'casa' : strategy.next === 'V' ? 'visitante' : 'empate';
          onNotify(`🎯 Sinal: ${strategy.next}`, type);
          
          // Vibração
          if (vibrationEnabled && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
        }
        break;
      }
    }

    setPatterns(foundPatterns);
    setNextBet(bestConfidence > 50 ? bestNext : 'Aguardando');
  }, [history]);

  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text-primary text-sm">🎯 Estratégias G1</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg transition-colors ${
              soundEnabled ? 'text-text-primary hover:bg-bg-tertiary' : 'text-text-muted'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setVibrationEnabled(!vibrationEnabled)}
            className={`p-1.5 rounded-lg transition-colors text-xs ${
              vibrationEnabled ? 'text-emerald-400' : 'text-text-muted'
            }`}
          >
            {vibrationEnabled ? '🔔' : '🔕'}
          </button>
        </div>
      </div>

      {/* Próxima entrada */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-accent-pink/10 to-violet-500/10 border border-accent-pink/20 text-center">
        <div className="text-[10px] text-text-muted">Próxima entrada</div>
        <div className="text-xl font-bold text-accent-pink">
          {nextBet}
        </div>
      </div>

      {/* Padrões detectados */}
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
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
