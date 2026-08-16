// src/components/Catalog.tsx
import { useState, useEffect } from 'react';
import { catalogService, CardCount } from '../services/catalogService';

interface CatalogProps {
  history: any[];
}

export function Catalog({ history }: CatalogProps) {
  const [cards, setCards] = useState<CardCount[]>([]);
  const [totalRounds, setTotalRounds] = useState(0);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [cardHistory, setCardHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!history || history.length === 0) {
      catalogService.reset();
      const stats = catalogService.getStats();
      setCards(stats.topCards);
      setTotalRounds(0);
      return;
    }

    catalogService.processHistory(history);
    const stats = catalogService.getStats();
    setCards(stats.topCards);
    setTotalRounds(stats.totalRounds);

    if (selectedCard) {
      const historyCards = history
        .filter((h: any) => (h.home === selectedCard || h.away === selectedCard) && !h.troca_de_baralho)
        .slice(0, 10);
      setCardHistory(historyCards);
    }
  }, [history, selectedCard]);

  const suits: string[] = ['♠️', '♥️', '♦️', '♣️'];
  const ranks: string[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const getCardCount = (rank: string, suit: string): number => {
    const card = `${rank}${suit}`;
    return catalogService.getCardCount(card);
  };

  const getCardPercentage = (rank: string, suit: string): string => {
    const count = getCardCount(rank, suit);
    if (totalRounds === 0) return '0.0';
    return ((count / totalRounds) * 100).toFixed(1);
  };

  const getBarWidth = (count: number): string => {
    const max = 32;
    const percentage = (count / max) * 100;
    return `${Math.min(percentage, 100)}%`;
  };

  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-text-primary text-sm">📊 Catálogo {cards.length > 0 ? '🔴' : '⏳'}</h3>
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span>📊 {totalRounds} rodadas</span>
          <span>🃏 {cards.length} cartas</span>
        </div>
      </div>

      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        <div className="grid grid-cols-4 text-[8px] text-text-muted uppercase py-0.5 border-b border-border-default text-center">
          <span>Carta</span>
          <span>Total</span>
          <span>%</span>
          <span></span>
        </div>
        {cards.length > 0 ? (
          cards.slice(0, 12).map((card) => (
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
              <span className={`font-bold ${
                card.suit === '♥️' || card.suit === '♦️' ? 'text-red-400' : 'text-text-primary'
              }`}>
                {card.card}
              </span>
              <span className="text-text-secondary">{card.count}</span>
              <span className="text-text-secondary">{card.percentage.toFixed(1)}%</span>
              <div className="w-full h-1 rounded-full bg-bg-tertiary overflow-hidden">
                <div 
                  className="h-full rounded-full bg-emerald-500/50 transition-all"
                  style={{ width: getBarWidth(card.count) }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-text-muted text-xs">⏳ Aguardando cartas...</div>
        )}
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
