// src/components/ShoeCatalog.tsx
import { useState, useEffect } from 'react';
import { shoeCatalog } from '../services/shoeCatalogService';

interface ShoeCatalogProps {
  history: any[];
}

export function ShoeCatalog({ history }: ShoeCatalogProps) {
  const [stats, setStats] = useState<any>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [cardHistory, setCardHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!history || history.length === 0) {
      shoeCatalog.reset();
      setStats(shoeCatalog.getStats());
      return;
    }

    shoeCatalog.processHistory(history);
    const newStats = shoeCatalog.getStats();
    setStats(newStats);

    if (selectedCard) {
      const historyCards = history
        .filter((h: any) => (h.home === selectedCard || h.away === selectedCard) && !h.troca_de_baralho)
        .slice(0, 10);
      setCardHistory(historyCards);
    }
  }, [history, selectedCard]);

  if (!stats) return null;

  const suits: ('♠️' | '♥️' | '♦️' | '♣️')[] = ['♠️', '♥️', '♦️', '♣️'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const getCardRemaining = (rank: string, suit: string): number => {
    const card = `${rank}${suit}`;
    const cardData = stats.topCards.find((c: any) => c.card === card);
    return cardData?.remaining || 32;
  };

  const getCardCount = (rank: string, suit: string): number => {
    const card = `${rank}${suit}`;
    const cardData = stats.topCards.find((c: any) => c.card === card);
    return cardData?.count || 0;
  };

  const getBarWidth = (count: number): string => {
    const max = 32;
    const percentage = (count / max) * 100;
    return `${Math.min(percentage, 100)}%`;
  };

  // ✅ Obtém a contagem correta por rank
  const getRankCount = (rank: string): number => {
    let total = 0;
    for (const suit of suits) {
      const card = `${rank}${suit}`;
      total += stats.cardCounts?.[card] || 0;
    }
    return total;
  };

  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text-primary text-sm">🃏 SHOE #{stats.shoeNumber}</h3>
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span>📊 {stats.totalRounds} rodadas</span>
          <span>👀 {stats.cardsObserved} / {stats.totalCards}</span>
          <span className="text-accent-amber">📦 {stats.cardsRemaining}</span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="grid grid-cols-3 text-[8px] text-text-muted uppercase py-0.5 border-b border-border-default text-center">
          <span>Carta</span>
          <span>Total</span>
          <span>%</span>
        </div>
        {stats.topCards.length > 0 ? (
          stats.topCards.map((card: any) => (
            <div 
              key={card.card}
              className="grid grid-cols-3 items-center py-0.5 text-[10px] border-b border-border-default/30 text-center cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
              onClick={() => {
                setSelectedCard(selectedCard === card.card ? null : card.card);
                if (selectedCard !== card.card) {
                  const historyCards = history
                    .filter((h: any) => (h.home === card.card || h.away === card.card) && !h.troca_de_baralho)
                    .slice(0, 10);
                  setCardHistory(historyCards);
                }
              }}
            >
              <span className={`font-bold ${
                card.suit === '♥️' || card.suit === '♦️' ? 'text-red-400' : 'text-text-primary'
              }`}>
                {card.card}
              </span>
              <span className="text-text-secondary">{card.count}</span>
              <span className="text-text-secondary">{card.percentage.toFixed(1)}%</span>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-text-muted text-xs">⏳ Aguardando cartas...</div>
        )}
      </div>

      <div className="border-t border-border-default pt-3">
        <div className="grid grid-cols-4 text-[10px] text-text-muted text-center font-bold border-b border-border-default pb-1">
          {suits.map(suit => (
            <span key={suit}>{suit}</span>
          ))}
        </div>
        
        {ranks.map(rank => {
          const rankTotal = getRankCount(rank);
          const barWidth = getBarWidth(rankTotal);
          
          return (
            <div key={rank} className="grid grid-cols-4 gap-0.5">
              {suits.map(suit => {
                const card = `${rank}${suit}`;
                const remaining = getCardRemaining(rank, suit);
                const isSelected = selectedCard === card;
                
                return (
                  <button
                    key={card}
                    onClick={() => {
                      setSelectedCard(isSelected ? null : card);
                      if (!isSelected) {
                        const historyCards = history
                          .filter((h: any) => (h.home === card || h.away === card) && !h.troca_de_baralho)
                          .slice(0, 10);
                        setCardHistory(historyCards);
                      }
                    }}
                    className={`relative p-0.5 rounded-lg text-center transition-all hover:bg-bg-tertiary ${
                      isSelected ? 'ring-2 ring-accent-pink bg-bg-tertiary' : ''
                    }`}
                  >
                    <div className="text-[8px] font-bold text-text-primary">{rank}</div>
                    <div className="h-1 rounded-full bg-bg-tertiary overflow-hidden">
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
        <div className="border-t border-border-default pt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-text-primary text-xs">{selectedCard}</span>
            <span className="text-[8px] text-text-muted">
              {cardHistory.length} aparições
            </span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {cardHistory.map((h: any, idx: number) => (
              <span key={idx} className="text-[8px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded">
                {new Date(h.horario).toLocaleTimeString('pt-BR')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
