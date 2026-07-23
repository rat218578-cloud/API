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
  // Cache por jogo (cada jogo tem sua própria URL)
  private gameUrls: Record<string, { url: string; timestamp: number }> = {};
  private cacheTTL = 5 * 60 * 1000; // 5 minutos

  static getInstance(): GameLinkService {
    if (!GameLinkService.instance) {
      GameLinkService.instance = new GameLinkService();
    }
    return GameLinkService.instance;
  }

  async getGameUrl(slug: string): Promise<string | null> {
    // Verifica cache específico do jogo
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

      // Pega email do usuário
      let email = '';
      if (userData) {
        try {
          const user = JSON.parse(userData);
          email = user.email || user.login || '';
        } catch (e) {
          console.error('Erro ao parsear userData:', e);
        }
      }

      // Pega a senha do sessionStorage (salva no login)
      const password = sessionStorage.getItem('temp_password') || '';
      
      if (!email || !password) {
        console.error('❌ Email ou senha não encontrados. Faça login novamente.');
        // Se não tem credenciais, redireciona para login
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        window.location.href = '/';
        return null;
      }

      // Construir URL com email e password
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
        
        // Se for 401, redireciona para login
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_data');
          sessionStorage.removeItem('temp_password');
          window.location.href = '/';
        }
        return null;
      }

      const data = await response.json();
      console.log('📦 Resposta:', data);

      const gameUrl = data.iframe_url || data.gameURL || null;

      if (gameUrl) {
        // Guarda no cache específico do jogo
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

  // Limpa cache de um jogo específico
  clearGameCache(slug: string): void {
    delete this.gameUrls[slug];
    console.log(`🗑️ Cache limpo para ${slug}`);
  }

  clearAllCache(): void {
    this.gameUrls = {};
    console.log('🗑️ Todos os caches limpos');
  }
}

export const gameLinkService = GameLinkService.getInstance();
