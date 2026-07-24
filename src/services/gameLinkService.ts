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
  private cacheTTL = 60 * 60 * 1000; // 1 hora

  static getInstance(): GameLinkService {
    if (!GameLinkService.instance) {
      GameLinkService.instance = new GameLinkService();
    }
    return GameLinkService.instance;
  }

  private getEvoSession(): { evosessionid: string; instance: string; client_version: string } {
    let evosessionid = localStorage.getItem('evo_evosessionid') || '';
    let instance = localStorage.getItem('evo_instance') || '';
    let client_version = localStorage.getItem('evo_client_version') || '6.20260529.83717.62338-307701dd59-r2';

    if (!evosessionid) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 15);
      evosessionid = `tztnmffxax4bftiot${timestamp}${random}`;
      localStorage.setItem('evo_evosessionid', evosessionid);
    }

    if (!instance) {
      instance = `3wsaab-${evosessionid.substring(0, 20)}-PorROULigh000001`;
      localStorage.setItem('evo_instance', instance);
    }

    return { evosessionid, instance, client_version };
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

      const evoSession = this.getEvoSession();
      console.log('🔑 EVOSESSIONID:', evoSession.evosessionid.substring(0, 30) + '...');

      // ===== ENVIA EMAIL E PASSWORD =====
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
        const gameId = ROLETAS.find(r => r.slug === slug)?.gameId || 'PorROULigh000001';
        const finalUrl = `${baseUrl}&EVOSESSIONID=${evoSession.evosessionid}&instance=${evoSession.instance}&client_version=${evoSession.client_version}&gameId=${gameId}`;
        
        this.gameUrls[slug] = {
          url: finalUrl,
          timestamp: Date.now()
        };
        console.log(`✅ Link gerado para ${slug}`);
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
