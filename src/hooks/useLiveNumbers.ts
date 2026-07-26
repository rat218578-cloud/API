import { useState, useEffect } from 'react';
import { gameLinkService } from '../services/gameLinkService';

interface LiveNumber {
  number: number;
  color: string;
  timestamp: string;
}

export function useLiveNumbers() {
  const [numbers, setNumbers] = useState<LiveNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveNumbers = async () => {
    try {
      const data = await gameLinkService.getLiveNumbers(500);
      if (data && data.success) {
        setNumbers(data.history || []);
        setConnected(data.connected || false);
        setError(null);
      }
    } catch (err) {
      setError('Erro ao buscar números ao vivo');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const status = await gameLinkService.getWebSocketStatus();
      if (status) {
        setConnected(status.connected || false);
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    }
  };

  useEffect(() => {
    fetchLiveNumbers();
    
    // Atualiza a cada 2 segundos
    const interval = setInterval(() => {
      fetchLiveNumbers();
      checkStatus();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    numbers,
    loading,
    connected,
    error,
    refresh: fetchLiveNumbers,
    lastNumber: numbers.length > 0 ? numbers[0] : null,
    lastTen: numbers.slice(0, 10),
    total: numbers.length
  };
}
