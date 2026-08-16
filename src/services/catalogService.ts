// src/services/catalogService.ts

export interface CardCount {
  card: string;
  rank: string;
  suit: string;
  count: number;
  percentage: number;
}

class CatalogService {
  private static instance: CatalogService;
  private cardCounts: Record<string, number> = {};
  private totalRounds: number = 0;
  private suits: string[] = ['♠️', '♥️', '♦️', '♣️'];
  private ranks: string[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  static getInstance(): CatalogService {
    if (!CatalogService.instance) {
      CatalogService.instance = new CatalogService();
    }
    return CatalogService.instance;
  }

  reset() {
    this.cardCounts = {};
    this.totalRounds = 0;
    
    for (const suit of this.suits) {
      for (const rank of this.ranks) {
        const card = `${rank}${suit}`;
        this.cardCounts[card] = 0;
      }
    }
  }

  observeCard(cardFull: string): boolean {
    if (!cardFull) return false;
    
    const suit = cardFull.slice(-1);
    
    if (!this.suits.includes(suit)) return false;
    
    this.cardCounts[cardFull] = (this.cardCounts[cardFull] || 0) + 1;
    return true;
  }

  processRound(round: any) {
    if (!round || round.troca_de_baralho) {
      this.reset();
      return;
    }
    
    this.totalRounds++;
    
    if (round.home) this.observeCard(round.home);
    if (round.away) this.observeCard(round.away);
  }

  processHistory(history: any[]) {
    if (!history || history.length === 0) return;
    
    this.reset();
    
    for (const round of history) {
      this.processRound(round);
    }
  }

  getStats(): { topCards: CardCount[]; totalRounds: number } {
    const topCards: CardCount[] = [];
    const totalRounds = this.totalRounds || 1;
    
    const sorted = Object.entries(this.cardCounts)
      .sort((a, b) => b[1] - a[1]);
    
    for (const [card, count] of sorted) {
      if (count > 0) {
        const rank = card.slice(0, -1);
        const suit = card.slice(-1);
        topCards.push({
          card,
          rank,
          suit,
          count,
          percentage: (count / totalRounds) * 100
        });
      }
    }
    
    return {
      topCards,
      totalRounds: this.totalRounds
    };
  }

  getCardCount(card: string): number {
    return this.cardCounts[card] || 0;
  }

  getTotalRounds(): number {
    return this.totalRounds;
  }
}

export const catalogService = CatalogService.getInstance();
