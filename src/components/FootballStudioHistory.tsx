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

  // Extrai o valor da carta
  const getCardValue = (card: string) => {
    if (!card) return '?';
    return card.slice(0, -1);
  };

  return (
    <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
      {/* Cabeçalho */}
      <div className="p-4 border-b border-border-default flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-text-primary text-lg">📊 Histórico de Resultados</h3>
          <span className="text-sm text-text-muted">
            ÚLTIMAS RODADAS • AMOSTRA {displayRounds.length} ENTRADAS
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm flex-wrap">
          {/* Botões Letras / Números - MAIORES */}
          <div className="flex rounded-lg overflow-hidden border border-border-default">
            <button
              onClick={() => setViewMode('letras')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'letras' 
                  ? 'bg-accent-pink text-white' 
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              Letras
            </button>
            <button
              onClick={() => setViewMode('numeros')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
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
            <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              {shoeChanges.length} trocas
            </span>
          )}
          
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-3 py-1 rounded-lg bg-bg-tertiary border border-border-default text-sm hover:border-accent-pink transition-colors"
          >
            {showAll ? 'Ver menos' : 'Ver todas'}
          </button>
        </div>
      </div>

      {/* Histórico Horizontal - MAIOR */}
      <div className="p-6 overflow-x-auto">
        <div className="flex gap-8 min-w-max">
          {columns.map((column, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-1.5">
              {/* Cabeçalho da coluna */}
              <div className="text-xs text-text-muted text-center mb-1 font-bold">
                {colIndex === 0 ? 'CASA' : ''}
              </div>
              
              {/* Rodadas da coluna - CÉLULAS MAIORES */}
              {column.map((round: any, rowIndex: number) => {
                const letra = getResultadoLetra(round.resultado);
                const color = getResultadoColor(round.resultado);
                
                let displayText = '';
                if (viewMode === 'letras') {
                  displayText = letra;
                } else {
                  const cardValue = getCardValue(round.home);
                  displayText = cardValue;
                }
                
                return (
                  <div
                    key={rowIndex}
                    className={`flex items-center justify-center w-14 h-14 rounded-xl border-2 text-base font-bold transition-all ${color}`}
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

      {/* Legenda - MAIOR */}
      <div className="p-4 border-t border-border-default flex items-center justify-between text-sm text-text-muted flex-wrap gap-3">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30" />
            CASA (C)
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-red-500/20 border-2 border-red-500/30" />
            VISITANTE (V)
          </span>
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-yellow-500/20 border-2 border-yellow-500/30" />
            EMPATE (E)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-bg-tertiary px-3 py-1 rounded-full">
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
