import { useState, useEffect, useRef } from 'react';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false
  });
  
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  // ✅ BUSCA USUÁRIO DO LOCALSTORAGE
  const getUserFromStorage = (): User | null => {
    try {
      const name = localStorage.getItem('user_name');
      const plan = localStorage.getItem('user_plan');
      const email = localStorage.getItem('user_email');
      const userId = localStorage.getItem('user_id');
      
      if (name && email) {
        return {
          id: userId || '1',
          name: name,
          email: email,
          plan: (plan as 'free' | 'pro' | 'enterprise') || 'pro'
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  // ✅ SALVA USUÁRIO NO LOCALSTORAGE
  const saveUserToStorage = (user: User) => {
    localStorage.setItem('user_name', user.name || 'Usuário');
    localStorage.setItem('user_plan', user.plan || 'pro');
    localStorage.setItem('user_email', user.email || '');
    localStorage.setItem('user_id', user.id || '');
  };

  // ✅ REFRESH TOKEN
  const refreshToken = async (): Promise<string | null> => {
    const refreshTokenStored = localStorage.getItem('refresh_token');
    if (!refreshTokenStored) return null;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshTokenStored })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        return data.access_token;
      }
      return null;
    } catch {
      return null;
    }
  };

  // ✅ VALIDA TOKEN
  const validateToken = async (): Promise<boolean> => {
    const accessToken = localStorage.getItem('access_token');
    
    if (!accessToken) {
      setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      return false;
    }

    try {
      const response = await fetch('/api/auth/validate', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const storedUser = getUserFromStorage();
        
        if (storedUser) {
          setState(prev => ({
            ...prev,
            user: storedUser,
            isAuthenticated: true,
            loading: false
          }));
          return true;
        }
        return false;
      }

      // ✅ SE O TOKEN EXPIRAR, TENTA RENOVAR
      const newToken = await refreshToken();
      if (newToken) {
        return await validateToken();
      }

      // ✅ SE NÃO CONSEGUIR RENOVAR, FAZ LOGOUT
      logout();
      return false;

    } catch {
      setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      return false;
    }
  };

  // ✅ LOGIN
  const login = async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setState(prev => ({ ...prev, error: data.error || 'Erro ao fazer login', loading: false }));
        return false;
      }

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      const user: User = {
        id: String(data.user.id),
        email: data.user.email,
        name: data.user.name,
        plan: data.user.plan || 'pro'
      };
      
      saveUserToStorage(user);
      
      setState(prev => ({
        ...prev,
        user: user,
        isAuthenticated: true,
        loading: false
      }));

      // ✅ INICIA O REFRESH AUTOMÁTICO
      startAutoRefresh();

      return true;

    } catch {
      setState(prev => ({ ...prev, error: 'Erro de conexão', loading: false }));
      return false;
    }
  };

  // ✅ LOGOUT
  const logout = async (): Promise<void> => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
      } catch {}
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_plan');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_id');
    
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    setState({
      user: null,
      loading: false,
      error: null,
      isAuthenticated: false
    });
  };

  // ✅ REFRESH AUTOMÁTICO (a cada 5 minutos)
  const startAutoRefresh = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setInterval(async () => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;

      try {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
          isRefreshingRef.current = false;
          return;
        }

        const response = await fetch('/api/auth/validate', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
          const newToken = await refreshToken();
          if (newToken) {
            console.log('✅ Token renovado automaticamente!');
          } else {
            console.log('❌ Falha ao renovar token, fazendo logout...');
            logout();
          }
        }
      } catch (error) {
        console.error('❌ Erro no refresh automático:', error);
      } finally {
        isRefreshingRef.current = false;
      }
    }, 5 * 60 * 1000);
  };

  // ✅ INICIALIZAÇÃO
  useEffect(() => {
    validateToken().then(() => {
      if (state.isAuthenticated) {
        startAutoRefresh();
      }
    });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    login,
    logout,
    validateToken,
    refreshToken
  };
}
