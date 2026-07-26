#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔄 RESTAURANDO SIDEBAR COMPLETA - VERSÃO ORIGINAL"
echo "═══════════════════════════════════════════════════════════════"

# ========== RESTAURA SIDEBAR COMPLETA ==========
cat > src/components/Sidebar.tsx << 'SIDEBAREOF'
import {
  CircleDot,
  Dice5,
  Trophy,
  Plane,
  Clock,
  Bomb,
  Cat,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Settings,
  Gamepad,
} from "lucide-react";
import type { GameCategory } from "../types";

interface SidebarProps {
  activeGame: GameCategory;
  onGameChange: (game: GameCategory) => void;
  onSettingsClick?: () => void;
  onGameLauncherClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const menuItems = [
  { id: "roleta" as GameCategory, name: "Roleta", icon: CircleDot, status: "active" },
  { id: "bacbo" as GameCategory, name: "Bac Bo", icon: Dice5, status: "beta" },
  { id: "football-studio" as GameCategory, name: "Football Studio", icon: Trophy, status: "beta" },
  { id: "aviator" as GameCategory, name: "Aviator", icon: Plane, status: "beta" },
  { id: "crazy-time" as GameCategory, name: "Crazy Time", icon: Clock, status: "soon" },
  { id: "mines" as GameCategory, name: "Mines", icon: Bomb, status: "soon" },
  { id: "fortune-tiger" as GameCategory, name: "Fortune Tiger", icon: Cat, status: "soon" },
];

export function Sidebar({ 
  activeGame, 
  onGameChange, 
  onSettingsClick, 
  onGameLauncherClick,
  collapsed = false,
  onToggleCollapse 
}: SidebarProps) {
  const sidebarWidth = collapsed ? "w-16" : "w-64";

  return (
    <>
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen bg-bg-secondary border-r border-border-default transition-all duration-300 z-50 flex flex-col ${sidebarWidth}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border-default">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center animate-pulse-glow">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight">
                QA<span className="text-accent-pink">.ai</span>
              </span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 mb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
              Ferramentas
            </div>
          )}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeGame === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onGameChange(item.id)}
                className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative " + (
                  isActive
                    ? "bg-gradient-to-r from-pink-500/20 to-violet-600/20 text-text-primary border border-pink-500/30"
                    : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                )}
              >
                <Icon className={"w-5 h-5 " + (isActive ? "text-accent-pink" : "")} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-sm font-medium text-left">{item.name}</span>
                    <span
                      className={"text-[10px] px-1.5 py-0.5 rounded-full " + (
                        item.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : item.status === "beta"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-text-muted/20 text-text-muted"
                      )}
                    >
                      {item.status === "active" ? "ON" : item.status === "beta" ? "BETA" : "BREVE"}
                    </span>
                  </>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-bg-tertiary border border-border-default rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.name}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-border-default space-y-1">
          <button
            onClick={onGameLauncherClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
          >
            <Gamepad className="w-5 h-5" />
            {!collapsed && <span className="text-sm font-medium">Jogos</span>}
          </button>
          <button
            onClick={onSettingsClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
          >
            <Settings className="w-5 h-5" />
            {!collapsed && <span className="text-sm font-medium">Configurações</span>}
          </button>
        </div>
      </aside>

      {/* Espaçador para o conteúdo principal */}
      <div className={collapsed ? "ml-16" : "ml-64"} />
    </>
  );
}
SIDEBAREOF

echo "✅ src/components/Sidebar.tsx restaurado!"

# ========== RESTAURA APP.TSX ==========
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

echo "✅ src/App.tsx restaurado!"

# ========== RESTAURA ROULETTEDASHBOARD ==========
cat > src/components/RouletteDashboard.tsx << 'ROULETOEF'
import { useState, useMemo, useEffect } from "react";
import { SignalGenerator } from "./SignalGenerator";
import { LiveGameView } from "./LiveGameView";
import { ROLETAS } from "../services/gameLinkService";
import {
  STRATEGIES,
  getNumberInfo,
  getColorClass,
  generateRandomHistory,
  sanitizeHistory
} from "../utils/roulette";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

