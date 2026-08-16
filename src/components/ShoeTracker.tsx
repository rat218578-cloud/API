// src/components/ShoeTracker.tsx
import { useState, useEffect, useRef } from 'react';
import { shoeTracker, ShoeStats } from '../services/shoeTracker';

interface ShoeTrackerProps {
  history: any[];
}

export function ShoeTracker({ history }: ShoeTrackerProps) {
  const [stats, setStats] = useState<ShoeStats | null>(null);
  const [shoeNumber, setShoeNumber] = useState(1);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [cardHistory, setCardHistory] = useState<any[]>([]);
  const processedRef = useRef<number>(0);

  useEffect(() => {
    if (!history || history.length === 0) return;

    const currentLength = history.length;
    if (currentLength !== processedRef.current) {
      processedRef.current = currentLength;
      
      shoeTracker.checkAndUpdate(history);
      
      const newStats = shoeTracker.getStats();
      setStats(newStats);
      setShoeNumber(shoeTracker.getShoeNumber());
    }

    if (selectedCard) {
      const cardHistoryData = history
        .filter((h: any) => (h.home === selectedCard || h.away === selectedCard) && !h.troca_de_baralho)
        .slice(0, 10);
      setCardHistory(cardHistoryData);
    }
  }, [history, selectedCard]);

  useEffect(() => {
    if (history && history.length > 0) {
      shoeTracker.processHistory(history);
      const newStats = shoeTracker.getStats();
      setStats(newStats);
      setShoeNumber(shoeTracker.getShoeNumber());
      processedRef.current = history.length;
    } else {
      shoeTracker.reset();
      const newStats = shoeTracker.getStats();
      setStats(newStats);
      setShoeNumber(1);
    }
  }, []);

  if (!stats) return null;

  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const suits: ('♠️' | '♥️' | '♦️' | '♣️')[] = ['♠️', '♥️', '♦️', '♣️'];

  const getCardCount = (rank: string): number => {
    return stats.byRank[rank]?.observed || 0;
  };

  const getCardRemaining = (rank: string): number => {
    return stats.byRank[rank]?.remaining || 4;
  };

  const getBarWidth = (count: number): string => {
    const max = 4;
    const percentage = (count / max) * 100;
    return `${Math.min(percentage, 100)}%`;
  };

  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text-primary text-sm">🃏 SHOE #{shoeNumber}</h3>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>Observadas {stats.cardsObserved} / {stats.totalCards}</span>
          <span className="text-accent-amber">Restantes {stats.cardsRemaining}</span>
        </div>
      </div>

      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        <div className="grid grid-cols-4 text-[10px] text-text-muted text-center font-bold border-b border-border-default pb-1">
          {suits.map(suit => (
            <span key={suit}>{suit}</span>
          ))}
        </div>
        
        {ranks.map(rank => {
          const count = getCardCount(rank);
          const remaining = getCardRemaining(rank);
          const barWidth = getBarWidth(count);
          
          return (
            <div key={rank} className="grid grid-cols-4 gap-0.5">
              {suits.map(suit => {
                const cardFull = `${rank}${suit}`;
                const isSelected = selectedCard === cardFull;
                
                return (
                  <button
                    key={cardFull}
                    onClick={() => {
                      setSelectedCard(isSelected ? null : cardFull);
                      if (!isSelected) {
                        const historyCards = history
                          .filter((h: any) => (h.home === cardFull || h.away === cardFull) && !h.troca_de_baralho)
                          .slice(0, 10);
                        setCardHistory(historyCards);
                      }
                    }}
                    className={`relative p-1 rounded-lg text-center transition-all hover:bg-bg-tertiary ${
                      isSelected ? 'ring-2 ring-accent-pink bg-bg-tertiary' : ''
                    }`}
                  >
                    <div className="text-[8px] font-bold text-text-primary">{rank}</div>
                    <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-emerald-500/50 transition-all"
                        style={{ width: barWidth }}
                      />
                    </div>
                    <div className="text-[6px] text-text-muted">{remaining}</div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {selectedCard && cardHistory.length > 0 && (
        <div className="border-t border-border-default pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-text-primary text-sm">{selectedCard}</span>
            <span className="text-[10px] text-text-muted">
              {cardHistory.length} aparições
            </span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {cardHistory.map((h: any, idx: number) => (
              <span key={idx} className="text-[8px] text-text-muted bg-bg-tertiary px-2 py-0.5 rounded">
                {new Date(h.horario).toLocaleTimeString('pt-BR')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
