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
  shoeChanges: any[];
}

export function FootballStudioHistory({ history, shoeChanges }: FootballStudioHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  const [viewMode, setViewMode] = useState<'letras' | 'numeros'>('letras');
  
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

  // Extrai o número/valor da carta (ex: K, Q, J, 10, 9, A, 5, 3, 2)
  const getCardValue = (card: string) => {
    if (!card) return '?';
    const num = card.slice(0, -1);
    // Mantém o valor exato: A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2
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
          {/* ✅ Botões Letras / Números */}
          <div className="flex rounded-lg overflow-hidden border border-border-default">
            <button
              onClick={() => setViewMode('letras')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'letras' 
                  ? 'bg-accent-pink text-white' 
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              Letras
            </button>
            <button
              onClick={() => setViewMode('numeros')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === 'numeros' 
                  ? 'bg-accent-pink text-white' 
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              Números
            </button>
          </div>
          
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
              {/* Cabeçalho da coluna - apenas CASA na primeira */}
              <div className="text-[8px] text-text-muted text-center mb-1 font-mono">
                {colIndex === 0 ? 'CASA' : ''}
              </div>
              
              {/* Rodadas da coluna */}
              {column.map((round: any, rowIndex: number) => {
                const letra = getResultadoLetra(round.resultado);
                const color = getResultadoColor(round.resultado);
                
                // ✅ Define o que mostrar baseado no modo
                let displayText = '';
                if (viewMode === 'letras') {
                  displayText = letra; // C, V, E
                } else {
                  // Modo números: mostra o valor da carta da casa
                  const cardValue = getCardValue(round.home);
                  displayText = cardValue; // 5, K, A, 10, etc
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
            CASA (C)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
            VISITANTE (V)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
            EMPATE (E)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] bg-bg-tertiary px-2 py-0.5 rounded-full">
            {viewMode === 'letras' ? '🔤 Mostrando letras' : '🔢 Mostrando números'}
          </span>
          <span>
            Total: {validRounds.length} rodadas
          </span>
        </div>
      </div>
    </div>
  );
}
