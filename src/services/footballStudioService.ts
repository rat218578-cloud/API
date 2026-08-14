// src/services/footballStudioService.ts

const API_URL = 'https://app.domcroupier.com/inc/historico.php';

export interface FootballStudioRound {
  horario: string;
  home: string;
  away: string;
  resultado: 'H' | 'A' | 'D';
  troca_de_baralho: boolean;
}

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
      console.error('Erro ao buscar histórico do Football Studio:', error);
      return [];
    }
  }

  startPolling(interval: number = 2000, onUpdate: (newRounds: FootballStudioRound[]) => void) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Busca inicial
    this.fetchHistory().then(onUpdate);

    // Polling a cada 2 segundos
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
}

export const footballStudioService = new FootballStudioService();
