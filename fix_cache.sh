#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🧹 CORREÇÃO - REMOVENDO CACHE TTL"
echo "═══════════════════════════════════════════════════════════════"

# ========== CORRIGE GAMELINKSERVICE ==========
cat > src/services/gameLinkService.ts << 'GAMEOEF'
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

  static getInstance(): GameLinkService {
    if (!GameLinkService.instance) {
      GameLinkService.instance = new GameLinkService();
    }
    return GameLinkService.instance;
  }

  async getGameUrl(slug: string): Promise<string | null> {
    // SEMPRE GERAR NOVO TOKEN - SEM CACHE
    console.log(`🎮 Gerando NOVO token para: ${slug}`);

    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        console.error('❌ Token não encontrado no localStorage');
        return null;
      }

      console.log(`🔑 Token: ${token.substring(0, 30)}...`);

      // FORÇA GERAÇÃO DE NOVO TOKEN
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
        // NÃO GUARDA EM CACHE - SEMPRE NOVO
        console.log(`✅ NOVO link gerado para ${slug}`);
        return gameUrl;
      }

      return null;
    } catch (error) {
      console.error(`❌ Erro:`, error);
      return null;
    }
  }

  // Força geração de novo token para a roleta atual
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
GAMEOEF

echo "✅ src/services/gameLinkService.ts corrigido!"

echo "═══════════════════════════════════════════════════════════════"
echo "✅ CORREÇÃO CONCLUÍDA!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📦 Faça o commit e push:"
echo ""
echo "git add src/services/gameLinkService.ts"
echo "git commit -m \"fix: remove cacheTTL não usado\""
echo "git push origin main"
echo ""
echo "🚀 O Railway vai buildar com sucesso!"
echo "═══════════════════════════════════════════════════════════════"

