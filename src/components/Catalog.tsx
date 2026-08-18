// src/components/Catalog.tsx
import { useState, useEffect } from 'react';

export function Catalog({ history }: { history: any[] }) {
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [totalRounds, setTotalRounds] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [cardHistory, setCardHistory] = useState<any[]>([]);

  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const totalShoeCards = 416; // 8 baralhos × 52
  const copiesPerCard = 32; // 8 baralhos × 4 naipes

  useEffect(() => {
    console.log('📊 Catalog - Atualizando com', history?.length || 0, 'rodadas');

    if (!history || history.length === 0) {
      const empty: Record<string, number> = {};
      for (const suit of suits) {
        for (const rank of ranks) {
          empty[`${rank}${suit}`] = 0;
        }
      }
      setCardCounts(empty);
      setTotalRounds(0);
      setTotalCards(0);
      return;
    }

    const counts: Record<string, number> = {};
    for (const suit of suits) {
      for (const rank of ranks) {
        counts[`${rank}${suit}`] = 0;
      }
    }

    let rounds = 0;
    let cards = 0;

    for (const round of history) {
      if (round.troca_de_baralho) {
        for (const suit of suits) {
          for (const rank of ranks) {
            counts[`${rank}${suit}`] = 0;
          }
        }
        rounds = 0;
        cards = 0;
        continue;
      }

      rounds++;
      
      // Conta casa
      if (round.home && counts[round.home] !== undefined) {
        counts[round.home] = (counts[round.home] || 0) + 1;
        cards++;
      }
      
      // Conta visitante
      if (round.away && counts[round.away] !== undefined) {
        counts[round.away] = (counts[round.away] || 0) + 1;
        cards++;
      }
    }

    setCardCounts(counts);
    setTotalRounds(rounds);
    setTotalCards(cards);

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
      percentage: totalRounds > 0 ? (count / totalRounds) * 100 : 0,
      remaining: copiesPerCard - count,
      consumedPercent: (count / copiesPerCard) * 100
    }));

  const cardsObserved = totalCards;
  const cardsRemaining = totalShoeCards - cardsObserved;
  const shoeConsumed = totalRounds > 0 ? (cardsObserved / totalShoeCards) * 100 : 0;

  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-4 space-y-4">
      {/* Cabeçalho com estatísticas */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-text-primary text-sm">📊 Catálogo {sortedCards.length > 0 ? '🔴' : '⏳'}</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
          <div className="p-2 rounded-lg bg-bg-tertiary border border-border-default text-center">
            <span className="text-text-muted">Rodadas</span>
            <div className="font-bold text-text-primary">{totalRounds}</div>
          </div>
          <div className="p-2 rounded-lg bg-bg-tertiary border border-border-default text-center">
            <span className="text-text-muted">Cartas</span>
            <div className="font-bold text-emerald-400">{cardsObserved} / {totalShoeCards}</div>
          </div>
          <div className="p-2 rounded-lg bg-bg-tertiary border border-border-default text-center">
            <span className="text-text-muted">Shoe</span>
            <div className="font-bold text-accent-amber">{shoeConsumed.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Lista de cartas */}
      <div className="space-y-1 max-h-[350px] overflow-y-auto">
        <div className="grid grid-cols-5 text-[8px] text-text-muted uppercase py-0.5 border-b border-border-default text-center sticky top-0 bg-bg-card">
          <span>Carta</span>
          <span>Saiu</span>
          <span>Restam</span>
          <span>%</span>
          <span>Barra</span>
        </div>
        
        {sortedCards.length > 0 ? (
          sortedCards.map((card) => {
            const suit = card.card.slice(-1);
            const color = suit === '♥️' || suit === '♦️' ? 'text-red-400' : 'text-text-primary';
            const barWidth = Math.min(card.consumedPercent, 100);
            
            return (
              <div
                key={card.card}
                className="grid grid-cols-5 items-center py-0.5 text-[10px] border-b border-border-default/30 text-center cursor-pointer hover:bg-bg-tertiary/50 transition-colors"
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
                <span className={`font-bold ${card.remaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {card.remaining}
                </span>
                <span className="text-text-secondary">{card.consumedPercent.toFixed(1)}%</span>
                <div className="w-full h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500/70 transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
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

      {/* Legenda */}
      <div className="border-t border-border-default pt-2 flex items-center justify-between text-[8px] text-text-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Disponível
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Esgotado
          </span>
        </div>
        <span>{totalShoeCards} cartas • {copiesPerCard} cópias/carta</span>
      </div>

      {/* Detalhe da carta selecionada */}
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
