// src/services/shoeTracker.ts

export interface Card {
  rank: string;
  suit: '♠️' | '♥️' | '♦️' | '♣️';
  full: string;
}

export interface ShoeStats {
  totalCards: number;
  cardsObserved: number;
  cardsRemaining: number;
  shoeNumber: number;
  bySuit: {
    '♠️': { total: number; observed: number; remaining: number };
    '♥️': { total: number; observed: number; remaining: number };
    '♦️': { total: number; observed: number; remaining: number };
    '♣️': { total: number; observed: number; remaining: number };
  };
  byRank: Record<string, { total: number; observed: number; remaining: number }>;
}

class ShoeTracker {
  private static instance: ShoeTracker;
  private shoeNumber: number = 1;
  private observedCards: Card[] = [];
  private cardCounts: Record<string, number> = {};
  private suits: ('♠️' | '♥️' | '♦️' | '♣️')[] = ['♠️', '♥️', '♦️', '♣️'];
  private ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  static getInstance(): ShoeTracker {
    if (!ShoeTracker.instance) {
      ShoeTracker.instance = new ShoeTracker();
    }
    return ShoeTracker.instance;
  }

  constructor() {
    this.reset();
  }

  reset() {
    this.shoeNumber = 1;
    this.observedCards = [];
    this.cardCounts = {};
  }

  startNewShoe() {
    this.shoeNumber++;
    this.observedCards = [];
    this.cardCounts = {};
  }

  observeCard(cardFull: string): boolean {
    if (!cardFull) return false;
    
    const rank = cardFull.slice(0, -1);
    const suit = cardFull.slice(-1) as '♠️' | '♥️' | '♦️' | '♣️';
    
    if (!this.suits.includes(suit)) return false;
    
    const key = `${rank}${suit}`;
    this.cardCounts[key] = (this.cardCounts[key] || 0) + 1;
    this.observedCards.push({ rank, suit, full: cardFull });
    
    return true;
  }

  processHistory(history: any[]) {
    if (!history || history.length === 0) return;
    
    const shoeChange = history.find((h: any) => h.troca_de_baralho === true);
    if (shoeChange) {
      this.startNewShoe();
    }
    
    const validRounds = history.filter((h: any) => !h.troca_de_baralho);
    for (const round of validRounds) {
      if (round.home) this.observeCard(round.home);
      if (round.away) this.observeCard(round.away);
    }
  }

  getStats(): ShoeStats {
    const bySuit = {} as any;
    let totalObserved = 0;
    
    for (const suit of this.suits) {
      const observed = this.observedCards.filter(c => c.suit === suit).length;
      const total = 52;
      bySuit[suit] = {
        total,
        observed,
        remaining: total - observed
      };
      totalObserved += observed;
    }

    const byRank = {} as any;
    for (const rank of this.ranks) {
      const observed = this.observedCards.filter(c => c.rank === rank).length;
      const total = 4;
      byRank[rank] = {
        total,
        observed,
        remaining: total - observed
      };
    }

    return {
      totalCards: 416,
      cardsObserved: this.observedCards.length,
      cardsRemaining: 416 - this.observedCards.length,
      shoeNumber: this.shoeNumber,
      bySuit,
      byRank
    };
  }

  getShoeNumber(): number {
    return this.shoeNumber;
  }

  checkAndUpdate(history: any[]): boolean {
    if (!history || history.length === 0) return false;
    
    const shoeChange = history.find((h: any) => h.troca_de_baralho === true);
    if (shoeChange) {
      this.startNewShoe();
    }
    
    const validRounds = history.filter((h: any) => !h.troca_de_baralho);
    let updated = false;
    
    for (const round of validRounds) {
      if (round.home) {
        const key = `${round.home}`;
        if (!this.cardCounts[key] || this.cardCounts[key] === 0) {
          this.observeCard(round.home);
          updated = true;
        }
      }
      if (round.away) {
        const key = `${round.away}`;
        if (!this.cardCounts[key] || this.cardCounts[key] === 0) {
          this.observeCard(round.away);
          updated = true;
        }
      }
    }
    
    return updated;
  }
}

export const shoeTracker = ShoeTracker.getInstance();
