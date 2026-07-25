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
  private cacheTTL = 5 * 60 * 1000;

  static getInstance(): GameLinkService {
    if (!GameLinkService.instance) {
      GameLinkService.instance = new GameLinkService();
    }
    return GameLinkService.instance;
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

      const gameUrl = data.iframe_url || data.gameURL;
      if (gameUrl) {
        this.gameUrls[slug] = {
          url: gameUrl,
          timestamp: Date.now()
        };
        console.log(`✅ Link gerado para ${slug}`);
        return gameUrl;
      }

      return null;
    } catch (error) {
      console.error(`❌ Erro:`, error);
      return null;
    }
  }

  refreshGame(slug: string): void {
    delete this.gameUrls[slug];
    console.log(`🔄 Refresh forçado para ${slug}`);
  }

  clearAllCache(): void {
    this.gameUrls = {};
    console.log('🗑️ Todos os caches limpos');
  }
}

export const gameLinkService = GameLinkService.getInstance();
