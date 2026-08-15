// src/components/FootballStudioDashboard.tsx
import { useState, useEffect, useMemo } from 'react';
import { footballStudioService, ROLETAS_FOOTBALL } from '../services/footballStudioService';
import { LiveGameView } from './LiveGameView';
import { Loader2, ChevronDown, ChevronUp, Sparkles, Brain } from 'lucide-react';

export function FootballStudioDashboard() {
  const [activeRoom, setActiveRoom] = useState(ROLETAS_FOOTBALL[0].id);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showCatalog, setShowCatalog] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [totalNumbers, setTotalNumbers] = useState(0);
  const [signals, setSignals] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, draws: 0 });

  useEffect(() => {
    setLoading(true);
    const onUpdate = (newHistory: any[]) => {
      console.log('📊 Atualizando dashboard com', newHistory.length, 'registros');
      setHistory(newHistory);
      setStats(footballStudioService.getStatistics());
      setSignals(footballStudioService.getSignals());
      setIsConnected(footballStudioService.isConnected());
      setTotalNumbers(newHistory.length);
      setLoading(false);
    };

    footballStudioService.startPolling(2000, onUpdate);

    return () => {
      footballStudioService.stopPolling();
    };
  }, []);

  const openGame = (slug: string) => {
    setSelectedSlug(slug);
    setShowVideo(true);
  };

  const closeGame = () => {
    setShowVideo(false);
    setSelectedSlug(null);
  };

  const getCardInfo = (card: string) => {
    if (!card) return { number: '?', suit: '?', color: 'text-text-muted' };
    const number = card.slice(0, -1);
    const suit = card.slice(-1);
    const suitEmoji: Record<string, string> = { '♥': '♥️', '♦': '♦️', '♠': '♠️', '♣': '♣️' };
    const suitColors: Record<string, string> = {
      '♥': 'text-red-400',
      '♦': 'text-red-400',
      '♠': 'text-text-primary',
      '♣': 'text-text-primary'
    };
    return { number, suit: suitEmoji[suit] || suit, color: suitColors[suit] || 'text-text-primary' };
  };

  const topCards = useMemo(() => {
    if (!history || history.length === 0) return [];
    const counts: Record<string, number> = {};
    history.forEach((item: any) => {
      const cards = [item.home, item.away];
      cards.forEach((card: string) => {
        if (card) counts[card] = (counts[card] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([card, count]) => ({ card, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [history]);

  const getLastThree = () => {
    if (!history || history.length === 0) return ['--', '--', '--'];
    return history.slice(0, 3).map((item: any) =>
      item.resultado === 'H' ? 'C' : item.resultado === 'A' ? 'V' : 'E'
    );
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

  const lastThree = getLastThree();
  const isRealData = history.length > 0;

  return (
    <div className="p-4 space-y-4">
      {/* Status */}
      <div className="flex items-center gap-2 text-xs">
        <span className={`w-2 h-2 rounded-full ${isConnected && isRealData ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`} />
        <span className={isConnected && isRealData ? 'text-emerald-400' : 'text-yellow-400'}>
          {isConnected && isRealData
            ? `📡 Conectado (${totalNumbers} rodadas)`
            : isConnected ? '⏳ Aguardando dados...' : '🔌 Falha na conexão'}
        </span>
        {isRealData && <span className="text-emerald-400">✅ Dados REAIS</span>}
      </div>

      {/* Menu de Mesas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-wrap">
        {ROLETAS_FOOTBALL.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setActiveRoom(r.id);
              openGame(r.slug);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
              activeRoom === r.id
                ? "bg-bg-tertiary border-accent-pink text-text-primary shadow-lg shadow-accent-pink/20"
                : "bg-bg-card border-border-default text-text-secondary hover:border-border-hover"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeRoom === r.id ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted'}`} />
            {r.nome}
            {isRealData && activeRoom === r.id && (
              <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">REAL</span>
            )}
          </button>
        ))}
      </div>

      {/* Grid Principal (Catálogo + Vídeo + Grupos) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Catálogo com Cartas */}
        <div className={`xl:col-span-2 transition-all duration-300 ${showCatalog ? 'block' : 'hidden xl:block'}`}>
          <div className="bg-bg-card border border-border-default rounded-2xl p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">📊 Catálogo {isRealData ? '🔴' : '⏳'}</h3>
              <button onClick={() => setShowCatalog(!showCatalog)} className="xl:hidden p-1 rounded-lg hover:bg-bg-tertiary">
                {showCatalog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              <div className="grid grid-cols-3 text-[8px] text-text-muted uppercase py-1 border-b border-border-default text-center">
                <span>Carta</span><span>Total</span><span>%</span>
              </div>
              {topCards.length > 0 ? (
                topCards.map((item) => {
                  const cardInfo = getCardInfo(item.card);
                  return (
                    <div key={item.card} className="grid grid-cols-3 items-center py-1 text-[10px] border-b border-border-default/30 text-center">
                      <span className={`font-bold ${cardInfo.color}`}>{cardInfo.number}{cardInfo.suit}</span>
                      <span className="text-text-secondary">{item.count}</span>
                      <span className="text-text-secondary">{((item.count / (totalNumbers * 2)) * 100).toFixed(1)}%</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-text-muted text-xs">⏳ Aguardando cartas...</div>
              )}
            </div>
          </div>
        </div>

        {/* Vídeo */}
        <div className="xl:col-span-7">
          {showVideo && selectedSlug ? (
            <LiveGameView slug={selectedSlug} isOpen={showVideo} onClose={closeGame} />
          ) : (
            <div className="bg-bg-card border border-border-default rounded-2xl p-8 flex flex-col items-center justify-center min-h-[500px]">
              <div className="text-6xl mb-4">⚽</div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Escolha uma mesa</h3>
              <p className="text-text-muted text-sm text-center max-w-md">Selecione uma mesa no topo para ver o jogo ao vivo</p>
            </div>
          )}
        </div>

        {/* Grupos e Assertividade */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-bg-card border border-border-default rounded-2xl p-4">
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-3">📈 Grupos</h3>
            <div className="text-[10px] text-text-muted uppercase mb-2">Sequência atual</div>
            <div className="p-3 rounded-xl bg-gradient-to-r from-bg-tertiary to-bg-secondary border border-border-default text-center mb-3">
              <div className="text-xs font-bold text-text-primary">
                {isRealData && history.length > 0 ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      history[0]?.resultado === 'H' ? 'bg-emerald-500/20 text-emerald-400' :
                      history[0]?.resultado === 'A' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {history[0]?.resultado === 'H' ? 'CASA' : history[0]?.resultado === 'A' ? 'VISITANTE' : 'EMPATE'}
                    </span>
                    <span className="text-[8px] text-emerald-400">● REAL</span>
                  </span>
                ) : (
                  <span className="text-yellow-400">⏳ Aguardando...</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 text-center">
              {lastThree.map((num, idx) => (
                <div key={idx} className="text-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    num !== '--' ? (
                      num === 'C' ? 'bg-emerald-500/20 text-emerald-400' :
                      num === 'V' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    ) : 'bg-bg-tertiary text-text-muted'
                  }`}>{num}</div>
                  <div className="text-[8px] text-text-muted mt-0.5">{idx === 0 ? 'Último' : idx === 1 ? 'Penúlt' : 'Antep'}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 rounded-lg bg-bg-tertiary border border-border-default text-center">
              <div className="text-[10px] text-text-muted">Tendência</div>
              <div className="text-sm font-bold text-emerald-400">{isRealData ? '⬆ Forte' : '⏳ Aguardando...'}</div>
            </div>
          </div>

          <div className="bg-bg-card border border-border-default rounded-2xl p-4">
            <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-3">🎯 Assertividade</h3>
            <div className="space-y-3">
              {[
                { id: 'casa', name: 'CASA', value: stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0, color: '#10b981' },
                { id: 'empate', name: 'EMPATE', value: stats.total > 0 ? ((stats.draws / stats.total) * 100).toFixed(1) : 0, color: '#f59e0b' },
                { id: 'visitante', name: 'VISITANTE', value: stats.total > 0 ? ((stats.losses / stats.total) * 100).toFixed(1) : 0, color: '#ef4444' }
              ].map((s) => (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-text-secondary">{s.name}</span>
                    <span className="font-bold" style={{ color: s.color }}>{isRealData ? s.value : '--'}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: isRealData ? `${s.value}%` : '0%', backgroundColor: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* IA de Sinais */}
      <div className="bg-bg-card border border-border-default rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center animate-pulse-glow">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-sm">IA de Sinais</h3>
              <p className="text-[10px] text-text-muted">Geração inteligente de entradas</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (signals) {
                alert(`🎯 Sinal: ${signals.predicao}\nConfiança: ${signals.confianca}%\nStreak: ${signals.streak.tipo} ${signals.streak.tamanho}x`);
              }
            }}
            disabled={!isRealData}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3" />
            {signals ? 'Ver Sinal' : 'Aguardando dados'}
          </button>
        </div>
        {signals && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-bg-tertiary border border-border-default text-center">
              <div className="text-[10px] text-text-muted">CASA</div>
              <div className="text-lg font-bold text-emerald-400">{signals.probabilidades.casa}%</div>
            </div>
            <div className="p-3 rounded-xl bg-bg-tertiary border border-border-default text-center">
              <div className="text-[10px] text-text-muted">EMPATE</div>
              <div className="text-lg font-bold text-yellow-400">{signals.probabilidades.empate}%</div>
            </div>
            <div className="p-3 rounded-xl bg-bg-tertiary border border-border-default text-center">
              <div className="text-[10px] text-text-muted">VISITANTE</div>
              <div className="text-lg font-bold text-red-400">{signals.probabilidades.visitante}%</div>
            </div>
          </div>
        )}
      </div>

      {/* Histórico Completo */}
      <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border-default flex justify-between items-center">
          <h3 className="font-bold text-text-primary">📊 Histórico Completo</h3>
          <span className="text-xs text-text-muted flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Atualizado a cada 2s • {totalNumbers} rodadas
          </span>
        </div>
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-tertiary text-text-muted text-xs uppercase sticky top-0">
              <tr><th className="text-left p-3">Horário</th><th className="text-center p-3">Casa</th><th className="text-center p-3">Resultado</th><th className="text-center p-3">Visitante</th></tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {history.slice(0, 50).map((round: any, index: number) => {
                const homeCard = getCardInfo(round.home);
                const awayCard = getCardInfo(round.away);
                return (
                  <tr key={index} className="hover:bg-bg-tertiary/50 transition-colors">
                    <td className="p-3 text-text-secondary text-xs">{new Date(round.horario).toLocaleTimeString('pt-BR')}</td>
                    <td className="p-3 text-center font-medium"><span className={homeCard.color}>{homeCard.number}{homeCard.suit}</span></td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        round.resultado === 'H' ? 'bg-emerald-500/20 text-emerald-400' :
                        round.resultado === 'A' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {round.resultado === 'H' ? 'CASA' : round.resultado === 'A' ? 'VISITANTE' : 'EMPATE'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-medium"><span className={awayCard.color}>{awayCard.number}{awayCard.suit}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
