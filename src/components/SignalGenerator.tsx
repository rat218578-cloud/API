import { useState } from "react";
import { Sparkles, Loader2, Target, Clock, Brain } from "lucide-react";
import { generateAISignal } from "../utils/roulette";
import type { Signal } from "../types";

interface SignalGeneratorProps {
  history: number[];
}

export function SignalGenerator({ history: _history }: SignalGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      const newSignals: Signal[] = [];
      for (let i = 0; i < 3; i++) {
        newSignals.push(generateAISignal());
      }
      setSignals((prev) => [...newSignals, ...prev].slice(0, 10));
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="bg-bg-card border border-border-default rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center animate-pulse-glow">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary text-sm">IA de Sinais</h3>
            <p className="text-xs text-text-muted">Geração inteligente de entradas</p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Analisando..." : "Gerar sinais"}
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "all"
              ? "bg-bg-tertiary text-text-primary border border-border-hover"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Todos os sinais
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "favorites"
              ? "bg-bg-tertiary text-text-primary border border-border-hover"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Favoritos
        </button>
      </div>

      <div className="space-y-2 max-h-[320px] overflow-y-auto">
        {signals.length === 0 ? (
          <div className="text-center py-8 text-text-muted border border-dashed border-border-default rounded-xl">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum sinal gerado ainda</p>
            <p className="text-xs">Clique em "Gerar sinais" para começar</p>
          </div>
        ) : (
          signals.map((signal) => (
            <div
              key={signal.id}
              className="p-3 rounded-xl bg-bg-tertiary/50 border border-border-default hover:border-border-hover transition-colors slide-in"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-accent-pink">{signal.strategy}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      signal.assertiveness >= 85
                        ? "bg-emerald-500/20 text-emerald-400"
                        : signal.assertiveness >= 70
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {signal.assertiveness}% assertividade
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-text-muted">
                  <Clock className="w-3 h-3" />
                  {signal.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {signal.numbers.map((n) => (
                  <div
                    key={n}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      n === 0
                        ? "number-green"
                        : [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(n)
                        ? "number-red"
                        : "number-black"
                    }`}
                  >
                    {n}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-text-secondary flex items-start gap-1">
                <Target className="w-3 h-3 mt-0.5 text-accent-cyan" />
                {signal.reason}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
