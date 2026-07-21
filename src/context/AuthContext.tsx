import React, { createContext, useContext, useState, useEffect } from "react";
import { apiClient, rouletteApi } from "../services/api";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (loginValue: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  getGameLink: (slug: string) => Promise<string | null>;
  getAllGameLinks: () => Promise<Record<string, string | null>>;
  refreshRouletteData: (roomId: string, limit?: number) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = apiClient.getUserData();
        if (userData && apiClient.isAuthenticated()) {
          setUser({
            id: String(userData.id || '1'),
            email: userData.email || '',
            name: userData.name || 'Usuário',
            cpf: userData.cpf,
            plan: 'pro'
          });
          const token = localStorage.getItem('access_token');
          if (token) rouletteApi.setToken(token);
        }
      } catch (err) {
        console.error('Erro ao verificar autenticação:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (loginValue: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.login(loginValue, password);
      setUser({
        id: String(response.user.id),
        email: response.user.email,
        name: response.user.name,
        cpf: response.user.cpf,
        plan: 'pro'
      });
      const token = localStorage.getItem('access_token');
      if (token) rouletteApi.setToken(token);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
  };

  const getGameLink = async (slug: string) => {
    try { return await apiClient.getGameLink(slug); } 
    catch (error) { console.error('Erro ao obter link do jogo:', error); return null; }
  };

  const getAllGameLinks = async () => {
    try { return await apiClient.getAllGameLinks(); } 
    catch (error) { console.error('Erro ao obter links dos jogos:', error); return {}; }
  };

  const refreshRouletteData = async (roomId: string, limit: number = 50) => {
    try { return await rouletteApi.getLiveRouletteHistory(roomId, limit); } 
    catch (error) { console.error('Erro ao atualizar dados da roleta:', error); return { spins: [], total: 0, room: roomId }; }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, isAuthenticated: !!user && apiClient.isAuthenticated(), getGameLink, getAllGameLinks, refreshRouletteData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