export function RouletteDashboard() {
  const [activeRoom, setActiveRoom] = useState(ROLETAS[0].id);
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showCatalog, setShowCatalog] = useState(true);

  useEffect(() => {
    const simulateHistory = () => {
      const numbers = [];
      for (let i = 0; i < 50; i++) {
        if (Math.random() > 0.3) {
          numbers.push(Math.floor(Math.random() * 37));
        } else {
          const hotNumbers = [0, 7, 14, 17, 21, 23, 26, 32, 35, 36];
          numbers.push(hotNumbers[Math.floor(Math.random() * hotNumbers.length)]);
        }
      }
      return numbers;
    };

    const fallbackNumbers = simulateHistory();
    const sanitized = sanitizeHistory(fallbackNumbers);
    setHistory(sanitized);
    setLoading(false);
  }, [activeRoom]);

  const openGame = (slug: string) => {
    setSelectedSlug(slug);
    setShowVideo(true);
  };

  const closeGame = () => {
    setShowVideo(false);
    setSelectedSlug(null);
  };

  const topNumbers = useMemo(() => {
    const validHistory = sanitizeHistory(history);
    const counts: Record<number, number> = {};
    validHistory.forEach((n) => {
      counts[n] = (counts[n] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([n, count]) => ({ number: Number(n), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [history]);

  const refreshHistory = () => {
    setLoading(true);
    const newNumbers = generateRandomHistory(30);
    const sanitized = sanitizeHistory(newNumbers);
    setHistory(sanitized);
    setLoading(false);
  };

  const getLastThree = () => {
    return history.slice(0, 3);
  };

  if (loading && history.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent-pink mx-auto mb-4" />
          <p className="text-text-muted">Carregando dados da roleta...</p>
        </div>
      </div>
    );
  }

  const lastThree = getLastThree();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-wrap">
        {ROLETAS.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setActiveRoom(r.id);
              openGame(r.slug);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
              activeRoom === r.id
                ? "bg-bg-tertiary border-accent-pink text-text-primary shadow-lg shadow-accent-pink/20"
                : "bg-bg-card border-border-default text-text-secondary hover:border-border-hover"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeRoom === r.id ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted'}`} />
            {r.nome}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        
        <div className={`xl:col-span-2 transition-all duration-300 ${showCatalog ? 'block' : 'hidden xl:block'}`}>
          <div className="bg-bg-card border border-border-default rounded-2xl p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">📊 Catalogo</h3>
              <button 
                onClick={() => setShowCatalog(!showCatalog)}
                className="xl:hidden p-1 rounded-lg hover:bg-bg-tertiary"
              >
                {showCatalog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={refreshHistory}
                disabled={loading}
                className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                SIM
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {STRATEGIES.slice(0, 3).map((s) => (
                <div
                  key={s.id}
                  className="p-2 rounded-lg text-center border border-border-default"
                  style={{ backgroundColor: `${s.color}10` }}
                >
                  <div className="text-[8px] text-text-secondary font-bold uppercase">{s.name}</div>
                  <div className="text-sm font-bold" style={{ color: s.color }}>
                    {s.assertiveness}%
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              <div className="grid grid-cols-6 text-[8px] text-text-muted uppercase py-1 border-b border-border-default text-center">
                <span>N</span><span>A/B</span><span>I/P</span><span>COL</span><span>DUZ</span><span>SET</span>
              </div>
              {topNumbers.map((item) => {
                const info = getNumberInfo(item.number);
                return (
                  <div key={item.number} className="grid grid-cols-6 items-center py-1 text-[10px] border-b border-border-default/30 text-center">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[8px] mx-auto ${getColorClass(item.number)}`}>
                      {item.number}
                    </div>
                    <span className={info.range === "high" ? "text-accent-amber" : "text-text-secondary"}>
                      {info.range === "zero" ? "Z" : info.range === "high" ? "A" : "B"}
                    </span>
                    <span className="text-text-secondary">{info.parity === "zero" ? "Z" : info.parity === "even" ? "P" : "I"}</span>
                    <span className="text-violet-400">{info.column}</span>
                    <span className="text-blue-400">{info.dozen}</span>
                    <span className="text-emerald-400">{info.sector.slice(0,3)}</span>
                  </div>
                );
              })}
            </div>
            {topNumbers.length > 5 && (
              <button className="w-full text-[10px] text-text-muted hover:text-text-primary py-1 mt-1">
                Ver mais ↓
              </button>
            )}
          </div>
        </div>

        <div className="xl:col-span-7">
          {showVideo && selectedSlug ? (
            <LiveGameView
              slug={selectedSlug}
              isOpen={showVideo}
              onClose={closeGame}
            />
          ) : (
            <div className="bg-bg-card border border-border-default rounded-2xl p-8 flex flex-col items-center justify-center min-h-[500px]">
              <div className="text-6xl mb-4">🎰</div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Escolha uma roleta</h3>
              <p className="text-text-muted text-sm text-center max-w-md">
                Selecione uma roleta no topo para ver o jogo ao vivo
              </p>
            </div>
          )}
        </div>

        <div className="xl:col-span-3 space-y-4">
          <div className="bg-bg-card border border-border-default rounded-2xl p-4">
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-3">📈 Grupos</h3>
            <div className="text-[10px] text-text-muted uppercase mb-2">Sequência atual</div>
            <div className="p-3 rounded-xl bg-gradient-to-r from-bg-tertiary to-bg-secondary border border-border-default text-center mb-3">
              <div className="text-xs font-bold text-text-primary">
                {history.length > 0 ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className={`px-2 py-0.5 rounded ${getColorClass(history[0] || 0)} text-[10px] font-bold`}>
                      {getNumberInfo(history[0] || 0).color.toUpperCase()}
                    </span>
                    <span>—</span>
                    <span className="text-text-secondary">{getNumberInfo(history[0] || 0).range.toUpperCase()}</span>
                  </span>
                ) : "---"}
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 text-center">
              {lastThree.map((num, idx) => (
                <div key={idx} className="text-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getColorClass(num)}`}>
                    {num || '--'}
                  </div>
                  <div className="text-[8px] text-text-muted mt-0.5">
                    {idx === 0 ? 'Último' : idx === 1 ? 'Penúlt' : 'Antep'}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 rounded-lg bg-bg-tertiary border border-border-default text-center">
              <div className="text-[10px] text-text-muted">Tendência</div>
              <div className="text-sm font-bold text-emerald-400">⬆ Forte</div>
            </div>
          </div>

          <div className="bg-bg-card border border-border-default rounded-2xl p-4">
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-3">🎯 Assertividade</h3>
            <div className="space-y-3">
              {STRATEGIES.map((s) => (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-text-secondary">{s.name}</span>
                    <span className="font-bold" style={{ color: s.color }}>
                      {s.assertiveness}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${s.assertiveness}%`, backgroundColor: s.color }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <SignalGenerator history={history} />
      </div>
    </div>
  );
}
ROULETOEF

echo "✅ src/components/RouletteDashboard.tsx restaurado!"

echo "═══════════════════════════════════════════════════════════════"
echo "✅ SIDEBAR COMPLETA RESTAURADA!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📦 Faça o commit e push:"
echo ""
echo "git add ."
echo "git commit -m \"feat: restaura sidebar completa com todas as ferramentas\""
echo "git push origin main"
echo ""
echo "🔄 O que foi restaurado:"
echo "  ✅ Sidebar com todas as ferramentas"
echo "  ✅ Roleta, Bac Bo, Football Studio, Aviator"
echo "  ✅ Crazy Time, Mines, Fortune Tiger"
echo "  ✅ Colapso da sidebar (ícone << >>)"
echo "  ✅ Botões Jogos e Configurações"
echo "  ✅ RouletteDashboard completo com catálogo"
echo ""
echo "🚀 Depois do deploy, a sidebar vai aparecer na lateral esquerda!"
echo "═══════════════════════════════════════════════════════════════"

