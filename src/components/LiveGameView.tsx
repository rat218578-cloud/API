// src/components/LiveGameView.tsx - VERSÃO COMPLETA COM RENOVAÇÃO
import { useState, useEffect, useRef } from 'react';
import { RefreshCw, X, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { gameLinkService, ROLETAS } from '../services/gameLinkService';

interface LiveGameViewProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  gameId?: string;
}

export function LiveGameView({ slug, isOpen, onClose, gameId }: LiveGameViewProps) {
  const [loading, setLoading] = useState(false);
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const loadAttempts = useRef(0);
  const lastGameId = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  const roleta = ROLETAS.find(r => 
    (gameId && r.gameId === gameId) || r.slug === slug
  );
  const cor = roleta?.cor || '#6C3CE1';
  const isFootball = slug.includes('football') || gameId?.startsWith('TopCard');

  const gerarUrlDireta = (gameId: string): string => {
    const lobbyId = crypto.randomUUID().replace(/-/g, '');
    return `https://sortenabet.evo-games.com/frontend/evo/r2/#category=all_games&game=topcard&table_id=${gameId}&lobby_launch_id=${lobbyId}`;
  };

  // ✅ LOAD GAME COM RENOVAÇÃO
  const loadGame = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Você precisa estar logado');
        setLoading(false);
        return;
      }

      let url = null;

      if (gameId && gameId.startsWith('TopCard')) {
        // ✅ FOOTBALL STUDIO - TENTA VIA API PRIMEIRO
        console.log('⚽ Football Studio - gerando token...');
        
        const response = await fetch(`/api/start-game-v2?slug=evolution/football-studio&_=${Date.now()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success && data.iframe_url) {
          url = data.iframe_url;
          console.log('✅ Token do Football Studio gerado via API!');
        } else {
          // FALLBACK: URL direta
          url = gerarUrlDireta(gameId);
          console.log('✅ Football Studio - URL direta gerada:', url);
        }
      } else {
        // ✅ ROLETA NORMAL
        url = await gameLinkService.getGameUrl(slug);
      }

      if (url) {
        console.log('✅ URL carregada com sucesso!');
        setGameUrl(url);
        setError(null);
        loadAttempts.current = 0;
        
        // ✅ INICIA RENOVAÇÃO AUTOMÁTICA
        startAutoRefresh();
      } else {
        setError('Não foi possível gerar o link. Tente novamente.');
      }
    } catch (err) {
      console.error('❌ Erro ao carregar jogo:', err);
      setError('Erro ao gerar link');
    } finally {
      setLoading(false);
    }
  };

  // ✅ RENOVAÇÃO AUTOMÁTICA
  const startAutoRefresh = () => {
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
    }

    // ✅ SÓ RENOVA SE FOR FOOTBALL STUDIO
    if (!isFootball) return;

    refreshInterval.current = setInterval(() => {
      console.log('🔄 Renovando token do Football Studio...');
      refreshFootballToken();
    }, 120000); // 2 minutos
  };

  // ✅ RENOVA TOKEN DO FOOTBALL STUDIO
  const refreshFootballToken = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`/api/start-game-v2?slug=evolution/football-studio&_=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success && data.iframe_url) {
        console.log('✅ Token do Football Studio renovado!');
        setGameUrl(data.iframe_url);
      } else {
        // Fallback: URL direta com novo lobby_launch_id
        const newUrl = gerarUrlDireta(gameId || 'TopCard000000001');
        setGameUrl(newUrl);
      }
    } catch (error) {
      console.error('❌ Erro ao renovar token do Football Studio:', error);
    }
  };

  // ✅ DETECTA EV.7
  const handleIframeError = () => {
    console.log('⚠️ Erro no iframe, verificando se é EV.7...');
    
    // Se for EV.7, renova
    if (error && error.includes('EV.7')) {
      console.log('🔑 EV.7 detectado! Renovando token...');
      handleRenewToken();
      return;
    }
    
    if (loadAttempts.current > 3) {
      setError('Erro ao carregar o jogo. Clique em "Novo token" para tentar novamente.');
      return;
    }
    
    loadAttempts.current++;
    setGameUrl(null);
    loadGame();
  };

  // ✅ RENOVA MANUALMENTE
  const handleRenewToken = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Você precisa estar logado');
        setLoading(false);
        return;
      }

      if (isFootball) {
        const response = await fetch(`/api/start-game-v2?slug=evolution/football-studio&_=${Date.now()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success && data.iframe_url) {
          console.log('✅ Novo token gerado!');
          setGameUrl(data.iframe_url);
          setError(null);
          loadAttempts.current = 0;
        } else {
          const newUrl = gerarUrlDireta(gameId || 'TopCard000000001');
          setGameUrl(newUrl);
          setError(null);
          loadAttempts.current = 0;
        }
      } else {
        await loadGame();
      }
    } catch (err) {
      setError('Erro ao renovar token');
    } finally {
      setLoading(false);
    }
  };

  // ✅ EFFECT PRINCIPAL
  useEffect(() => {
    if (isOpen && slug) {
      console.log('🎮 LiveGameView - slug:', slug, 'gameId:', gameId);
      
      if (lastGameId.current !== gameId) {
        console.log('🔄 GameId mudou, recarregando:', gameId);
        lastGameId.current = gameId || null;
        loadAttempts.current = 0;
        setGameUrl(null);
        loadGame();
      } else if (!gameUrl) {
        loadGame();
      }
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
        refreshInterval.current = null;
      }
    };
  }, [isOpen, slug, gameId]);

  // ... RESTO DO COMPONENTE (renderização)
}
