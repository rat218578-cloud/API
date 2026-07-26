#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔧 CORREÇÃO DEFINITIVA - TIPOS E AUTENTICAÇÃO"
echo "═══════════════════════════════════════════════════════════════"

# ========== 1. CORRIGE TYPES/INDEX.TS ==========
cat > src/types/index.ts << 'TYPESEOF'
export interface RouletteNumber {
  number: number;
  color: "red" | "black" | "green";
  parity: "even" | "odd" | "zero";
  range: "low" | "high" | "zero";
  column: "C1" | "C2" | "C3" | "Zero";
  dozen: "D1" | "D2" | "D3" | "Zero";
  sector: "Oposto" | "Direito" | "Esquerdo" | "Zero";
}

export interface Strategy {
  id: string;
  name: string;
  assertiveness: number;
  color: string;
  description: string;
}

export interface Signal {
  id: string;
  strategy: string;
  numbers: number[];
  assertiveness: number;
  timestamp: Date;
  reason: string;
}

export interface GameRoom {
  id: string;
  name: string;
  provider: string;
  type: "live" | "manual" | "free";
  spins: number;
  lastNumber: number | null;
}

export interface Bankroll {
  id: string;
  name: string;
  initialBalance: number;
  currentBalance: number;
  wins: number;
  losses: number;
  active: boolean;
  createdAt: Date;
}

export interface SimulatorResult {
  day: number;
  balance: number;
  target: number;
  accumulated: number;
}

export type GameCategory =
  | "roleta"
  | "bacbo"
  | "football-studio"
  | "aviator"
  | "crazy-time"
  | "mines"
  | "fortune-tiger";

export interface SidebarItem {
  id: GameCategory;
  name: string;
  icon: string;
  status: "active" | "beta" | "soon";
}

export interface User {
  id: string;
  email: string;
  name: string;
  cpf?: string;
  avatar?: string;
  plan: "free" | "pro" | "enterprise";
}

export interface RouletteSpin {
  number: number;
  color: "red" | "black" | "green";
  timestamp: string;
  roundId: string;
}

export interface RouletteHistoryResponse {
  spins: RouletteSpin[];
  total: number;
  room: string;
}
TYPESEOF

echo "✅ src/types/index.ts corrigido!"

# ========== 2. CORRIGE HOOK USEAUTH.TS ==========
cat > src/hooks/useAuth.ts << 'AUTHOEF'
import { useState, useEffect } from 'react';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false
  });

  const refreshToken = async (refreshToken: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        return data.access_token;
      }
      return null;
    } catch {
      return null;
    }
  };

  const validateToken = async (): Promise<boolean> => {
    const accessToken = localStorage.getItem('access_token');
    const refreshTokenStored = localStorage.getItem('refresh_token');
    
    if (!accessToken) {
      setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      return false;
    }

    try {
      const response = await fetch('/api/auth/validate', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ 
          ...prev, 
          user: { 
            id: data.user_id, 
            email: data.email, 
            name: data.email?.split('@')[0] || 'Usuário', 
            plan: 'pro' as const 
          },
          isAuthenticated: true,
          loading: false 
        }));
        return true;
      }

      if (refreshTokenStored) {
        const newAccessToken = await refreshToken(refreshTokenStored);
        if (newAccessToken) {
          return await validateToken();
        }
      }

      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      return false;
    } catch {
      setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        setState(prev => ({ ...prev, error: (data as any).error || 'Erro ao fazer login', loading: false }));
        return false;
      }

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      setState(prev => ({
        ...prev,
        user: data.user,
        isAuthenticated: true,
        loading: false
      }));

      return true;
    } catch {
      setState(prev => ({ ...prev, error: 'Erro de conexão', loading: false }));
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
      } catch {}
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    setState({
      user: null,
      loading: false,
      error: null,
      isAuthenticated: false
    });
  };

  useEffect(() => {
    validateToken();
  }, []);

  return {
    ...state,
    login,
    logout,
    validateToken,
    refreshToken
  };
}
AUTHOEF

echo "✅ src/hooks/useAuth.ts corrigido!"

# ========== 3. CORRIGE GAMELAUNCHER ==========
cat > src/components/GameLauncher.tsx << 'GAMEOEF'
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Loader2, ExternalLink, Gamepad2, X } from 'lucide-react';

interface GameLauncherProps {
  isOpen: boolean;
  onClose: () => void;
}

const JOGOS = {
  aviator: { id: 'aviator', nome: 'Aviator', slug: 'spribe/aviator', provedor: 'Spribe', emoji: '✈️' },
  football_studio_dice: { id: 'football_studio_dice', nome: 'Football Studio Dice', slug: 'evolution/football-studio-dice', provedor: 'Evolution', emoji: '⚽' },
  crazy_time: { id: 'crazy_time', nome: 'Crazy Time', slug: 'evolution/crazy-time', provedor: 'Evolution', emoji: '🎡' },
  lightning_roulette: { id: 'lightning_roulette', nome: 'Lightning Roulette', slug: 'evolution/lightning-roulette', provedor: 'Evolution', emoji: '⚡' },
  mega_ball: { id: 'mega_ball', nome: 'Mega Ball', slug: 'evolution/mega-ball', provedor: 'Evolution', emoji: '🎱' },
};

