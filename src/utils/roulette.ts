import { RouletteNumber, Strategy, Signal } from "../types";

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

function isValidNumber(num: number): boolean {
  return Number.isInteger(num) && num >= 0 && num <= 36;
}

export function getNumberInfo(num: number): RouletteNumber {
  if (!isValidNumber(num)) {
    return {
      number: 0,
      color: "green",
      parity: "zero",
      range: "zero",
      column: "Zero",
      dozen: "Zero",
      sector: "Zero",
    };
  }

  if (num === 0) {
    return {
      number: 0,
      color: "green",
      parity: "zero",
      range: "zero",
      column: "Zero",
      dozen: "Zero",
      sector: "Zero",
    };
  }

  const color = RED_NUMBERS.includes(num) ? "red" : "black";
  const parity = num % 2 === 0 ? "even" : "odd";
  const range = num >= 1 && num <= 18 ? "low" : "high";
  const column = num % 3 === 1 ? "C1" : num % 3 === 2 ? "C2" : "C3";
  const dozen = num <= 12 ? "D1" : num <= 24 ? "D2" : "D3";
  const sector = num <= 12 ? "Oposto" : num <= 24 ? "Direito" : "Esquerdo";

  return { number: num, color, parity, range, column, dozen, sector };
}

export function getColorClass(num: number): string {
  if (!isValidNumber(num)) return "number-green";
  if (num === 0) return "number-green";
  return RED_NUMBERS.includes(num) ? "number-red" : "number-black";
}

export function generateRandomHistory(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 37));
}

export function calculateDistribution(history: number[]) {
  const validHistory = history.filter(n => isValidNumber(n));
  const total = validHistory.length || 1;
  
  const reds = validHistory.filter((n) => RED_NUMBERS.includes(n)).length;
  const blacks = validHistory.filter((n) => BLACK_NUMBERS.includes(n)).length;
  const zeros = validHistory.filter((n) => n === 0).length;
  const odds = validHistory.filter((n) => n % 2 !== 0 && n !== 0).length;
  const evens = validHistory.filter((n) => n % 2 === 0 && n !== 0).length;
  const highs = validHistory.filter((n) => n >= 19 && n <= 36).length;
  const lows = validHistory.filter((n) => n >= 1 && n <= 18).length;

  return {
    red: Math.round((reds / total) * 100),
    black: Math.round((blacks / total) * 100),
    zero: Math.round((zeros / total) * 100),
    odd: Math.round((odds / total) * 100),
    even: Math.round((evens / total) * 100),
    high: Math.round((highs / total) * 100),
    low: Math.round((lows / total) * 100),
  };
}

export const STRATEGIES: Strategy[] = [
  { id: "martingale", name: "Martingale", assertiveness: 78, color: "#ec4899", description: "Dobrar aposta após perda" },
  { id: "fibonacci", name: "Fibonacci", assertiveness: 72, color: "#8b5cf6", description: "Sequência de Fibonacci" },
  { id: "dalambert", name: "D'Alembert", assertiveness: 65, color: "#06b6d4", description: "Aumento gradual" },
  { id: "paroli", name: "Paroli", assertiveness: 70, color: "#10b981", description: "Dobrar após vitória" },
];

export function generateAISignal(_history: number[]): Signal {
  const strategy = STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)];
  const numbers = Array.from({ length: 3 }, () => Math.floor(Math.random() * 37));
  const assertiveness = 60 + Math.floor(Math.random() * 35);
  
  const reasons = [
    "Padrão de repetição identificado",
    "Tendência de alta detectada",
    "Correlação com último setor",
    "Frequência acima da média",
    "Sequência de números ímpares",
  ];

  return {
    id: `sig-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    strategy: strategy.name,
    numbers,
    assertiveness,
    timestamp: new Date(),
    reason: reasons[Math.floor(Math.random() * reasons.length)],
  };
}

export function findPatterns(history: number[]) {
  const validHistory = history.filter(n => isValidNumber(n));
  const frequencies: Record<number, number> = {};
  validHistory.forEach((n) => {
    frequencies[n] = (frequencies[n] || 0) + 1;
  });

  const sorted = Object.entries(frequencies)
    .map(([num, count]) => ({ number: Number(num), count }))
    .sort((a, b) => b.count - a.count);

  return {
    mostFrequent: sorted.slice(0, 5),
    leastFrequent: sorted.slice(-5).reverse(),
    totalSpins: validHistory.length,
    uniqueNumbers: Object.keys(frequencies).length,
  };
}

export function sanitizeHistory(history: number[]): number[] {
  return history.filter(n => isValidNumber(n));
}
