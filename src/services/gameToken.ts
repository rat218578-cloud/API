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
      // Se já temos o token em cache, retorna
      if (this.cachedTokens[slug]) {
        console.log('📦 Token do jogo em cache:', slug);
        return this.cachedTokens[slug];
      }

      console.log('🎮 Gerando token do jogo:', slug);
      
      // Usa o apiClient para obter o link do jogo
      const url = await apiClient.getGameLink(slug);
      
      if (!url) {
        throw new Error('Não foi possível obter o link do jogo');
      }

      // Extrai o token da URL
      const tokenMatch = url.match(/[?&]token=([^&]+)/);
      const token = tokenMatch ? tokenMatch[1] : '';
      
      const response: GameTokenResponse = {
        token: token,
        gameURL: url,
        iframe_url: url
      };

      // Cacheia o token
      this.cachedTokens[slug] = response;
      
      console.log('✅ Token do jogo gerado com sucesso!');
      console.log('🔑 Token:', token.substring(0, 30) + '...');
      
      return response;
    } catch (error) {
      console.error('❌ Erro ao gerar token do jogo:', error);
      return null;
    }
  }

  clearCache() {
    this.cachedTokens = {};
    console.log('🗑️ Cache de tokens limpo');
  }
}

export const gameTokenService = GameTokenService.getInstance();