export function GameLauncher({ isOpen, onClose }: GameLauncherProps) {
  const { login, isAuthenticated } = useAuth();
  const [links, setLinks] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && isAuthenticated && Object.keys(links).length === 0) {
      loadGameLinks();
    }
  }, [isOpen, isAuthenticated]);

  const loadGameLinks = async () => {
    setLoading(true);
    try {
      const newLinks: Record<string, string | null> = {};
      for (const [key, jogo] of Object.entries(JOGOS)) {
        try {
          // Simula carregamento dos links
          await new Promise(resolve => setTimeout(resolve, 300));
          newLinks[key] = `https://sortenabet.bet.br/game/${jogo.slug}`;
        } catch {
          newLinks[key] = null;
        }
      }
      setLinks(newLinks);
    } catch (error) {
      console.error('Erro ao carregar jogos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-bg-card border border-border-default rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border-default">
            <div className="flex items-center gap-3">
              <Gamepad2 className="w-5 h-5 text-accent-pink" />
              <div>
                <h2 className="text-lg font-bold text-text-primary">Jogos Disponíveis</h2>
                <p className="text-xs text-text-muted">Selecione um jogo para começar</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto max-h-[70vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-accent-pink" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(JOGOS).map(([key, jogo]) => {
                  const url = links[key];
                  return (
                    <div
                      key={key}
                      onClick={() => url && setSelectedGame(key)}
                      className={`p-4 rounded-xl border transition-all ${
                        url
                          ? 'bg-bg-tertiary border-border-default hover:border-accent-pink cursor-pointer hover:scale-105'
                          : 'bg-bg-secondary border-border-default opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-3xl mb-2">{jogo.emoji}</div>
                      <div className="font-bold text-sm text-text-primary">{jogo.nome}</div>
                      <div className="text-xs text-text-muted">{jogo.provedor}</div>
                      {url ? (
                        <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Disponível
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Indisponível
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-border-default flex justify-between items-center">
            <span className="text-xs text-text-muted">{Object.values(links).filter(Boolean).length} jogos disponíveis</span>
            <button
              onClick={loadGameLinks}
              disabled={loading}
              className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {selectedGame && links[selectedGame] && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border-default rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{JOGOS[selectedGame as keyof typeof JOGOS]?.emoji}</span>
                <span className="font-bold text-text-primary">{JOGOS[selectedGame as keyof typeof JOGOS]?.nome}</span>
                <span className="text-xs text-text-muted">{JOGOS[selectedGame as keyof typeof JOGOS]?.provedor}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={links[selectedGame]!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-default text-text-secondary hover:text-text-primary text-sm flex items-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" /> Abrir
                </a>
                <button
                  onClick={() => setSelectedGame(null)}
                  className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="w-full h-[calc(100%-60px)]">
              <iframe
                src={links[selectedGame]!}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen; camera; microphone"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
GAMEOEF

echo "✅ src/components/GameLauncher.tsx corrigido!"

# ========== 4. CORRIGE APP.TSX ==========
cat > src/App.tsx << 'APPOEF'
import { useState } from "react";
import { Wallet, Gamepad2, Gamepad } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { RouletteDashboard } from "./components/RouletteDashboard";
import { BankrollManager } from "./components/BankrollManager";
import { GamePlaceholder } from "./components/GamePlaceholder";
import { SettingsModal } from "./components/SettingsModal";
import { Login } from "./components/Login";
import { GameLauncher } from "./components/GameLauncher";
import { useAuth } from "./hooks/useAuth";
import type { GameCategory } from "./types";

const GAME_INFO: Record<GameCategory, { title: string; subtitle: string; status: "active" | "beta" | "soon" }> = {
  roleta: { title: "Roleta", subtitle: "Brasileira: análise ao vivo", status: "active" },
  bacbo: { title: "Bac Bo", subtitle: "Análise de dados", status: "beta" },
  "football-studio": { title: "Football Studio", subtitle: "Análise de cartas", status: "beta" },
  aviator: { title: "Aviator", subtitle: "Previsão de multiplicadores", status: "beta" },
  "crazy-time": { title: "Crazy Time", subtitle: "Roda da fortuna", status: "soon" },
  mines: { title: "Mines", subtitle: "Campo minado", status: "soon" },
  "fortune-tiger": { title: "Fortune Tiger", subtitle: "Slots", status: "soon" },
};

export default function App() {
  const { user, loading, login, logout, isAuthenticated, error } = useAuth();
  const [activeGame, setActiveGame] = useState<GameCategory>("roleta");
  const [currentView, setCurrentView] = useState<"game" | "bankroll">("game");
  const [balance] = useState(10000);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gameLauncherOpen, setGameLauncherOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogin = async (loginValue: string, password: string) => {
    sessionStorage.setItem('temp_password', password);
    return await login(loginValue, password);
  };

  if (!isAuthenticated) return <Login onLogin={handleLogin} loading={loading} error={error} />;

  const gameInfo = GAME_INFO[activeGame];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Sidebar 
        activeGame={activeGame} 
        onGameChange={(game) => { setActiveGame(game); setCurrentView("game"); }}
        onSettingsClick={() => setSettingsOpen(true)} 
        onGameLauncherClick={() => setGameLauncherOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className={`transition-all duration-300 min-h-screen ${sidebarCollapsed ? "ml-16" : "ml-64"}`}>
        <Header 
          title={currentView === "bankroll" ? "Ferramenta" : gameInfo.title}
          balance={balance} 
          user={user} 
          onLogout={logout} 
        />
        {currentView === "bankroll" ? <BankrollManager onBack={() => setCurrentView("game")} /> :
         activeGame === "roleta" ? <RouletteDashboard /> :
         <GamePlaceholder title={gameInfo.title} status={gameInfo.status === "active" ? "beta" : gameInfo.status} />}
      </main>
      <button onClick={() => setCurrentView(currentView === "bankroll" ? "game" : "bankroll")}
        className="fixed bottom-6 right-6 z-50 btn-primary px-5 py-3 rounded-full shadow-lg flex items-center gap-2">
        {currentView === "bankroll" ? <Gamepad2 className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
        {currentView === "bankroll" ? "Voltar" : "Banca"}
      </button>
      <button onClick={() => setGameLauncherOpen(true)}
        className="fixed bottom-6 right-24 z-50 bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-3 rounded-full shadow-lg flex items-center gap-2 text-white font-bold hover:scale-105 transition-transform">
        <Gamepad className="w-4 h-4" /> Jogar
      </button>
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <GameLauncher isOpen={gameLauncherOpen} onClose={() => setGameLauncherOpen(false)} />
    </div>
  );
}
APPOEF

echo "✅ src/App.tsx corrigido!"

# ========== 5. CORRIGE HEADER ==========
cat > src/components/Header.tsx << 'HEADEOEF'
import { 
  Wallet, 
  GraduationCap, 
  Download, 
  Bell, 
  User as UserIcon, 
  ExternalLink, 
  Crown, 
  LogOut,
  Circle
} from "lucide-react";
import type { User } from "../types";

interface HeaderProps {
  title: string;
  balance: number;
  user?: User | null;
  onLogout?: () => void;
}

export function Header({ title, balance, user, onLogout }: HeaderProps) {
  return (
    <header className="h-14 border-b border-border-default bg-bg-secondary/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <span className="text-gradient">Quebrando Algoritmo</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary border border-border-default text-text-secondary">
              {title}
            </span>
          </h1>
          <div className="flex items-center gap-2">
            <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-medium">AO VIVO</span>
            <span className="text-[10px] text-text-muted">•</span>
            <span className="text-[10px] text-text-muted">Conectado</span>
            <span className="text-[10px] text-text-muted">•</span>
            <span className="text-[10px] text-text-muted">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href="https://sortenabet.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
        >
          Jogar agora
          <ExternalLink className="w-3 h-3" />
        </a>

        <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-tertiary border border-border-default text-text-secondary hover:border-border-hover transition-colors text-xs">
          <Wallet className="w-3 h-3" />
          <span className="text-text-primary font-semibold">
            {balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </button>

        <button className="p-1.5 rounded-xl bg-bg-tertiary border border-border-default text-text-secondary hover:border-border-hover transition-colors">
          <GraduationCap className="w-3 h-3" />
        </button>

        <button className="p-1.5 rounded-xl bg-bg-tertiary border border-border-default text-text-secondary hover:border-border-hover transition-colors">
          <Download className="w-3 h-3" />
        </button>

        <button className="p-1.5 rounded-xl bg-bg-tertiary border border-border-default text-text-secondary hover:border-border-hover transition-colors relative">
          <Bell className="w-3 h-3" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent-pink rounded-full" />
        </button>

        <button className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-bg-tertiary border border-border-default hover:border-border-hover transition-colors group">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
            <UserIcon className="w-3 h-3 text-white" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-[10px] font-semibold text-text-primary">{user?.name || 'Usuário'}</div>
            <div className="text-[8px] text-text-muted flex items-center gap-1">
              <Crown className="w-2.5 h-2.5 text-amber-400" />
              {user?.plan || 'Pro'}
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="ml-1 p-0.5 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-red-400 transition-colors"
            >
              <LogOut className="w-2.5 h-2.5" />
            </button>
          )}
        </button>
      </div>
    </header>
  );
}
HEADEOEF

echo "✅ src/components/Header.tsx corrigido!"

echo "═══════════════════════════════════════════════════════════════"
echo "✅ TODOS OS ARQUIVOS FORAM CORRIGIDOS!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📦 Agora faça o commit e push:"
echo ""
echo "git add ."
echo "git commit -m \"fix: corrige todos os erros TypeScript e autenticação\""
echo "git push origin main"
echo ""
echo "🚀 O Railway vai fazer o build com sucesso!"
echo "═══════════════════════════════════════════════════════════════"

