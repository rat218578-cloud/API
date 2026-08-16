// src/components/FootballStudioDashboard.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { footballStudioService, ROLETAS_FOOTBALL } from '../services/footballStudioService';
import { LiveGameView } from './LiveGameView';
import { ShoeCatalog } from './ShoeCatalog';
import { Strategies } from './Strategies';

export function FootballStudioDashboard() {
  const [activeRoom, setActiveRoom] = useState(ROLETAS_FOOTBALL[0].id);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [totalNumbers, setTotalNumbers] = useState(0);
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, draws: 0 });
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [shoeChanges, setShoeChanges] = useState<any[]>([]);
  
  const isMounted = useRef(true);
  const isFirstLoad = useRef(true);

  const mesaAtual = ROLETAS_FOOTBALL.find(m => m.id === activeRoom) || ROLETAS_FOOTBALL[0];
  const temHistorico = mesaAtual.temHistorico || false;

  // Abre o vídeo automaticamente na primeira mesa
  useEffect(() => {
    if (isFirstLoad.current && !showVideo) {
      isFirstLoad.current = false;
      const primeiraMesa = ROLETAS_FOOTBALL[0];
      setSelectedSlug(primeiraMesa.slug);
      setShowVideo(true);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    
    const onUpdate = (newHistory: any[]) => {
      if (!isMounted.current) return;
      
      const changes = newHistory.filter((item: any) => item.troca_de_baralho === true);
      setShoeChanges(changes);
      
      setHistory(newHistory);
      setStats(footballStudioService.getStatistics());
      setIsConnected(footballStudioService.isConnected());
      setTotalNumbers(newHistory.length);
      setLastUpdate(footballStudioService.getLastUpdate());
    };

    if (temHistorico) {
      footballStudioService.startPolling(2000, onUpdate);
    } else {
      setHistory([]);
      setStats({ total: 0, wins: 0, losses: 0, draws: 0 });
      setIsConnected(false);
      setTotalNumbers(0);
      setShoeChanges([]);
    }

    return () => {
      isMounted.current = false;
      footballStudioService.stopPolling();
    };
  }, [activeRoom, temHistorico]);

  const openGame = (slug: string, gameId: string) => {
    console.log('🎮 Abrindo jogo:', slug, 'gameId:', gameId);
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

  const getResultadoDisplay = (resultado: string) => {
    if (resultado === 'H') return 'CASA';
    if (resultado === 'A') return 'VISITANTE';
    if (resultado === 'D') return 'EMPATE';
    return '--';
  };

  const getResultadoColor = (resultado: string) => {
    if (resultado === 'H') return 'bg-emerald-500/20 text-emerald-400';
    if (resultado === 'A') return 'bg-red-500/20 text-red-400';
    if (resultado === 'D') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-bg-tertiary text-text-muted';
  };

  const getLastThree = () => {
    if (!history || history.length === 0 || !temHistorico) return ['--', '--', '--'];
    const recentes = history.filter((item: any) => !item.troca_de_baralho).slice(0, 3);
    return recentes.map((item: any) => {
      if (item.resultado === 'H') return 'C';
      if (item.resultado === 'A') return 'V';
      if (item.resultado === 'D') return 'E';
      return '--';
    });
  };

  const getLastResult = () => {
    if (!history || history.length === 0 || !temHistorico) return 'Aguardando...';
    const last = history.find((item: any) => !item.troca_de_baralho);
    if (!last) return 'Aguardando...';
    return getResultadoDisplay(last.resultado);
  };

  const lastThree = getLastThree();
  const lastResult = getLastResult();
  const isRealData = history.length > 0 && temHistorico;

  return (
    <div className="p-4 space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${isConnected && isRealData ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`} />
          <span className={isConnected && isRealData ? 'text-emerald-400' : 'text-yellow-400'}>
            {isConnected && isRealData
              ? `📡 Conectado (${totalNumbers} rodadas)`
              : temHistorico ? '⏳ Aguardando dados...' : '🎥 Apenas vídeo'}
          </span>
          {isRealData && <span className="text-emerald-400">✅ Dados REAIS</span>}
          {lastUpdate && isRealData && (
            <span className="text-[10px] text-text-muted">
              ⏱ {lastUpdate.toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {/* Menu de Mesas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-wrap">
        {ROLETAS_FOOTBALL.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setActiveRoom(r.id);
              openGame(r.slug, r.gameId);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
              activeRoom === r.id
                ? "bg-bg-tertiary border-accent-pink text-text-primary shadow-lg shadow-accent-pink/20"
                : "bg-bg-card border-border-default text-text-secondary hover:border-border-hover"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeRoom === r.id ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted'}`} />
            {r.nome}
            {r.temHistorico && isRealData && activeRoom === r.id && (
              <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">HIST</span>
            )}
            {!r.temHistorico && (
              <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">VIDEO</span>
            )}
          </button>
        ))}
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* COLUNA ESQUERDA - ShoeCatalog + Strategies */}
        <div className="xl:col-span-3 space-y-4">
          {/* ShoeCatalog (já inclui o Catálogo) */}
          {isRealData && <ShoeCatalog history={history} />}

          {/* Estratégias G1/G2 */}
          {isRealData && <Strategies history={history} />}
        </div>

        {/* COLUNA CENTRAL - Vídeo */}
        <div className="xl:col-span-6">
          {showVideo && selectedSlug ? (
            <LiveGameView
              key={selectedSlug + activeRoom + mesaAtual.gameId}
              slug={selectedSlug}
              isOpen={showVideo}
              onClose={closeGame}
              gameId={mesaAtual.gameId}
            />
          ) : (
            <div className="bg-bg-card border border-border-default rounded-2xl p-8 flex flex-col items-center justify-center min-h-[500px]">
              <div className="text-6xl mb-4">⚽</div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Escolha uma mesa</h3>
              <p className="text-text-muted text-sm text-center max-w-md">Selecione uma mesa no topo para ver o jogo ao vivo</p>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA - Grupos + Assertividade */}
        <div className="xl:col-span-3 space-y-4">
          {isRealData ? (
            <>
              <div className="bg-bg-card border border-border-default rounded-2xl p-4">
                <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-3">📈 Grupos</h3>
                <div className="text-[10px] text-text-muted uppercase mb-2">Sequência atual</div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-bg-tertiary to-bg-secondary border border-border-default text-center mb-3">
                  <div className="text-xs font-bold text-text-primary">
                    <span className="flex items-center justify-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getResultadoColor(history.find((h: any) => !h.troca_de_baralho)?.resultado || '')}`}>
                        {lastResult}
                      </span>
                      <span className="text-[8px] text-emerald-400">● REAL</span>
                    </span>
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
                  <div className="text-sm font-bold text-emerald-400">⬆ Forte</div>
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
                        <span className="font-bold" style={{ color: s.color }}>{s.value}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.value}%`, backgroundColor: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-bg-card border border-border-default rounded-2xl p-4 text-center">
              <div className="text-4xl mb-2">🎥</div>
              <h3 className="font-bold text-text-primary text-sm">Apenas Vídeo</h3>
              <p className="text-xs text-text-muted">Esta mesa não tem histórico</p>
            </div>
          )}
        </div>
      </div>

      {/* Histórico Vertical */}
      {isRealData && (
        <div className="bg-bg-card border border-border-default rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border-default flex justify-between items-center">
            <h3 className="font-bold text-text-primary">📊 Histórico Completo</h3>
            <span className="text-xs text-text-muted flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Atualizado a cada 2s • {totalNumbers} rodadas
              {shoeChanges.length > 0 && (
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                  🔄 {shoeChanges.length} trocas
                </span>
              )}
            </span>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-tertiary text-text-muted text-xs uppercase sticky top-0">
                <tr>
                  <th className="text-left p-3">Horário</th>
                  <th className="text-center p-3">Casa</th>
                  <th className="text-center p-3">Resultado</th>
                  <th className="text-center p-3">Visitante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {history.slice(0, 100).map((round: any, index: number) => {
                  if (round.troca_de_baralho) {
                    return (
                      <tr key={index} className="bg-blue-500/5">
                        <td colSpan={4} className="p-3 text-center text-blue-400">
                          <span className="flex items-center justify-center gap-2">
                            <span className="text-xs">🔄</span>
                            <span className="font-bold">TROCA DE BARALHO</span>
                            <span className="text-[10px] text-text-muted">
                              {new Date(round.horario).toLocaleTimeString('pt-BR')}
                            </span>
                          </span>
                        </td>
                      </tr>
                    );
                  }

                  const homeCard = getCardInfo(round.home);
                  const awayCard = getCardInfo(round.away);

                  return (
                    <tr key={index} className="hover:bg-bg-tertiary/50 transition-colors">
                      <td className="p-3 text-text-secondary text-xs">
                        {new Date(round.horario).toLocaleTimeString('pt-BR')}
                      </td>
                      <td className="p-3 text-center font-medium">
                        <span className={homeCard.color}>{homeCard.number}{homeCard.suit}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getResultadoColor(round.resultado)}`}>
                          {getResultadoDisplay(round.resultado)}
                        </span>
                      </td>
                      <td className="p-3 text-center font-medium">
                        <span className={awayCard.color}>{awayCard.number}{awayCard.suit}</span>
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
