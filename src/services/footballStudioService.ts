// src/services/footballStudioService.ts

// 🔴 API APENAS PARA A MESA 1 (Studio 1)
const API_URL = 'https://app.domcroupier.com/inc/historico.php';

export interface FootballStudioRound {
  horario: string;
  home: string;
  away: string;
  resultado: 'H' | 'A' | 'D';
  troca_de_baralho: boolean;
}

// ✅ APENAS 2 MESAS
export const MESAS_FOOTBALL = [
  { 
    id: 'studio_1', 
    nome: '⚽ Football Studio 1', 
    slug: 'evolution/football-studio', 
    gameId: 'TopCard000000001', 
    provedor: 'Evolution', 
    cor: '#22c55e',
    temHistorico: true  // ✅ USA A API
  },
  { 
    id: 'studio_4', 
    nome: '⚽ Football Studio 4', 
    slug: 'evolution/football-studio', 
    gameId: 'TopCard000000004', 
    provedor: 'Evolution', 
    cor: '#22c55e',
    temHistorico: false // ❌ SEM HISTORICO (só video)
  }
];

class FootballStudioService {
  private history: FootballStudioRound[] = [];
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastUpdate: Date | null = null;

  async fetchHistory(): Promise<FootballStudioRound[]> {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      const data: FootballStudioRound[] = await response.json();
      this.history = data.reverse();
      this.lastUpdate = new Date();
      return this.history;
    } catch (error) {
      console.error('Erro ao buscar historico do Football Studio:', error);
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

  getLastResults(count: number = 10): FootballStudioRound[] {
    return this.history.slice(-count).reverse();
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
    const probCasa = ((wins / total) * 100).toFixed(1);
    const probEmpate = ((draws / total) * 100).toFixed(1);
    const probVisitante = ((losses / total) * 100).toFixed(1);

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
    
    if (parseFloat(probCasa) > parseFloat(probVisitante) && parseFloat(probCasa) > parseFloat(probEmpate)) {
      prediction = 'CASA';
      confidence = parseFloat(probCasa);
    } else if (parseFloat(probVisitante) > parseFloat(probCasa) && parseFloat(probVisitante) > parseFloat(probEmpate)) {
      prediction = 'VISITANTE';
      confidence = parseFloat(probVisitante);
    } else {
      prediction = 'EMPATE';
      confidence = parseFloat(probEmpate);
    }

    return {
      probabilidades: { casa: probCasa, empate: probEmpate, visitante: probVisitante },
      streak: { tipo: streakType, tamanho: streak },
      predicao: prediction,
      confianca: Math.round(confidence),
      ultimos10: last10
    };
  }
}

export const footballStudioService = new FootballStudioService();
