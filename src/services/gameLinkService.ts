// ========== APENAS ROLETAS ==========
export const ROLETAS = [
  { 
    id: 'brasileira', 
    nome: '🇧🇷 Brasileira', 
    slug: 'evolution/brasileira',
    provedor: 'Evolution',
    cor: '#6C3CE1'
  },
  { 
    id: 'immersive', 
    nome: '🎥 Imersiva', 
    slug: 'evolution/immersive-roulette',
    provedor: 'Evolution',
    cor: '#6C3CE1'
  },
  { 
    id: 'lightning', 
    nome: '⚡ Lightning', 
    slug: 'evolution/lightning-roulette',
    provedor: 'Evolution',
    cor: '#6C3CE1'
  },
  { 
    id: 'roulette-live', 
    nome: '🎰 Roleta Live', 
    slug: 'evolution/roulette-live',
    provedor: 'Evolution',
    cor: '#6C3CE1'
  }
];

class GameLinkService {
  private static instance: GameLinkService;

  static getInstance(): GameLinkService {
    if (!GameLinkService.instance) {
      GameLinkService.instance = new GameLinkService();
    }
    return GameLinkService.instance;
  }

  // SEM CACHE - SEMPRE BUSCA UM LINK NOVO
  async getGameUrl(slug: string): Promise<string | null> {
    console.log(`🎮 Buscando link para: ${slug}`);

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        console.error('❌ Token não encontrado');
        return null;
      }

      const url = `/api/start-game-v2?slug=${slug}&platform=WEB&use_demo=0&source=watchIsAuthenticated`;
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

      return data.iframe_url || data.gameURL || null;
    } catch (error) {
      console.error(`❌ Erro:`, error);
      return null;
    }
  }
}

export const gameLinkService = GameLinkService.getInstance();
