import { useState } from "react";
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

export function Sidebar({ activeGame, onGameChange, onSettingsClick, onGameLauncherClick }: SidebarProps) {
const [collapsed, setCollapsed] = useState(false);

const sidebarWidth = collapsed ? "w-16" : "w-64";

return (
<aside className={"fixed left-0 top-0 h-screen bg-bg-secondary border-r border-border-default transition-all duration-300 z-50 flex flex-col " + sidebarWidth}>
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
onClick={() => setCollapsed(!collapsed)}
className="p-1.5 rounded-lg hover text-text-secondary transition-colors"
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
);
}
