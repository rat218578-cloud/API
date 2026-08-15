// src/services/footballStudioService.ts

const API_URL = 'https://app.domcroupier.com/inc/historico.php';

export interface FootballStudioRound {
  horario: string;
  home: string;
  away: string;
  resultado: 'H' | 'A' | 'D';
  troca_de_baralho: boolean;
}

export const ROLETAS_FOOTBALL = [
  { 
    id: 'studio_1', 
    nome: '⚽ Football Studio', 
    slug: 'evolution/football-studio', 
    gameId: 'TopCard000000001', 
    provedor: 'Evolution', 
    cor: '#22c55e'
  },
  { 
    id: 'studio_4', 
    nome: '⚽ Football Studio Ao Vivo', 
    slug: 'evolution/football-studio', 
    gameId: 'TopCard000000004', 
    provedor: 'Evolution', 
    cor: '#22c55e'
  }
];

class FootballStudioService {
  private history: FootballStudioRound[] = [];
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastUpdate: Date | null = null;
  private isConnected: boolean = false;

  async fetchHistory(): Promise<FootballStudioRound[]> {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      const data: FootballStudioRound[] = await response.json();
      this.history = data.reverse();
      this.lastUpdate = new Date();
      this.isConnected = true;
      return this.history;
    } catch (error) {
      console.error('Erro ao buscar historico:', error);
      this.isConnected = false;
      return [];
    }
  }

  startPolling(interval: number = 2000, onUpdate: (newRounds: FootballStudioRound[]) => void) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.fetchHistory().then(onUpdate);

    this.pollingInterval = setInterval(async () => {
      const newData = await this.fetchHistory();
      onUpdate(newData);
    }, interval);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  getHistory(limit: number = 500): FootballStudioRound[] {
    return this.history.slice(-limit).reverse();
  }

  getLastNumbers(count: number = 10): number[] {
    return this.history.slice(-count).reverse().map(r => {
      // Converte resultado para número: H=1, D=0, A=-1
      if (r.resultado === 'H') return 1;
      if (r.resultado === 'D') return 0;
      return -1;
    });
  }

  getStatistics() {
    const total = this.history.length;
    const wins = this.history.filter(r => r.resultado === 'H').length;
    const losses = this.history.filter(r => r.resultado === 'A').length;
    const draws = this.history.filter(r => r.resultado === 'D').length;
    return { total, wins, losses, draws };
  }

  getLastUpdate(): Date | null {
    return this.lastUpdate;
  }

  getSignals() {
    if (this.history.length < 10) return null;

    const last10 = this.history.slice(-10);
    const wins = last10.filter(r => r.resultado === 'H').length;
    const losses = last10.filter(r => r.resultado === 'A').length;
    const draws = last10.filter(r => r.resultado === 'D').length;

    const total = last10.length;
    const probCasa = ((wins / total) * 100);
    const probEmpate = ((draws / total) * 100);
    const probVisitante = ((losses / total) * 100);

    let streak = 0;
    let streakType = '';
    if (last10.length > 0) {
      const last = last10[last10.length - 1];
      for (let i = last10.length - 1; i >= 0; i--) {
        if (last10[i].resultado === last.resultado) {
          streak++;
        } else {
          break;
        }
      }
      streakType = last.resultado === 'H' ? 'CASA' : last.resultado === 'A' ? 'VISITANTE' : 'EMPATE';
    }

    let prediction = 'CASA';
    let confidence = 0;
    
    if (probCasa > probVisitante && probCasa > probEmpate) {
      prediction = 'CASA';
      confidence = Math.round(probCasa);
    } else if (probVisitante > probCasa && probVisitante > probEmpate) {
      prediction = 'VISITANTE';
      confidence = Math.round(probVisitante);
    } else {
      prediction = 'EMPATE';
      confidence = Math.round(probEmpate);
    }

    return {
      probabilidades: { 
        casa: probCasa.toFixed(1), 
        empate: probEmpate.toFixed(1), 
        visitante: probVisitante.toFixed(1) 
      },
      streak: { tipo: streakType, tamanho: streak },
      predicao: prediction,
      confianca: confidence,
      ultimos10: last10
    };
  }

  isConnected(): boolean {
    return this.isConnected;
  }
}

export const footballStudioService = new FootballStudioService();
