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
      // PEGA O TOKEN DO LOCALSTORAGE
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        console.error('❌ Token não encontrado no localStorage');
        return null;
      }

      console.log(`🔑 Token encontrado: ${token.substring(0, 30)}...`);

      // FAZ A REQUISIÇÃO COM O TOKEN NO HEADER
      const response = await fetch(`/api/start-game-v2?slug=${slug}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`📥 Status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}: ${errorText}`);
        
        // Se for 401, token expirado - tenta renovar
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
              console.log('✅ Token renovado com sucesso!');
              
              // Tenta novamente com o novo token
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
