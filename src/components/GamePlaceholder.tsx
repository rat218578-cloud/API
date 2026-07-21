import { Construction, Sparkles } from "lucide-react";

interface GamePlaceholderProps {
  title: string;
  status: "beta" | "soon";
}

export function GamePlaceholder({ title, status }: GamePlaceholderProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-12 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/30 flex items-center justify-center mb-6 animate-pulse-glow">
        <Construction className="w-10 h-10 text-violet-400" />
      </div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">{title}</h2>
      <p className="text-text-muted max-w-md mb-6">
        Esta ferramenta está em desenvolvimento. Em breve você terá acesso à análise de padrões e geração de sinais com IA.
      </p>
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-card border border-border-default text-sm text-text-secondary">
        <Sparkles className="w-4 h-4 text-accent-pink" />
        {status === "beta" ? "Em fase de testes" : "Lançamento em breve"}
      </div>
    </div>
  );
}
