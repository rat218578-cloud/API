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

      // Pega email e senha do usuário
      let email = '';
      let password = '';
      
      if (userData) {
        try {
          const user = JSON.parse(userData);
          email = user.email || user.login || '';
          // A senha não está salva, então vamos pedir ao usuário
          // Por enquanto, usamos a senha que está no formulário de login
          // Ou podemos tentar usar o token diretamente sem email/senha
        } catch (e) {
          console.error('Erro ao parsear userData:', e);
        }
      }

      // Construir URL com email e password se disponíveis
      let url = `/api/start-game-v2?slug=${slug}&platform=WEB&use_demo=0&source=watchIsAuthenticated`;
      
      // Se tiver email, adiciona na URL
      if (email) {
        url += `&email=${encodeURIComponent(email)}`;
      }
      
      // Se tiver senha, adiciona na URL
      // A senha pode ser obtida do campo de login
      // Como alternativa, vamos tentar usar o token apenas
      
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
        
        // Se for 401, NÃO remove o token - apenas retorna null
        // O usuário já está logado, o backend que precisa lidar com isso
        if (response.status === 401) {
          console.warn('⚠️ Token inválido ou expirado. Tente novamente.');
          // Não remove o token para não voltar para o login
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
