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
  private totalPerSuit: Record<string, number> = {
    '♠️': 52,
    '♥️': 52,
    '♦️': 52,
    '♣️': 52
  };
  private totalPerRank: Record<string, number> = {};
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
    this.totalPerSuit = {
      '♠️': 52,
      '♥️': 52,
      '♦️': 52,
      '♣️': 52
    };
    this.totalPerRank = {};
    for (const rank of this.ranks) {
      this.totalPerRank[rank] = 4; // 4 de cada rank por baralho
    }
  }

  startNewShoe() {
    this.shoeNumber++;
    this.observedCards = [];
    this.cardCounts = {};
    this.totalPerSuit = {
      '♠️': 52,
      '♥️': 52,
      '♦️': 52,
      '♣️': 52
    };
    for (const rank of this.ranks) {
      this.totalPerRank[rank] = 4;
    }
  }

  // ✅ REGISTRA UMA CARTA OBSERVADA DO HISTÓRICO
  observeCard(cardFull: string): boolean {
    if (!cardFull) return false;
    
    // Extrai rank e suit
    const rank = cardFull.slice(0, -1);
    const suit = cardFull.slice(-1) as '♠️' | '♥️' | '♦️' | '♣️';
    
    // Verifica se é um naipe válido
    if (!this.suits.includes(suit)) return false;
    
    // Incrementa contagem
    const key = `${rank}${suit}`;
    this.cardCounts[key] = (this.cardCounts[key] || 0) + 1;
    
    // Adiciona à lista de observadas
    this.observedCards.push({ rank, suit, full: cardFull });
    
    return true;
  }

  // ✅ PROCESSA TODO O HISTÓRICO
  processHistory(history: any[]) {
    if (!history || history.length === 0) return;
    
    // Verifica se houve troca de baralho
    const shoeChange = history.find((h: any) => h.troca_de_baralho === true);
    if (shoeChange) {
      this.startNewShoe();
    }
    
    // Processa todas as cartas do histórico
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
      const total = 52; // 1 baralho de 52 cartas por naipe
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
      const total = 4; // 4 cartas de cada rank por baralho
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

  // ✅ VERIFICA E ATUALIZA COM BASE NO HISTÓRICO
  checkAndUpdate(history: any[]): boolean {
    if (!history || history.length === 0) return false;
    
    // Verifica troca de baralho
    const shoeChange = history.find((h: any) => h.troca_de_baralho === true);
    if (shoeChange) {
      this.startNewShoe();
    }
    
    // Processa apenas as cartas novas
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
