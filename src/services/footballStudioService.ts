// src/services/footballStudioService.ts

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
    cor: '#22c55e',
    temHistorico: true
  },
  {
    id: 'studio_4',
    nome: '⚽ Football Studio Ao Vivo',
    slug: 'evolution/football',
    gameId: 'TopCard000000004',
    provedor: 'Evolution',
    cor: '#22c55e',
    temHistorico: false
  }
];

class FootballStudioService {
  private history: FootballStudioRound[] = [];
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastUpdate: Date | null = null;
  private connected: boolean = false;
  private isFetching: boolean = false;

  async fetchHistory(): Promise<FootballStudioRound[]> {
    if (this.isFetching) {
      return this.history;
    }

    this.isFetching = true;
    
    try {
      const response = await fetch('/api/football-studio/history?limit=500');
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.history.length > 0) {
        console.log(`✅ ${data.total} registros do banco`);
        this.history = data.history;
        this.lastUpdate = new Date();
        this.connected = true;
        return this.history;
      }
      
      console.log('🔄 Banco vazio, buscando da API externa...');
      const externalData = await this.fetchFromExternal();
      
      if (externalData.length > 0) {
        await this.saveToDatabase(externalData);
        return await this.fetchHistory();
      }
      
      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      this.connected = false;
      return this.history;
    } finally {
      this.isFetching = false;
    }
  }

  private async fetchFromExternal(): Promise<FootballStudioRound[]> {
    try {
      const response = await fetch('https://app.domcroupier.com/inc/historico.php');
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('❌ Erro na API externa:', error);
      return [];
    }
  }

  private async saveToDatabase(history: FootballStudioRound[]): Promise<boolean> {
    try {
      const response = await fetch('/api/football-studio/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history })
      });
      
      const data = await response.json();
      console.log(`✅ ${data.saved} rodadas salvas no banco`);
      return data.success;
    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      return false;
    }
  }

  startPolling(interval: number = 2000, onUpdate: (newHistory: FootballStudioRound[]) => void) {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.fetchHistory().then(onUpdate);

    this.pollingInterval = setInterval(async () => {
      try {
        const externalData = await this.fetchFromExternal();
        
        if (externalData && externalData.length > 0) {
          await this.saveToDatabase(externalData);
          const fullHistory = await this.fetchHistory();
          onUpdate(fullHistory);
        }
      } catch (error) {
        console.error('❌ Erro no polling:', error);
      }
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

  isConnected(): boolean {
    return this.connected && this.history.length > 0;
  }
}

export const footballStudioService = new FootballStudioService();
