import CryptoJS from 'crypto-js';

// ========== CONFIGURAÇÕES ==========
const SITE_KEY = "0x4AAAAAAADmr68KUqpnEKo-9";
const SECRET_KEY = "0x4AAAAAAADmr62kWZNpTLxzKtYOYbpw7wzY";

// Usa o proxy local (evita CORS)
const API_BASE = '/api';

// ========== TIPOS ==========
export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    name: string;
    email: string;
    cpf?: string;
    verified: boolean;
    balance: number;
  };
}

export interface JogoInfo {
  id: string;
  nome: string;
  slug: string;
  provedor: string;
  emoji: string;
}

// ========== LISTA DE JOGOS ==========
export const JOGOS: Record<string, JogoInfo> = {
  aviator: {
    id: "aviator",
    nome: "Aviator",
    slug: "spribe/aviator",
    provedor: "Spribe",
    emoji: "✈️"
  },
  football_studio_dice: {
    id: "football_studio_dice",
    nome: "Football Studio Dice",
    slug: "evolution/football-studio-dice",
    provedor: "Evolution",
    emoji: "⚽"
  },
  crazy_time: {
    id: "crazy_time",
    nome: "Crazy Time",
    slug: "evolution/crazy-time",
    provedor: "Evolution",
    emoji: "🎡"
  },
  lightning_roulette: {
    id: "lightning_roulette",
    nome: "Lightning Roulette",
    slug: "evolution/lightning-roulette",
    provedor: "Evolution",
    emoji: "🎰"
  },
  mega_ball: {
    id: "mega_ball",
    nome: "Mega Ball",
    slug: "evolution/mega-ball",
    provedor: "Evolution",
    emoji: "🎱"
  }
};

// ========== GERADOR DE TOKEN TURNSTILE ==========
export class TurnstileTokenGenerator {
  private siteKey: string;
  private secretKey: string;

  constructor(siteKey: string, secretKey: string) {
    this.siteKey = siteKey;
    this.secretKey = secretKey;
  }

  generateToken(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = this.generateNonce();

    const payload = {
      sitekey: this.siteKey,
      timestamp: timestamp,
      nonce: nonce,
      user_agent: navigator.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      action: "login",
      cdata: ""
    };

    const payloadJson = JSON.stringify(payload);
    const payloadB64 = btoa(payloadJson);

    const signature = CryptoJS.SHA256(`${payloadB64}.${this.secretKey}`)
      .toString(CryptoJS.enc.Hex)
      .substring(0, 32);

    const finalHash = CryptoJS.SHA256(`${payloadB64}.${signature}`)
      .toString(CryptoJS.enc.Hex);

    return `t2:1.${payloadB64}.${signature}.${finalHash}`;
  }

  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

// ========== CLIENTE API ==========
class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private captchaToken: string | null = null;

  constructor() {
    this.baseUrl = API_BASE;
    this.accessToken = localStorage.getItem('access_token');
  }

  setCaptchaToken(token: string) {
    this.captchaToken = token;
  }

  getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (includeAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  async login(loginValue: string, password: string): Promise<LoginResponse> {
    if (!this.captchaToken) {
      const generator = new TurnstileTokenGenerator(SITE_KEY, SECRET_KEY);
      this.captchaToken = generator.generateToken();
      console.log('🔑 Token gerado:', this.captchaToken.substring(0, 50) + '...');
    }

    const isEmail = loginValue.includes('@');
    const payload = {
      login: loginValue,
      email: isEmail ? loginValue : undefined,
      cpf: !isEmail ? loginValue.replace(/\D/g, '') : undefined,
      password: password,
      app_source: 'web',
      captcha_token: this.captchaToken
    };

    console.log('📤 Enviando login para:', `${this.baseUrl}/auth/login`);
    console.log('📦 Payload:', { ...payload, password: '***' });

    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: this.getHeaders(false),
        body: JSON.stringify(payload)
      });

      console.log('📥 Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro:', errorText);
        let errorMessage = 'Erro ao fazer login';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      console.log('✅ Login bem-sucedido! Token:', this.accessToken?.substring(0, 30) + '...');

      if (this.accessToken) {
        localStorage.setItem('access_token', this.accessToken);
        localStorage.setItem('user_data', JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw error;
    }
  }

  async getGameLink(slug: string): Promise<string | null> {
    if (!this.accessToken) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/start-game-v2?slug=${slug}&platform=WEB&use_demo=0&source=watchIsAuthenticated`,
        {
          method: 'GET',
          headers: this.getHeaders(true)
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.gameURL || data.iframe_url || null;
    } catch (error) {
      console.error(`Erro ao obter link do jogo ${slug}:`, error);
      return null;
    }
  }

  async getAllGameLinks(): Promise<Record<string, string | null>> {
    const links: Record<string, string | null> = {};

    for (const [key, jogo] of Object.entries(JOGOS)) {
      try {
        const url = await this.getGameLink(jogo.slug);
        links[key] = url;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        links[key] = null;
      }
    }

    return links;
  }

  logout() {
    this.accessToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getUserData(): any {
    try {
      const data = localStorage.getItem('user_data');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}

export const apiClient = new ApiClient();

// ========== RE-EXPORT ==========
export { rouletteApi } from './rouletteApi';
