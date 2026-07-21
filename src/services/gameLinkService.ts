// ========== APENAS ROLETAS ==========
export const ROLETAS = [
  { id: 'brasileira', nome: '🇧🇷 Brasileira', slug: 'evolution/brasileira', provedor: 'Evolution', cor: '#6C3CE1' },
  { id: 'immersive', nome: '🎥 Imersiva', slug: 'evolution/immersive-roulette', provedor: 'Evolution', cor: '#6C3CE1' },
  { id: 'lightning', nome: '⚡ Lightning', slug: 'evolution/lightning-roulette', provedor: 'Evolution', cor: '#6C3CE1' },
  { id: 'roulette-live', nome: '🎰 Roleta Live', slug: 'evolution/roulette-live', provedor: 'Evolution', cor: '#6C3CE1' }
];

class GameLinkService {
  private static instance: GameLinkService;
  private cache: Record<string, { url: string; timestamp: number }> = {};
  private cacheTTL = 5 * 60 * 1000;

  static getInstance(): GameLinkService {
    if (!GameLinkService.instance) GameLinkService.instance = new GameLinkService();
    return GameLinkService.instance;
  }

  async getGameUrl(slug: string): Promise<string | null> {
    const cached = this.cache[slug];
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      console.log(`📦 Cache hit para ${slug}`);
      return cached.url;
    }

    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;

      const response = await fetch(
        `/api/start-game-v2?slug=${slug}&platform=WEB&use_demo=0&source=watchIsAuthenticated`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) return null;
      const data = await response.json();
      const gameUrl = data.iframe_url || data.gameURL || null;
      
      if (gameUrl) {
        this.cache[slug] = { url: gameUrl, timestamp: Date.now() };
        return gameUrl;
      }
      return null;
    } catch (error) {
      console.error(`❌ Erro:`, error);
      return null;
    }
  }
}

export const gameLinkService = GameLinkService.getInstance();
