// src/services/footballStudioService.ts

export interface FootballStudioRound {
  horario: string;
  home: string;
  away: string;
  resultado: 'H' | 'A' | 'D';
  troca_de_baralho: boolean;
}

export interface FootballStudioResponse {
  success: boolean;
  total: number;
  history: FootballStudioRound[];
  timestamp: string;
}

// ✅ CADA MESA COM SEU PROPRIO GAME ID
export const ROLETAS_FOOTBALL = [
  {
    id: 'studio_1',
    nome: '⚽ Football Studio',
    slug: 'evolution/football-studio',
    gameId: 'TopCard000000001',
    provedor: 'Evolution',
    cor: '#22c55e',
    temHistorico: true
  },
  {
    id: 'studio_4',
    nome: '⚽ Football Studio Ao Vivo',
    slug: 'evolution/football-studio',
    gameId: 'TopCard000000004',
    provedor: 'Evolution',
    cor: '#22c55e',
    temHistorico: false  // ✅ SEM HISTORICO
  }
];

class FootballStudioService {
  private history: FootballStudioRound[] = [];
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastUpdate: Date | null = null;
  private connected: boolean = false;
  private isFetching: boolean = false;
  private currentMesa: string = 'studio_1';

  async fetchHistory(): Promise<FootballStudioRound[]> {
    if (this.isFetching) {
      console.log('⏳ Busca em andamento, aguardando...');
      return this.history;
    }

    this.isFetching = true;
    
    try {
      console.log('🔄 Buscando dados da API via backend...');
      const response = await fetch('/api/football-studio/history');
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data: FootballStudioResponse = await response.json();
      console.log(`✅ ${data.total} registros recebidos da API.`);
      
      this.history = data.history;
      this.lastUpdate = new Date();
      this.connected = data.success;
      return this.history;
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      this.connected = false;
      return this.history;
    } finally {
      this.isFetching = false;
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
    this.isFetching = false;
  }

  getHistory(limit: number = 500): FootballStudioRound[] {
    return this.history.slice(0, limit);
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

    const last10 = this.history.slice(0, 10);
    const wins = last10.filter(r => r.resultado === 'H').length;
    const losses = last10.filter(r => r.resultado === 'A').length;
    const draws = last10.filter(r => r.resultado === 'D').length;

    const total = last10.length;
    const probCasa = (wins / total) * 100;
    const probEmpate = (draws / total) * 100;
    const probVisitante = (losses / total) * 100;

    let streak = 0;
    let streakType = '';
    if (last10.length > 0) {
      const last = last10[0];
      for (let i = 0; i < last10.length; i++) {
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
    return this.connected;
  }

  setCurrentMesa(mesaId: string) {
    this.currentMesa = mesaId;
  }

  getCurrentMesa(): string {
    return this.currentMesa;
  }
}

export const footballStudioService = new FootballStudioService();
