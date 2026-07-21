import { useState } from "react";
import { Sparkles } from "lucide-react";
import "./index.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border-default rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          QA<span className="text-accent-pink">.ai</span>
        </h1>
        <p className="text-text-muted mb-6">
          Sistema rodando corretamente! 🎉
        </p>
        <button
          onClick={() => setCount(count + 1)}
          className="btn-primary px-6 py-3 rounded-xl text-sm font-bold"
        >
          Cliques: {count}
        </button>
        <p className="text-xs text-text-muted mt-4">
          Versão de teste - {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default App;
