// src/components/FootballStudioHistory.tsx
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface FootballStudioRound {
  horario: string;
  home: string;
  away: string;
  resultado: 'H' | 'A' | 'D';
  troca_de_baralho: boolean;
}

interface FootballStudioHistoryProps {
  history: FootballStudioRound[];
  totalNumbers: number;
  shoeChanges: any[];
}

export function FootballStudioHistory({ history, totalNumbers, shoeChanges }: FootballStudioHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  const [viewMode, setViewMode] = useState<'numero' | 'letra'>('letra'); // ✅ Número ou Letra
  
  // Filtra apenas rodadas válidas (ignora trocas de baralho)
  const validRounds = history.filter((item: any) => !item.troca_de_baralho);
  
  // Pega as últimas rodadas (100 ou todas)
  const displayRounds = showAll ? validRounds : validRounds.slice(0, 100);
  
  // Organiza em colunas de 10 (igual TÁBOLA BOLSA)
  const columns = [];
  for (let i = 0; i < displayRounds.length; i += 10) {
    columns.push(displayRounds.slice(i, i + 10));
  }

  // Formata o resultado em letra única (C/V/E)
  const getResultadoLetra = (resultado: string) => {
    if (resultado === 'H') return 'C';
    if (resultado === 'A') return 'V';
    if (resultado === 'D') return 'E';
    return '--';
  };

  // Obtém a cor do resultado
  const getResultadoColor = (resultado: string) => {
    if (resultado === 'H') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (resultado === 'A') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (resultado === 'D') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-bg-tertiary text-text-muted border-border-default';
  };

  // Extrai o número da carta (ex: K, Q, J, 10, 9, A)
  const getCardNumber = (card: string) => {
    if (!card) return '?';
    const num = card.slice(0, -1);
    // Mapeia para letras se for Naipe
    if (num === 'A') return 'A';
    if (num === 'K') return 'K';
    if (num === 'Q') return 'Q';
    if (num === 'J') return 'J';
    return num;
  };

  return (
    <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
      {/* Cabeçalho */}
      <div className="p-4 border-b border-border-default flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-text-primary">📊 Histórico de Resultados</h3>
          <span className="text-xs text-text-muted">
            ÚLTIMAS RODADAS • AMOSTRA {displayRounds.length} ENTRADAS
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {/* ✅ Botão Número / Letra */}
          <button
            onClick={() => setViewMode(viewMode === 'numero' ? 'letra' : 'numero')}
            className="px-3 py-1 rounded-lg bg-bg-tertiary border border-border-default hover:border-accent-pink transition-colors text-xs font-medium flex items-center gap-1"
          >
            {viewMode === 'numero' ? '🔢 Número' : '🔤 Letra'}
          </button>
          
          <span className="text-text-muted flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Atualizado a cada 2s
          </span>
          
          {shoeChanges.length > 0 && (
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              {shoeChanges.length} trocas
            </span>
          )}
          
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-2 py-1 rounded-lg bg-bg-tertiary border border-border-default text-xs hover:border-accent-pink transition-colors"
          >
            {showAll ? 'Ver menos' : 'Ver todas'}
          </button>
        </div>
      </div>

      {/* Histórico Horizontal */}
      <div className="p-4 overflow-x-auto">
        <div className="flex gap-6 min-w-max">
          {columns.map((column, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-1">
              {/* Cabeçalho da coluna */}
              <div className="text-[8px] text-text-muted text-center mb-1 font-mono">
                {colIndex === 0 ? 'CASA' : ''}
              </div>
              
              {/* Rodadas da coluna */}
              {column.map((round: any, rowIndex: number) => {
                const letra = getResultadoLetra(round.resultado);
                const color = getResultadoColor(round.resultado);
                
                // ✅ Define o que mostrar baseado no modo
                let displayText = '';
                if (viewMode === 'letra') {
                  displayText = letra; // C, V, E
                } else {
                  // Modo número: mostra o número da carta da casa
                  const cardNum = getCardNumber(round.home);
                  displayText = cardNum; // 5, K, A, 10, etc
                }
                
                return (
                  <div
                    key={rowIndex}
                    className={`flex items-center justify-center w-12 h-12 rounded-lg border text-xs font-bold transition-all ${color}`}
                    title={`${new Date(round.horario).toLocaleTimeString('pt-BR')} - ${round.home} vs ${round.away}`}
                  >
                    {displayText}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="p-3 border-t border-border-default flex items-center justify-between text-xs text-text-muted flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
            CASA
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
            VISITANTE
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
            EMPATE
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] bg-bg-tertiary px-2 py-0.5 rounded-full">
            {viewMode === 'numero' ? '🔢 Mostrando números' : '🔤 Mostrando letras (C/V/E)'}
          </span>
          <span>
            Total: {validRounds.length} rodadas
          </span>
        </div>
      </div>
    </div>
  );
}
