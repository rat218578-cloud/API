// src/components/Catalog.tsx
import { useState, useEffect } from 'react';

export function Catalog({ history }: { history: any[] }) {
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [totalRounds, setTotalRounds] = useState(0);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [cardHistory, setCardHistory] = useState<any[]>([]);

  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  useEffect(() => {
    if (!history || history.length === 0) {
      const empty: Record<string, number> = {};
      for (const suit of suits) {
        for (const rank of ranks) {
          empty[`${rank}${suit}`] = 0;
        }
      }
      setCardCounts(empty);
      setTotalRounds(0);
      return;
    }

    const counts: Record<string, number> = {};
    for (const suit of suits) {
      for (const rank of ranks) {
        counts[`${rank}${suit}`] = 0;
      }
    }

    let rounds = 0;
    for (const round of history) {
      if (round.troca_de_baralho) {
        for (const suit of suits) {
          for (const rank of ranks) {
            counts[`${rank}${suit}`] = 0;
          }
        }
        rounds = 0;
        continue;
      }

      rounds++;
      if (round.home && counts[round.home] !== undefined) {
        counts[round.home] = (counts[round.home] || 0) + 1;
      }
      if (round.away && counts[round.away] !== undefined) {
        counts[round.away] = (counts[round.away] || 0) + 1;
      }
    }

    setCardCounts(counts);
    setTotalRounds(rounds);

    if (selectedCard) {
      const historyCards = history
        .filter((h: any) => (h.home === selectedCard || h.away === selectedCard) && !h.troca_de_baralho)
        .slice(0, 10);
      setCardHistory(historyCards);
    }
  }, [history, selectedCard]);

  const sortedCards = Object.entries(cardCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([card, count]) => ({
      card,
      count,
      percentage: totalRounds > 0 ? (count / totalRounds) * 100 : 0
    }));

  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text-primary text-sm">📊 Catálogo {sortedCards.length > 0 ? '🔴' : '⏳'}</h3>
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span>📊 {totalRounds} rodadas</span>
          <span>🃏 {sortedCards.length} cartas</span>
        </div>
      </div>

      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        <div className="grid grid-cols-4 text-[8px] text-text-muted uppercase py-0.5 border-b border-border-default text-center sticky top-0 bg-bg-card">
          <span>Carta</span>
          <span>Total</span>
          <span>%</span>
          <span>Restantes</span>
        </div>
        
        {sortedCards.length > 0 ? (
          sortedCards.map((card) => {
            const suit = card.card.slice(-1);
            const color = suit === '♥️' || suit === '♦️' ? 'text-red-400' : 'text-text-primary';
            const remaining = 32 - card.count;
            
            return (
              <div
                key={card.card}
                className="grid grid-cols-4 items-center py-0.5 text-[10px] border-b border-border-default/30 text-center cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
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
                <span className={`font-bold ${color}`}>{card.card}</span>
                <span className="text-text-secondary">{card.count}</span>
                <span className="text-text-secondary">{card.percentage.toFixed(1)}%</span>
                <span className={`font-bold ${remaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {remaining}
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-text-muted text-xs">
            <div className="text-4xl mb-2">🃏</div>
            ⏳ Aguardando cartas...
          </div>
        )}
      </div>

      <div className="border-t border-border-default pt-2 flex items-center justify-between text-[8px] text-text-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Disponível
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Esgotado
          </span>
        </div>
        <span>416 cartas por shoe • 32 cópias por carta</span>
      </div>

      {selectedCard && cardHistory.length > 0 && (
        <div className="border-t border-border-default pt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-text-primary text-xs">{selectedCard}</span>
            <span className="text-[8px] text-text-muted">{cardHistory.length} aparições</span>
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
