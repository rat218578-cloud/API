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
