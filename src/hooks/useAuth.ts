import { useState, useEffect } from 'react';
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

  // 🔥 RESTAURA USUÁRIO DO LOCALSTORAGE
  const restoreUserFromStorage = (): User | null => {
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

  // 🔥 SALVA USUÁRIO NO LOCALSTORAGE
  const saveUserToStorage = (user: User) => {
    localStorage.setItem('user_name', user.name || 'Usuário');
    localStorage.setItem('user_plan', user.plan || 'pro');
    localStorage.setItem('user_email', user.email || '');
    localStorage.setItem('user_id', user.id || '');
  };

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
    
    // 🔥 RESTAURA DO STORAGE PRIMEIRO
    const storedUser = restoreUserFromStorage();
    if (storedUser && accessToken) {
      setState(prev => ({ 
        ...prev, 
        user: storedUser,
        isAuthenticated: true,
        loading: false 
      }));
    }

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
        const userName = data.name || storedUser?.name || localStorage.getItem('user_name') || 'Usuário';
        const userPlan = data.plan || storedUser?.plan || localStorage.getItem('user_plan') || 'pro';
        
        const user: User = {
          id: data.user_id || storedUser?.id || '1',
          email: data.email || storedUser?.email || '',
          name: userName,
          plan: userPlan as 'free' | 'pro' | 'enterprise'
        };
        
        saveUserToStorage(user);
        setState(prev => ({ 
          ...prev, 
          user: user,
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

      const data = await response.json();

      if (!response.ok) {
        setState(prev => ({ ...prev, error: data.error || 'Erro ao fazer login', loading: false }));
        return false;
      }

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      saveUserToStorage(data.user);
      
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
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_plan');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_id');
    
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
    refreshToken,
    saveUserToStorage,
    restoreUserFromStorage
  };
}
