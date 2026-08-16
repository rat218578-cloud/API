// src/services/shoeCatalogService.ts

export interface CardData {
  card: string;
  rank: string;
  suit: string;
  count: number;        // Quantas vezes apareceu
  remaining: number;    // Quantas cópias restantes
  total: number;        // Total de cópias inicial
  percentage: number;   // Porcentagem de aparição
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
  private observedCards: CardData[] = [];
  private cardCounts: Record<string, number> = {};
  private totalRounds: number = 0;
  private suits: ('♠️' | '♥️' | '♦️' | '♣️')[] = ['♠️', '♥️', '♦️', '♣️'];
  private ranks: string[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  private copiesPerCard: number = 32; // 8 baralhos × 4 naipes

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
    this.observedCards = [];
    this.cardCounts = {};
    this.totalRounds = 0;
    
    // Inicializa todos os ranks e naipes
    for (const suit of this.suits) {
      for (const rank of this.ranks) {
        const card = `${rank}${suit}`;
        this.cardCounts[card] = 0;
      }
    }
  }

  startNewShoe() {
    this.shoeNumber++;
    this.observedCards = [];
    this.cardCounts = {};
    this.totalRounds = 0;
    
    for (const suit of this.suits) {
      for (const rank of this.ranks) {
        const card = `${rank}${suit}`;
        this.cardCounts[card] = 0;
      }
    }
  }

  // Registra uma carta observada
  observeCard(cardFull: string): boolean {
    if (!cardFull) return false;
    
    const rank = cardFull.slice(0, -1);
    const suit = cardFull.slice(-1) as '♠️' | '♥️' | '♦️' | '♣️';
    
    if (!this.suits.includes(suit)) return false;
    
    // Incrementa contagem
    this.cardCounts[cardFull] = (this.cardCounts[cardFull] || 0) + 1;
    
    // Adiciona à lista de observadas
    const existing = this.observedCards.find(c => c.card === cardFull);
    if (existing) {
      existing.count = this.cardCounts[cardFull];
    } else {
      this.observedCards.push({
        card: cardFull,
        rank,
        suit,
        count: this.cardCounts[cardFull],
        remaining: this.copiesPerCard - this.cardCounts[cardFull],
        total: this.copiesPerCard,
        percentage: 0
      });
    }
    
    return true;
  }

  // Processa uma rodada completa
  processRound(round: any) {
    if (!round || round.troca_de_baralho) {
      // Se houve troca de baralho, reseta
      this.startNewShoe();
      return;
    }
    
    this.totalRounds++;
    
    if (round.home) this.observeCard(round.home);
    if (round.away) this.observeCard(round.away);
  }

  // Processa histórico completo
  processHistory(history: any[]) {
    if (!history || history.length === 0) return;
    
    this.reset();
    
    for (const round of history) {
      this.processRound(round);
    }
  }

  // ✅ Obtém estatísticas completas
  getStats(): ShoeCatalogStats {
    const totalCards = this.copiesPerCard * 52; // 32 * 52 = 1664
    const cardsObserved = Object.values(this.cardCounts).reduce((a, b) => a + b, 0);
    const cardsRemaining = totalCards - cardsObserved;
    
    // Calcula por naipe
    const bySuit = {} as any;
    for (const suit of this.suits) {
      const observed = this.observedCards.filter(c => c.suit === suit).reduce((acc, c) => acc + c.count, 0);
      const total = this.copiesPerCard * 13; // 32 * 13 = 416 por naipe
      bySuit[suit] = {
        total,
        observed,
        remaining: total - observed
      };
    }

    // Calcula por rank
    const byRank = {} as any;
    for (const rank of this.ranks) {
      const observed = this.observedCards.filter(c => c.rank === rank).reduce((acc, c) => acc + c.count, 0);
      const total = this.copiesPerCard * 4; // 32 * 4 = 128 por rank
      byRank[rank] = {
        total,
        observed,
        remaining: total - observed
      };
    }

    // Top cartas (mais frequentes)
    const topCards = [...this.observedCards]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(c => ({
        ...c,
        remaining: this.copiesPerCard - c.count,
        percentage: this.totalRounds > 0 ? (c.count / this.totalRounds) * 100 : 0
      }));

    return {
      totalCards,
      cardsObserved,
      cardsRemaining,
      shoeNumber: this.shoeNumber,
      topCards,
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
