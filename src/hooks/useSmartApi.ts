import { useState, useEffect, useRef } from 'react';

interface SmartNumber {
  signalId: string;
  signal: string;
  timestamp: string;
}

interface SmartApiResponse {
  full: boolean;
  data: SmartNumber[];
}

export function useSmartApi(email: string) {
  const [numbers, setNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [total, setTotal] = useState(0);
  const [lastSignalId, setLastSignalId] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  const API_URL = 'https://tool-api.smartanalise.com.br/api/history-delta';

  const fetchNumbers = async (since: string | null = null): Promise<number[]> => {
    try {
      let url = `${API_URL}?source=immersivevip&userEmail=${encodeURIComponent(email)}`;
      if (since) {
        url += `&since=${encodeURIComponent(since)}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('❌ Erro na API:', response.status);
        return [];
      }

      const data: SmartApiResponse = await response.json();

      if (data.data && data.data.length > 0) {
        // Inverte para ordem cronológica
        const items = [...data.data].reverse();
        const numbersList = items.map(item => parseInt(item.signal));
        const validNumbers = numbersList.filter(n => !isNaN(n) && n >= 0 && n <= 36);

        if (items.length > 0) {
          setLastSignalId(items[items.length - 1].signalId);
        }

        return validNumbers;
      }

      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar números:', error);
      return [];
    }
  };

  const loadHistory = async () => {
    if (!isMounted.current) return;
    
    setLoading(true);
    try {
      const numbersList = await fetchNumbers();
      
      if (numbersList.length > 0 && isMounted.current) {
        setNumbers(numbersList);
        setConnected(true);
        setTotal(numbersList.length);
        console.log(`✅ Carregados ${numbersList.length} números da Smart API`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  const startPolling = () => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(async () => {
      try {
        const numbersList = await fetchNumbers(lastSignalId);
        
        if (numbersList.length > 0 && isMounted.current) {
          setNumbers(prev => {
            const novos = numbersList.filter(n => !prev.includes(n));
            if (novos.length > 0) {
              console.log(`📊 +${novos.length} novos números`);
              setTotal(prevTotal => prevTotal + novos.length);
              setConnected(true);
              return [...novos, ...prev].slice(0, 500);
            }
            return prev;
          });
        }
      } catch (error) {
        // Ignora
      }
    }, 3000);
  };

  useEffect(() => {
    isMounted.current = true;
    
    if (email) {
      loadHistory().then(() => {
        startPolling();
      });
    }

    return () => {
      isMounted.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [email]);

  const getLastThree = (): (number | string)[] => {
    if (numbers.length === 0) return ['--', '--', '--'];
    return numbers.slice(0, 3);
  };

  const getTopNumbers = (): { number: number; count: number }[] => {
    if (numbers.length === 0) return [];
    
    const counts: Record<number, number> = {};
    numbers.forEach((n) => {
      counts[n] = (counts[n] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([n, count]) => ({ number: Number(n), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  const getStatistics = () => {
    if (numbers.length === 0) return null;
    
    const red = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    let redCount = 0, blackCount = 0, greenCount = 0;
    
    numbers.forEach(n => {
      if (n === 0) greenCount++;
      else if (red.includes(n)) redCount++;
      else blackCount++;
    });
    
    return {
      total: numbers.length,
      red: redCount,
      black: blackCount,
      green: greenCount
    };
  };

  return {
    numbers,
    loading,
    connected,
    total,
    getLastThree,
    getTopNumbers,
    getStatistics,
    refresh: loadHistory
  };
}
