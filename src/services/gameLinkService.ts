// ========== ROLETAS EVOLUTION ==========
export const ROLETAS = [
  { 
    id: 'lightning', 
    nome: '⚡ Lightning', 
    slug: 'evolution/lightning-roulette',
    gameId: 'LightningTable01',
    provedor: 'Evolution',
    cor: '#6C3CE1'
  },
  { 
    id: 'immersive', 
    nome: '🎥 Imersiva', 
    slug: 'evolution/immersive-roulette',
    gameId: 'ImmerRoulette0001',
    provedor: 'Evolution',
    cor: '#6C3CE1'
  },
  { 
    id: 'brasileira', 
    nome: '🇧🇷 Brasileira', 
    slug: 'evolution/brasileira',
    gameId: 'PorROULigh000001',
    provedor: 'Evolution',
    cor: '#6C3CE1'
  }
];

class GameLinkService {
  private static instance: GameLinkService;
  private gameUrls: Record<string, { url: string; timestamp: number }> = {};
  private evoSession: { evosessionid: string; instance: string } | null = null;
  private cacheTTL = 60 * 60 * 1000;

  static getInstance(): GameLinkService {
    if (!GameLinkService.instance) {
      GameLinkService.instance = new GameLinkService();
    }
    return GameLinkService.instance;
  }

  // Extrai EVOSESSIONID e INSTANCE da URL gerada pela API
  private extractEvoSession(url: string): { evosessionid: string; instance: string } | null {
    try {
      // Procura por EVOSESSIONID e instance na URL
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
      console.error('Erro ao extrair EVOSESSIONID:', e);
      return null;
    }
  }

  async getGameUrl(slug: string): Promise<string | null> {
    const cached = this.gameUrls[slug];
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      console.log(`📦 Cache hit para ${slug}`);
      return cached.url;
    }

    console.log(`🎮 Gerando link para: ${slug}`);

    try {
      const token = localStorage.getItem('access_token');
      const userData = localStorage.getItem('user_data');
      
      if (!token) {
        console.error('❌ Token não encontrado');
        return null;
      }

      let email = '';
      if (userData) {
        try {
          const user = JSON.parse(userData);
          email = user.email || user.login || '';
        } catch (e) {
          console.error('Erro ao parsear userData:', e);
        }
      }

      const password = sessionStorage.getItem('temp_password') || '';
      
      if (!email || !password) {
        console.error('❌ Email ou senha não encontrados');
        return null;
      }

      const url = `/api/start-game-v2?slug=${slug}&platform=WEB&use_demo=0&source=watchIsAuthenticated&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
      console.log(`📤 GET: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`📥 Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}: ${errorText}`);
        return null;
      }

      const data = await response.json();
      console.log('📦 Resposta:', data);

      const baseUrl = data.iframe_url || data.gameURL;
      if (baseUrl) {
        // Extrai EVOSESSIONID e INSTANCE da URL
        const evoInfo = this.extractEvoSession(baseUrl);
        
        if (evoInfo) {
          // Salva a sessão para reutilizar
          this.evoSession = evoInfo;
          console.log('🔑 EVOSESSIONID extraído:', evoInfo.evosessionid.substring(0, 30) + '...');
          console.log('🔧 INSTANCE extraído:', evoInfo.instance);
          
          // Armazena no localStorage para outras roletas
          localStorage.setItem('evo_evosessionid', evoInfo.evosessionid);
          localStorage.setItem('evo_instance', evoInfo.instance);
        }

        const gameId = ROLETAS.find(r => r.slug === slug)?.gameId || 'PorROULigh000001';
        
        // Se temos a sessão, usamos ela para construir a URL final
        let finalUrl = baseUrl;
        if (this.evoSession) {
          // Substitui ou adiciona os parâmetros
          finalUrl = baseUrl;
          // Se a URL já tem parâmetros, adiciona com &, senão com ?
          const separator = baseUrl.includes('?') ? '&' : '?';
          finalUrl += `${separator}EVOSESSIONID=${this.evoSession.evosessionid}&instance=${this.evoSession.instance}&client_version=6.20260529.83717.62338-307701dd59-r2&gameId=${gameId}`;
        }
        
        this.gameUrls[slug] = {
          url: finalUrl,
          timestamp: Date.now()
        };
        console.log(`✅ Link gerado para ${slug} com sessão Evolution`);
        return finalUrl;
      }

      return null;
    } catch (error) {
      console.error(`❌ Erro:`, error);
      return null;
    }
  }

  clearGameCache(slug: string): void {
    delete this.gameUrls[slug];
    console.log(`🗑️ Cache limpo para ${slug}`);
  }
}

export const gameLinkService = GameLinkService.getInstance();
