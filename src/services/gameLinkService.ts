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
    slug: 'pragmatic/roulette',
     gameId: 'rol;rol_lounge',  
    gameId: 'pragmatic_roulette',
    provedor: 'Pragmatic',
    cor: '#10b981'
  },
  { 
    id: 'xxxtreme', 
    nome: '⚡ XXXtreme', 
    slug: 'evolution/xxxtreme-lightning-roulette',
    gameId: 'XxxtremeLigh0001',
    provedor: 'Evolution',
    cor: '#FF6B00'
  }
];

class GameLinkService {
  private static instance: GameLinkService;
  private gameUrls: Record<string, { url: string; timestamp: number }> = {};

  static getInstance(): GameLinkService {
    if (!GameLinkService.instance) {
      GameLinkService.instance = new GameLinkService();
    }
    return GameLinkService.instance;
  }

  async getGameUrl(slug: string): Promise<string | null> {
    console.log(`🎮 Gerando NOVO token para: ${slug}`);

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        console.error('❌ Token não encontrado');
        return null;
      }

      const response = await fetch(`/api/start-game-v2?slug=${slug}&_=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      console.log(`📥 Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}: ${errorText}`);
        
        if (response.status === 401) {
          console.log('🔄 Token expirado, tentando renovar...');
          const refreshToken = localStorage.getItem('refresh_token');
          
          if (refreshToken) {
            const refreshResponse = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken })
            });
            
            if (refreshResponse.ok) {
              const data = await refreshResponse.json();
              localStorage.setItem('access_token', data.access_token);
              console.log('✅ Token renovado!');
              return this.getGameUrl(slug);
            }
          }
        }
        
        return null;
      }

      const data = await response.json();
      console.log('📦 Resposta:', data);

      const gameUrl = data.iframe_url || data.gameURL;
      if (gameUrl) {
        console.log(`✅ NOVO link gerado para ${slug}`);
        return gameUrl;
      }

      return null;
    } catch (error) {
      console.error(`❌ Erro:`, error);
      return null;
    }
  }

  forceRefresh(slug: string): void {
    console.log(`🔄 Forçando refresh do token para ${slug}`);
    delete this.gameUrls[slug];
  }

  clearAllCache(): void {
    this.gameUrls = {};
    console.log('🗑️ Todos os caches limpos');
  }
}

export const gameLinkService = GameLinkService.getInstance();
