// src/services/shoeCatalogService.ts

export interface CardData {
  card: string;
  rank: string;
  suit: string;
  count: number;
  remaining: number;
  total: number;
  percentage: number;
}

export interface ShoeCatalogStats {
  totalCards: number;
  cardsObserved: number;
  cardsRemaining: number;
  shoeNumber: number;
  topCards: CardData[];
  bySuit: {
    '♠️': { total: number; observed: number; remaining: number };
    '♥️': { total: number; observed: number; remaining: number };
    '♦️': { total: number; observed: number; remaining: number };
    '♣️': { total: number; observed: number; remaining: number };
  };
  byRank: Record<string, { total: number; observed: number; remaining: number }>;
  totalRounds: number;
}

class ShoeCatalogService {
  private static instance: ShoeCatalogService;
  private shoeNumber: number = 1;
  private cardCounts: Record<string, number> = {};
  private totalRounds: number = 0;
  private suits: ('♠️' | '♥️' | '♦️' | '♣️')[] = ['♠️', '♥️', '♦️', '♣️'];
  private ranks: string[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  private copiesPerCard: number = 32;

  static getInstance(): ShoeCatalogService {
    if (!ShoeCatalogService.instance) {
      ShoeCatalogService.instance = new ShoeCatalogService();
    }
    return ShoeCatalogService.instance;
  }

  constructor() {
    this.reset();
  }

  reset() {
    this.shoeNumber = 1;
    this.cardCounts = {};
    this.totalRounds = 0;
    
    for (const suit of this.suits) {
      for (const rank of this.ranks) {
        const card = `${rank}${suit}`;
        this.cardCounts[card] = 0;
      }
    }
  }

  startNewShoe() {
    this.shoeNumber++;
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
    
    const suit = cardFull.slice(-1) as '♠️' | '♥️' | '♦️' | '♣️';
    
    if (!this.suits.includes(suit)) return false;
    
    this.cardCounts[cardFull] = (this.cardCounts[cardFull] || 0) + 1;
    return true;
  }

  processRound(round: any) {
    if (!round) return;
    
    if (round.troca_de_baralho) {
      this.startNewShoe();
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

  getStats(): ShoeCatalogStats {
    const totalCards = this.copiesPerCard * 52;
    let cardsObserved = 0;
    
    for (const card of Object.keys(this.cardCounts)) {
      cardsObserved += this.cardCounts[card] || 0;
    }
    
    const cardsRemaining = totalCards - cardsObserved;
    
    const bySuit = {} as any;
    for (const suit of this.suits) {
      let observed = 0;
      for (const rank of this.ranks) {
        const card = `${rank}${suit}`;
        observed += this.cardCounts[card] || 0;
      }
      bySuit[suit] = {
        total: this.copiesPerCard * 13,
        observed,
        remaining: (this.copiesPerCard * 13) - observed
      };
    }

    const byRank = {} as any;
    for (const rank of this.ranks) {
      let observed = 0;
      for (const suit of this.suits) {
        const card = `${rank}${suit}`;
        observed += this.cardCounts[card] || 0;
      }
      byRank[rank] = {
        total: this.copiesPerCard * 4,
        observed,
        remaining: (this.copiesPerCard * 4) - observed
      };
    }

    const topCards: CardData[] = [];
    for (const card of Object.keys(this.cardCounts)) {
      const count = this.cardCounts[card] || 0;
      if (count > 0) {
        const rank = card.slice(0, -1);
        const suit = card.slice(-1) as '♠️' | '♥️' | '♦️' | '♣️';
        topCards.push({
          card,
          rank,
          suit,
          count,
          remaining: this.copiesPerCard - count,
          total: this.copiesPerCard,
          percentage: this.totalRounds > 0 ? (count / this.totalRounds) * 100 : 0
        });
      }
    }
    
    topCards.sort((a, b) => b.count - a.count);

    return {
      totalCards,
      cardsObserved,
      cardsRemaining,
      shoeNumber: this.shoeNumber,
      topCards: topCards.slice(0, 8),
      bySuit,
      byRank,
      totalRounds: this.totalRounds
    };
  }

  getShoeNumber(): number {
    return this.shoeNumber;
  }
}

export const shoeCatalog = ShoeCatalogService.getInstance();
