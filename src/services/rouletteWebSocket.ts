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
  private extractFromUrl(url: string): { evosessionid: string; instance: string } | null {
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

  // ===== BUSCA CREDENCIAIS DO CACHE DE LINKS =====
  private getCredentialsFromCache(): { evosessionid: string; instance: string } | null {
    try {
      // Tenta pegar do localStorage primeiro
      let evo = localStorage.getItem('evo_evosessionid') || '';
      let inst = localStorage.getItem('evo_instance') || '';
      
      if (evo && inst) {
        return { evosessionid: evo, instance: inst };
      }

      // Tenta extrair do cache do gameLinkService
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
      return null;
    } catch (e) {
      console.error('Erro ao buscar cache:', e);
      return null;
    }
  }

  // ===== EXPÕE O CACHE PARA O gameLinkService =====
  public setGameUrlCache(slug: string, url: string) {
    if (!(window as any).__gameLinkCache) {
      (window as any).__gameLinkCache = {};
    }
    (window as any).__gameLinkCache[slug] = url;
    
    // Tenta extrair automaticamente
    const extracted = this.extractFromUrl(url);
    if (extracted) {
      this.evosessionid = extracted.evosessionid;
      this.instance = extracted.instance;
      localStorage.setItem('evo_evosessionid', extracted.evosessionid);
      localStorage.setItem('evo_instance', extracted.instance);
      console.log('✅ EVOSESSIONID e INSTANCE extraídos automaticamente do link!');
    }
  }

  connect(gameId: string = 'PorROULigh000001') {
    if (this.isConnecting) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('⚠️ WebSocket já conectado');
      return;
    }

    // ===== TENTA PEGAR AS CREDENCIAIS =====
    let evo = this.evosessionid;
    let inst = this.instance;

    if (!evo || !inst) {
      const creds = this.getCredentialsFromCache();
      if (creds) {
        evo = creds.evosessionid;
        inst = creds.instance;
        this.evosessionid = evo;
        this.instance = inst;
      }
    }

    if (!evo || !inst) {
      console.error('❌ EVOSESSIONID e INSTANCE não encontrados. Gere um link primeiro.');
      return;
    }

    this.isConnecting = true;

    const wsUrl = `wss://sortenabet.evo-games.com/public/roulette/player/game/${gameId}/socket?messageFormat=json&EVOSESSIONID=${evo}&instance=${inst}&client_version=${this.clientVersion}`;

    console.log(`🔌 Conectando WebSocket para ${gameId}...`);
    console.log(`🔑 EVOSESSIONID: ${evo.substring(0, 20)}...`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket conectado! Recebendo dados ao vivo...');
        this.isConnecting = false;
        this.startHeartbeat();
        this.requestRecentHistory();
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

  private requestRecentHistory() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ 
          type: 'roulette.recentResults',
          args: { limit: 100 }
        }));
        console.log('📤 Solicitando histórico recente...');
      } catch (e) {
        console.error('Erro ao solicitar histórico:', e);
      }
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

      if (data.type === 'roulette.winSpots' && data.args?.code) {
        const number = data.args.code;
        console.log(`🎯 Número sorteado: ${number}`);
        
        this.history.unshift(number);
        if (this.history.length > 500) this.history.pop();

        this.callbacks.forEach(cb => cb(number));
        this.historyCallbacks.forEach(cb => cb(this.history));
      }

      if (data.type === 'roulette.recentResults' && data.args?.recentResults) {
        const results = data.args.recentResults;
        console.log(`📜 Recebidos ${results.length} números do histórico`);
        let novos = 0;
        for (const result of results) {
          if (result && result.length > 0) {
            const number = result[0];
            if (this.history.length === 0 || this.history[0] !== number) {
              this.history.unshift(number);
              novos++;
            }
          }
        }
        if (novos > 0) {
          console.log(`📜 Adicionados ${novos} novos números (total: ${this.history.length})`);
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
