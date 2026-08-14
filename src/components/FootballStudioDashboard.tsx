// src/components/FootballStudioDashboard.tsx
import { useState, useEffect } from 'react';
import { footballStudioService, FootballStudioRound, MESAS_FOOTBALL } from '../services/footballStudioService';
import { Loader2, Clock, Info } from 'lucide-react';
import { LiveGameView } from './LiveGameView';

export function FootballStudioDashboard() {
  const [history, setHistory] = useState<FootballStudioRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, draws: 0 });
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedMesa, setSelectedMesa] = useState(MESAS_FOOTBALL[0].id);
  const [showVideo, setShowVideo] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [signals, setSignals] = useState<any>(null);
  const [showCards, setShowCards] = useState(false);

  const mesaAtual = MESAS_FOOTBALL.find(m => m.id === selectedMesa) || MESAS_FOOTBALL[0];

  useEffect(() => {
    if (mesaAtual.temHistorico) {
      setLoading(true);
      const onUpdate = (newHistory: FootballStudioRound[]) => {
        setHistory(newHistory);
        setStats(footballStudioService.getStatistics());
        setLastUpdate(footballStudioService.getLastUpdate());
        setSignals(footballStudioService.getSignals());
        setLoading(false);
      };
      footballStudioService.startPolling(2000, onUpdate);
    } else {
      setHistory([]);
      setStats({ total: 0, wins: 0, losses: 0, draws: 0 });
      setSignals(null);
      setLoading(false);
    }
    return () => {
      footballStudioService.stopPolling();
    };
  }, [selectedMesa]);

  const openGame = (slug: string) => {
    setSelectedSlug(slug);
    setShowVideo(true);
  };

  const closeGame = () => {
    setShowVideo(false);
    setSelectedSlug(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent-pink mx-auto mb-4" />
          <p className="text-text-muted">Carregando Football Studio...</p>
        </div>
      </div>
    );
  }

  const lastTen = history.slice(-10).reverse();
  const temHistorico = mesaAtual.temHistorico && history.length > 0;

  const getCardInfo = (card: string) => {
    if (!card) return { number: '?', suit: '?' };
    const number = card.slice(0, -1);
    const suit = card.slice(-1);
    const suitEmoji: Record<string, string> = {
      '♥': '♥️', '♦': '♦️', '♠': '♠️', '♣': '♣️'
    };
    return { number, suit: suitEmoji[suit] || suit };
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-wrap">
        {MESAS_FOOTBALL.map((mesa) => (
          <button
            key={mesa.id}
            onClick={() => {
              setSelectedMesa(mesa.id);
              openGame(mesa.slug);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
              selectedMesa === mesa.id
                ? "bg-bg-tertiary border-accent-pink text-text-primary shadow-lg shadow-accent-pink/20"
                : "bg-bg-card border-border-default text-text-secondary hover:border-border-hover"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${selectedMesa === mesa.id ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted'}`} />
            {mesa.nome}
            {mesa.temHistorico && temHistorico && (
              <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">HIST</span>
            )}
            {!mesa.temHistorico && (
              <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">VIDEO</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className={`w-2 h-2 rounded-full ${temHistorico ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`} />
        <span className={temHistorico ? 'text-emerald-400' : 'text-yellow-400'}>
          {temHistorico ? '📡 Conectado' : mesaAtual.temHistorico ? '⏳ Aguardando dados...' : '🎥 Apenas vídeo'}
        </span>
        {temHistorico && (
          <span className="text-emerald-400">✅ {stats.total} rodadas</span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-3 space-y-4">
          {temHistorico ? (
            <>
              <div className="bg-bg-card border border-border-default rounded-2xl p-4">
                <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-3">📊 Estatisticas</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <div className="text-[10px] text-text-muted uppercase">Casa</div>
                    <div className="text-lg font-bold text-emerald-400">{stats.wins}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
                    <div className="text-[10px] text-text-muted uppercase">Empate</div>
                    <div className="text-lg font-bold text-yellow-400">{stats.draws}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <div className="text-[10px] text-text-muted uppercase">Visitante</div>
                    <div className="text-lg font-bold text-red-400">{stats.losses}</div>
                  </div>
                </div>
              </div>

              {signals && (
                <div className="bg-bg-card border border-border-default rounded-2xl p-4">
                  <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-3">🎯 Sinal de Entrada</h3>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-center mb-3">
                    <div className="text-xs text-text-muted">NOVO SINAL</div>
                    <div className="text-xl font-bold text-emerald-400">
                      {signals.predicao} — {signals.confianca}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">CASA</span>
                      <span className="font-bold text-emerald-400">{signals.probabilidades.casa}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${signals.probabilidades.casa}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">EMPATE</span>
                      <span className="font-bold text-yellow-400">{signals.probabilidades.empate}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                      <div className="h-full rounded-full bg-yellow-500" style={{ width: `${signals.probabilidades.empate}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">VISITANTE</span>
                      <span className="font-bold text-red-400">{signals.probabilidades.visitante}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${signals.probabilidades.visitante}%` }} />
                    </div>
                  </div>
                  {signals.streak.tamanho > 1 && (
                    <div className="mt-3 p-2 rounded-lg bg-bg-tertiary border border-border-default text-center">
                      <div className="text-[10px] text-text-muted">STREAK</div>
                      <div className="text-sm font-bold text-amber-400">
                        {signals.streak.tipo} • {signals.streak.tamanho}x
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setShowCards(!showCards)}
                className="w-full btn-primary py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                <Info className="w-4 h-4" />
                {showCards ? 'Ocultar Cartas' : 'Ver Cartas'}
              </button>
            </>
          ) : (
            <div className="bg-bg-card border border-border-default rounded-2xl p-4 text-center">
              <div className="text-4xl mb-2">🎥</div>
              <h3 className="font-bold text-text-primary text-sm">Apenas Vídeo</h3>
              <p className="text-xs text-text-muted">Esta mesa não tem histórico disponível</p>
            </div>
          )}
        </div>

        <div className="xl:col-span-6">
          {showVideo && selectedSlug ? (
            <LiveGameView
              slug={selectedSlug}
              isOpen={showVideo}
              onClose={closeGame}
            />
          ) : (
            <div className="bg-bg-card border border-border-default rounded-2xl p-8 flex flex-col items-center justify-center min-h-[500px]">
              <div className="text-6xl mb-4">⚽</div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Escolha uma mesa</h3>
              <p className="text-text-muted text-sm text-center max-w-md">
                Selecione uma mesa no topo para ver o jogo ao vivo
              </p>
            </div>
          )}
        </div>

        <div className="xl:col-span-3 space-y-4">
          {temHistorico ? (
            <div className="bg-bg-card border border-border-default rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">📋 Ultimas</h3>
                <span className="text-[10px] text-text-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {lastUpdate ? lastUpdate.toLocaleTimeString('pt-BR') : '--'}
                </span>
              </div>
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {lastTen.map((round, index) => {
                  const homeCard = getCardInfo(round.home);
                  const awayCard = getCardInfo(round.away);
                  const isWin = round.resultado === 'H';
                  const isLoss = round.resultado === 'A';
                  return (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-bg-tertiary/50 border border-border-default/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="font-bold text-emerald-400">{homeCard.number}{homeCard.suit}</span>
                          <span className="text-text-muted">vs</span>
                          <span className="font-bold text-red-400">{awayCard.number}{awayCard.suit}</span>
                        </div>
                        <div className="text-[8px] text-text-muted">
                          {new Date(round.horario).toLocaleTimeString('pt-BR')}
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isWin ? 'bg-emerald-500/20 text-emerald-400' :
                        isLoss ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {isWin ? 'C' : isLoss ? 'V' : 'E'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-bg-card border border-border-default rounded-2xl p-4 text-center">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-xs text-text-muted">Sem histórico disponível</p>
            </div>
          )}
        </div>
      </div>

      {temHistorico && (
        <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border-default flex justify-between items-center">
            <h3 className="font-bold text-text-primary">📊 Historico Completo</h3>
            <span className="text-xs text-text-muted flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Atualizado a cada 2s • {stats.total} rodadas
            </span>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-tertiary text-text-muted text-xs uppercase sticky top-0">
                <tr>
                  <th className="text-left p-3">Horario</th>
                  <th className="text-center p-3">Casa</th>
                  <th className="text-center p-3">Resultado</th>
                  <th className="text-center p-3">Visitante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {history.slice(0, 50).map((round, index) => {
                  const homeCard = getCardInfo(round.home);
                  const awayCard = getCardInfo(round.away);
                  return (
                    <tr key={index} className="hover:bg-bg-tertiary/50 transition-colors">
                      <td className="p-3 text-text-secondary text-xs">
                        {new Date(round.horario).toLocaleTimeString('pt-BR')}
                      </td>
                      <td className="p-3 text-center font-medium text-emerald-400">
                        {homeCard.number}{homeCard.suit}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          round.resultado === 'H' ? 'bg-emerald-500/20 text-emerald-400' :
                          round.resultado === 'A' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {round.resultado === 'H' ? 'CASA' : round.resultado === 'A' ? 'VISITANTE' : 'EMPATE'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-medium text-red-400">
                        {awayCard.number}{awayCard.suit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
