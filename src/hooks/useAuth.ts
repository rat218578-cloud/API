import { useState, useEffect } from 'react';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false
  });

  const refreshToken = async (refreshToken: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        return data.access_token;
      }
      return null;
    } catch {
      return null;
    }
  };

  const validateToken = async (): Promise<boolean> => {
    const accessToken = localStorage.getItem('access_token');
    const refreshTokenStored = localStorage.getItem('refresh_token');
    
    if (!accessToken) {
      setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      return false;
    }

    try {
      const response = await fetch('/api/auth/validate', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ 
          ...prev, 
          user: { 
            id: data.user_id, 
            email: data.email, 
            name: data.email?.split('@')[0] || 'Usuário', 
            plan: 'pro' as const 
          },
          isAuthenticated: true,
          loading: false 
        }));
        return true;
      }

      if (refreshTokenStored) {
        const newAccessToken = await refreshToken(refreshTokenStored);
        if (newAccessToken) {
          return await validateToken();
        }
      }

      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      return false;
    } catch {
      setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        setState(prev => ({ ...prev, error: (data as any).error || 'Erro ao fazer login', loading: false }));
        return false;
      }

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      setState(prev => ({
        ...prev,
        user: data.user,
        isAuthenticated: true,
        loading: false
      }));

      return true;
    } catch {
      setState(prev => ({ ...prev, error: 'Erro de conexão', loading: false }));
      return false;
    }
  };

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
    
    setState({
      user: null,
      loading: false,
      error: null,
      isAuthenticated: false
    });
  };

  useEffect(() => {
    validateToken();
  }, []);

  return {
    ...state,
    login,
    logout,
    validateToken,
    refreshToken
  };
}
