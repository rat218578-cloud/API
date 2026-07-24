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
    console.log('🔑 Senha salva temporariamente');
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
