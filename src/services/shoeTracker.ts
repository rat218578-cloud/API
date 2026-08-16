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
  bySuit: {
    '♠️': { total: number; observed: number; remaining: number; cards: Card[] };
    '♥️': { total: number; observed: number; remaining: number; cards: Card[] };
    '♦️': { total: number; observed: number; remaining: number; cards: Card[] };
    '♣️': { total: number; observed: number; remaining: number; cards: Card[] };
  };
  byRank: Record<string, { total: number; observed: number; remaining: number }>;
}

class ShoeTracker {
  private static instance: ShoeTracker;
  private shoeNumber: number = 1;
  private cards: Card[] = [];
  private observedCards: Card[] = [];
  private totalCardsInShoe: number = 416; // 8 baralhos de 52

  static getInstance(): ShoeTracker {
    if (!ShoeTracker.instance) {
      ShoeTracker.instance = new ShoeTracker();
    }
    return ShoeTracker.instance;
  }

  // Gera o baralho completo
  private generateDeck(): Card[] {
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suits: ('♠️' | '♥️' | '♦️' | '♣️')[] = ['♠️', '♥️', '♦️', '♣️'];
    const deck: Card[] = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ rank, suit, full: `${rank}${suit}` });
      }
    }
    return deck;
  }

  // Inicia um novo shoe
  startNewShoe() {
    this.shoeNumber++;
    this.cards = [];
    this.observedCards = [];
    // Embaralha 8 baralhos
    const deck = this.generateDeck();
    for (let i = 0; i < 8; i++) {
      this.cards.push(...deck);
    }
    // Embaralha
    this.cards = this.shuffleArray(this.cards);
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Registra uma carta observada
  observeCard(cardFull: string) {
    const card = this.cards.find(c => c.full === cardFull);
    if (card) {
      this.observedCards.push(card);
      // Remove do deck
      const index = this.cards.findIndex(c => c.full === cardFull);
      if (index > -1) {
        this.cards.splice(index, 1);
      }
      return true;
    }
    return false;
  }

  // Obtém estatísticas do shoe
  getStats(): ShoeStats {
    const suits: ('♠️' | '♥️' | '♦️' | '♣️')[] = ['♠️', '♥️', '♦️', '♣️'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    const bySuit = {} as any;
    for (const suit of suits) {
      const total = this.cards.filter(c => c.suit === suit).length + this.observedCards.filter(c => c.suit === suit).length;
      const observed = this.observedCards.filter(c => c.suit === suit).length;
      bySuit[suit] = {
        total: 52 * 8,
        observed,
        remaining: 52 * 8 - observed,
        cards: this.observedCards.filter(c => c.suit === suit)
      };
    }

    const byRank = {} as any;
    for (const rank of ranks) {
      const observed = this.observedCards.filter(c => c.rank === rank).length;
      byRank[rank] = {
        total: 4 * 8,
        observed,
        remaining: 4 * 8 - observed
      };
    }

    return {
      totalCards: 416,
      cardsObserved: this.observedCards.length,
      cardsRemaining: 416 - this.observedCards.length,
      bySuit,
      byRank
    };
  }

  // Obtém o número do shoe
  getShoeNumber(): number {
    return this.shoeNumber;
  }

  // Verifica se houve troca de baralho
  checkShoeChange(history: any[]): boolean {
    if (history.length === 0) return false;
    const last = history[0];
    if (last.troca_de_baralho) {
      this.startNewShoe();
      return true;
    }
    // Detecta cartas novas
    const lastCard = last.home || last.away;
    if (lastCard) {
      this.observeCard(lastCard);
    }
    return false;
  }

  // Reinicia o tracker
  reset() {
    this.shoeNumber = 1;
    this.cards = [];
    this.observedCards = [];
    // Inicializa com 8 baralhos
    const deck = this.generateDeck();
    for (let i = 0; i < 8; i++) {
      this.cards.push(...deck);
    }
    this.cards = this.shuffleArray(this.cards);
  }
}

export const shoeTracker = ShoeTracker.getInstance();
