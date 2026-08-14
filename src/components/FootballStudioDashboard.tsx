// src/components/FootballStudioDashboard.tsx
import { useState, useEffect } from 'react';
import { footballStudioService, FootballStudioRound } from '../services/footballStudioService';
import { Loader2, Clock } from 'lucide-react';

export function FootballStudioDashboard() {
  const [history, setHistory] = useState<FootballStudioRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, draws: 0 });
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    setLoading(true);
    const onUpdate = (newHistory: FootballStudioRound[]) => {
      setHistory(newHistory);
      setStats(footballStudioService.getStatistics());
      setLastUpdate(footballStudioService.getLastUpdate());
      setLoading(false);
    };

    footballStudioService.startPolling(2000, onUpdate);

    return () => {
      footballStudioService.stopPolling();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent-pink mx-auto mb-4" />
          <p className="text-text-muted">Carregando dados do Football Studio...</p>
        </div>
      </div>
    );
  }

  const lastTen = history.slice(-10).reverse();

  return (
    <div className="p-4 space-y-4">
      <div className="bg-bg-card border border-border-default rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary">Football Studio - Ao Vivo</h2>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Clock className="w-3 h-3" />
            <span>Atualizado: {lastUpdate ? lastUpdate.toLocaleTimeString('pt-BR') : '--'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-bg-tertiary border border-border-default text-center">
            <div className="text-xs text-text-muted uppercase">Total de Rodadas</div>
            <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="text-xs text-text-muted uppercase">Home (H)</div>
            <div className="text-2xl font-bold text-emerald-400">{stats.wins}</div>
          </div>
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
            <div className="text-xs text-text-muted uppercase">Away (A)</div>
            <div className="text-2xl font-bold text-red-400">{stats.losses}</div>
          </div>
          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
            <div className="text-xs text-text-muted uppercase">Empate (D)</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.draws}</div>
          </div>
        </div>
      </div>

      <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border-default flex justify-between items-center">
          <h3 className="font-bold text-text-primary">Ultimas Rodadas</h3>
          <span className="text-xs text-text-muted flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Atualizado a cada 2s
          </span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-tertiary text-text-muted text-xs uppercase sticky top-0">
              <tr>
                <th className="text-left p-3">Horario</th>
                <th className="text-center p-3">Home</th>
                <th className="text-center p-3">Resultado</th>
                <th className="text-center p-3">Away</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {lastTen.map((round, index) => (
                <tr key={index} className="hover:bg-bg-tertiary/50 transition-colors">
                  <td className="p-3 text-text-secondary text-xs">
                    {new Date(round.horario).toLocaleTimeString('pt-BR')}
                  </td>
                  <td className="p-3 text-center font-medium text-text-primary">
                    {round.home}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-bold
                      ${round.resultado === 'H' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                      ${round.resultado === 'A' ? 'bg-red-500/20 text-red-400' : ''}
                      ${round.resultado === 'D' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                    `}>
                      {round.resultado === 'H' ? 'HOME' : round.resultado === 'A' ? 'AWAY' : 'EMPATE'}
                    </span>
                  </td>
                  <td className="p-3 text-center font-medium text-text-primary">
                    {round.away}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
