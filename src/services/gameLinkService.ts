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
  private cache: Record<string, { url: string; timestamp: number }> = {};
  private cacheTTL = 5 * 60 * 1000;

  static getInstance(): GameLinkService {
    if (!GameLinkService.instance) {
      GameLinkService.instance = new GameLinkService();
    }
    return GameLinkService.instance;
  }

  private getCredentials(): { email: string; password: string } | null {
    try {
      const userData = localStorage.getItem('user_data');
      if (!userData) return null;
      
      const user = JSON.parse(userData);
      // O password não está no localStorage por segurança
      // Vamos pedir ao usuário ou usar o que está no formulário
      return {
        email: user.email || user.login || '',
        password: '' // Será preenchido pelo usuário
      };
    } catch {
      return null;
    }
  }

  async getGameUrl(slug: string): Promise<string | null> {
    const cached = this.cache[slug];
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

      let user = null;
      if (userData) {
        user = JSON.parse(userData);
      }

      // Construir URL com credenciais se disponíveis
      let url = `/api/start-game-v2?slug=${slug}&platform=WEB&use_demo=0&source=watchIsAuthenticated`;
      
      // Se tiver email, adiciona na URL
      if (user && user.email) {
        url += `&email=${encodeURIComponent(user.email)}`;
      }
      
      // Se tiver senha (pode ser que o usuário tenha digitado)
      // A senha não está salva, então vamos usar o token como fallback
      
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
        const errorData = await response.json();
        console.error(`❌ HTTP ${response.status}:`, errorData);
        
        // Se for 401 e tiver erro de email/password, pede para o usuário logar novamente
        if (response.status === 401 && errorData.error?.includes('email e password')) {
          console.warn('⚠️ Credenciais necessárias. Faça login novamente.');
          // Força logout para o usuário fazer login novamente
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_data');
          window.location.reload();
        }
        return null;
      }

      const data = await response.json();
      console.log('📦 Resposta:', data);

      const gameUrl = data.iframe_url || data.gameURL || null;

      if (gameUrl) {
        this.cache[slug] = {
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

  clearCache(): void {
    this.cache = {};
    console.log('🗑️ Cache limpo');
  }
}

export const gameLinkService = GameLinkService.getInstance();
