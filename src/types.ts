export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
}

export type GameCategory =
  | "roleta"
  | "bacbo"
  | "football-studio"
  | "aviator"
  | "crazy-time"
  | "mines"
  | "fortune-tiger";

export interface FootballStudioRound {
  horario: string;
  home: string;
  away: string;
  resultado: 'H' | 'A' | 'D';
  troca_de_baralho: boolean;
}
