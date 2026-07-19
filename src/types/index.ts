export interface RouletteNumber {
  number: number;
  color: "red" | "black" | "green";
  parity: "even" | "odd" | "zero";
  range: "low" | "high" | "zero";
  column: "C1" | "C2" | "C3" | "Zero";
  dozen: "D1" | "D2" | "D3" | "Zero";
  sector: "Oposto" | "Direito" | "Esquerdo" | "Zero";
}

export interface Strategy {
  id: string;
  name: string;
  assertiveness: number;
  color: string;
  description: string;
}

export interface Signal {
  id: string;
  strategy: string;
  numbers: number[];
  assertiveness: number;
  timestamp: Date;
  reason: string;
}

export interface GameRoom {
  id: string;
  name: string;
  provider: string;
  type: "live" | "manual" | "free";
  spins: number;
  lastNumber: number | null;
}

export interface Bankroll {
  id: string;
  name: string;
  initialBalance: number;
  currentBalance: number;
  wins: number;
  losses: number;
  active: boolean;
  createdAt: Date;
}

export interface SimulatorResult {
  day: number;
  balance: number;
  target: number;
  accumulated: number;
}

export type GameCategory =
  | "roleta"
  | "bacbo"
  | "football-studio"
  | "aviator"
  | "crazy-time"
  | "mines"
  | "fortune-tiger";

export interface SidebarItem {
  id: GameCategory;
  name: string;
  icon: string;
  status: "active" | "beta" | "soon";
}

export interface User {
  id: string;
  email: string;
  name: string;
  cpf?: string;
  avatar?: string;
  plan: "free" | "pro" | "enterprise";
}

export interface RouletteSpin {
  number: number;
  color: "red" | "black" | "green";
  timestamp: string;
  roundId: string;
}

export interface RouletteHistoryResponse {
  spins: RouletteSpin[];
  total: number;
  room: string;
}
