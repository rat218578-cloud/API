import { Wallet, GraduationCap, Download, Bell, User, ExternalLink, Crown, LogOut } from "lucide-react";
import type { User } from "../types";

interface HeaderProps {
title: string;
subtitle?: string;
balance: number;
user?: User | null;
onLogout?: () => void;
}

export function Header({ title, subtitle, balance, user, onLogout }: HeaderProps) {
return (
<header className="h-16 border-b border-border-default bg-bg-secondary/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-40">
<div className="flex items-center gap-4">
<div>
<h1 className="text-lg font-bold text-text-primary flex items-center gap-2">
<span className="text-gradient">Quebrando Algoritmo</span>
<span className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary border border-border-default text-text-secondary">
{title}
</span>
</h1>
{subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
</div>
</div>

  <div className="flex items-center gap-3">
    <a
      href="https://sortenabet.com"
      target="_blank"
      rel="noopener noreferrer"
      className="btn-primary hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
    >
      Jogar agora
      <ExternalLink className="w-4 h-4" />
    </a>

    <button className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-tertiary border border-border-default text-text-secondary hover:border-border-hover transition-colors text-sm">
      <Wallet className="w-4 h-4" />
      <span className="text-text-primary font-semibold">
        {balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </span>
    </button>

    <button className="p-2 rounded-xl bg-bg-tertiary border border-border-default text-text-secondary hover:border-border-hover transition-colors">
      <GraduationCap className="w-4 h-4" />
    </button>

    <button className="p-2 rounded-xl bg-bg-tertiary border border-border-default text-text-secondary hover:border-border-hover transition-colors">
      <Download className="w-4 h-4" />
    </button>

    <button className="p-2 rounded-xl bg-bg-tertiary border border-border-default text-text-secondary hover:border-border-hover transition-colors relative">
      <Bell className="w-4 h-4" />
      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-pink rounded-full" />
    </button>

    <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-bg-tertiary border border-border-default hover:border-border-hover transition-colors group">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
        <User className="w-4 h-4 text-white" />
      </div>
      <div className="hidden sm:block text-left">
        <div className="text-xs font-semibold text-text-primary">{user?.name || 'Usuário'}</div>
        <div className="text-[10px] text-text-muted flex items-center gap-1">
          <Crown className="w-3 h-3 text-amber-400" />
          {user?.plan || 'Pro'}
        </div>
      </div>
      {onLogout && (
        <button
          onClick={onLogout}
          className="ml-2 p-1 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-red-400 transition-colors"
        >
          <LogOut className="w-3 h-3" />
        </button>
      )}
    </button>
  </div>
</header>
);
}
