// ========== WEBSOCKET PARA DADOS AO VIVO DA ROLETA ==========

type RouletteCallback = (number: number) => void;
type HistoryCallback = (history: number[]) => void;

export class RouletteWebSocketService {
  private static instance: RouletteWebSocketService;
  private ws: WebSocket | null = null;
  private history: number[] = [];
  private callbacks: RouletteCallback[] = [];
  private historyCallbacks: HistoryCallback[] = [];
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private shouldReconnect = true;
  private isConnecting = false;
  private evosessionid: string = '';
  private instance: string = '';
  private clientVersion: string = '6.20260529.83717.62338-307701dd59-r2';

  static getInstance(): RouletteWebSocketService {
    if (!RouletteWebSocketService.instance) {
      RouletteWebSocketService.instance = new RouletteWebSocketService();
    }
    return RouletteWebSocketService.instance;
  }

  // ===== EXTRAI EVOSESSIONID E INSTANCE DO LINK =====
  extractFromUrl(url: string): { evosessionid: string; instance: string } | null {
    try {
      const evoMatch = url.match(/EVOSESSIONID=([^&]+)/);
      const instanceMatch = url.match(/instance=([^&]+)/);
      
      if (evoMatch && instanceMatch) {
        return {
          evosessionid: evoMatch[1],
          instance: instanceMatch[1]
        };
      }
      return null;
    } catch (e) {
      console.error('Erro ao extrair:', e);
      return null;
    }
  }

  // ===== PEGA EVOSESSIONID E INSTANCE DO CACHE DE LINKS =====
  private getEvoCredentials(): { evosessionid: string; instance: string } | null {
    // Tenta do localStorage
    let evosessionid = localStorage.getItem('evo_evosessionid') || '';
    let instance = localStorage.getItem('evo_instance') || '';

    if (evosessionid && instance) {
      return { evosessionid, instance };
    }

    // Tenta extrair dos links cacheados
    try {
      // @ts-ignore - acessa o cache do gameLinkService
      const gameUrls = (window as any).__gameLinkCache || {};
      for (const slug in gameUrls) {
        const url = gameUrls[slug];
        if (url) {
          const extracted = this.extractFromUrl(url);
          if (extracted) {
            localStorage.setItem('evo_evosessionid', extracted.evosessionid);
            localStorage.setItem('evo_instance', extracted.instance);
            return extracted;
          }
        }
      }
    } catch (e) {
      console.error('Erro ao buscar cache:', e);
    }

    return null;
  }

  connect(gameId: string = 'PorROULigh000001') {
    if (this.isConnecting) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('⚠️ WebSocket já conectado');
      return;
    }

    // ===== PEGA CREDENCIAIS =====
    const creds = this.getEvoCredentials();
    
    if (!creds) {
      console.error('❌ Não foi possível obter EVOSESSIONID e INSTANCE');
      return;
    }

    this.evosessionid = creds.evosessionid;
    this.instance = creds.instance;

    this.isConnecting = true;

    const wsUrl = `wss://sortenabet.evo-games.com/public/roulette/player/game/${gameId}/socket?messageFormat=json&EVOSESSIONID=${this.evosessionid}&instance=${this.instance}&client_version=${this.clientVersion}`;

    console.log(`🔌 Conectando WebSocket para ${gameId}...`);
    console.log(`🔑 EVOSESSIONID: ${this.evosessionid.substring(0, 20)}...`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket conectado! Recebendo dados ao vivo...');
        this.isConnecting = false;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onclose = () => {
        console.log('⚠️ WebSocket desconectado');
        this.isConnecting = false;
        this.stopHeartbeat();
        if (this.shouldReconnect) {
          console.log('🔄 Reconectando em 5 segundos...');
          if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = setTimeout(() => {
            this.connect(gameId);
          }, 5000);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('❌ Erro ao conectar WebSocket:', error);
      this.isConnecting = false;
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    console.log('🔌 WebSocket desconectado');
    setTimeout(() => { this.shouldReconnect = true; }, 1000);
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'ping') {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'pong' }));
        }
        return;
      }

      // ===== NÚMERO SORTEADO EM TEMPO REAL =====
      if (data.type === 'roulette.winSpots' && data.args?.code) {
        const number = data.args.code;
        console.log(`🎯 Número sorteado: ${number}`);
        
        this.history.unshift(number);
        if (this.history.length > 500) this.history.pop();

        this.callbacks.forEach(cb => cb(number));
        this.historyCallbacks.forEach(cb => cb(this.history));
      }

      // ===== HISTÓRICO RECENTE (ATÉ 500 RODADAS) =====
      if (data.type === 'roulette.recentResults' && data.args?.recentResults) {
        const results = data.args.recentResults;
        let novos = 0;
        for (const result of results) {
          if (result && result.length > 0) {
            const number = result[0];
            // Evita duplicatas
            if (this.history.length === 0 || this.history[0] !== number) {
              this.history.unshift(number);
              novos++;
            }
          }
        }
        if (novos > 0) {
          console.log(`📜 Carregados ${novos} números do histórico (total: ${this.history.length})`);
          this.historyCallbacks.forEach(cb => cb(this.history));
        }
      }

    } catch (e) {
      console.error('Erro ao processar mensagem:', e);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (e) {}
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  onNumber(callback: RouletteCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  onHistory(callback: HistoryCallback): () => void {
    this.historyCallbacks.push(callback);
    if (this.history.length > 0) {
      callback(this.history);
    }
    return () => {
      this.historyCallbacks = this.historyCallbacks.filter(cb => cb !== callback);
    };
  }

  getHistory(): number[] {
    return [...this.history];
  }

  switchTable(gameId: string) {
    this.disconnect();
    setTimeout(() => {
      this.connect(gameId);
    }, 500);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const rouletteWS = RouletteWebSocketService.getInstance();
