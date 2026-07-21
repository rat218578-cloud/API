import { X, Key, Globe, Shield } from "lucide-react";
import { useState, useEffect } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [token, setToken] = useState(localStorage.getItem("access_token") || "");
  const [baseUrl, setBaseUrl] = useState(localStorage.getItem("api_base_url") || "https://sortenabet.bet.br");

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const handleSave = () => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("api_base_url", baseUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-card border border-border-default rounded-2xl w-full max-w-lg slide-in">
        <div className="flex items-center justify-between p-6 border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent-pink" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Configurações</h2>
              <p className="text-xs text-text-muted">Integração com APIs da Sorte na Bet</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
              <Globe className="w-4 h-4" /> URL Base da API
            </label>
            <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-default rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-pink"
              placeholder="https://sortenabet.bet.br" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
              <Key className="w-4 h-4" /> Access Token (JWT)
            </label>
            <textarea value={token} onChange={(e) => setToken(e.target.value)} rows={4}
              className="w-full bg-bg-tertiary border border-border-default rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-pink font-mono"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
            <p className="text-[11px] text-text-muted mt-2">Token salvo localmente no navegador. Duração típica: 7 dias.</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-xs text-amber-400">
              Endpoints configuráveis:<br />
              • POST /api/auth/login<br />
              • GET /api/start-game-v2?slug=...<br />
              • GET /api/sports, /api/events/live<br />
              • WebSocket Evolution
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border-default">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors">Cancelar</button>
          <button onClick={handleSave} className="btn-primary px-6 py-2.5 rounded-xl text-sm font-medium">Salvar configurações</button>
        </div>
      </div>
    </div>
  );
}
