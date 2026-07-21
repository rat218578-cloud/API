import { apiClient } from './api';

export interface GameTokenResponse {
  token: string;
  gameURL: string;
  iframe_url: string;
}

export class GameTokenService {
  private static instance: GameTokenService;
  private cachedTokens: Record<string, GameTokenResponse> = {};

  static getInstance(): GameTokenService {
    if (!GameTokenService.instance) {
      GameTokenService.instance = new GameTokenService();
    }
    return GameTokenService.instance;
  }

  async getGameToken(slug: string): Promise<GameTokenResponse | null> {
    try {
      // Verifica cache
      if (this.cachedTokens[slug]) {
        console.log('📦 Cache hit para:', slug);
        return this.cachedTokens[slug];
      }

      console.log('🎮 Chamando API para:', slug);

      // Tenta obter o link via API
      const url = await apiClient.getGameLink(slug);
      
      if (!url) {
        console.error('❌ API retornou null para:', slug);
        return null;
      }

      console.log('✅ URL obtida com sucesso!');

      // Extrai token da URL
      const tokenMatch = url.match(/[?&]token=([^&]+)/);
      const token = tokenMatch ? tokenMatch[1] : '';

      const response: GameTokenResponse = {
        token: token,
        gameURL: url,
        iframe_url: url
      };

      // Cacheia
      this.cachedTokens[slug] = response;
      
      return response;
    } catch (error) {
      console.error('❌ Erro:', error);
      return null;
    }
  }

  clearCache() {
    this.cachedTokens = {};
    console.log('🗑️ Cache limpo');
  }
}

export const gameTokenService = GameTokenService.getInstance();
