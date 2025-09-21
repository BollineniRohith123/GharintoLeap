import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '~backend/client';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  avatarUrl?: string;
  roles: string[];
  menus: Array<{
    name: string;
    displayName: string;
    icon?: string;
    path?: string;
    children?: Array<{
      name: string;
      displayName: string;
      path?: string;
    }>;
  }>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [user, setUser] = useState<User | null>(null);

  const authenticatedBackend = token 
    ? backend.with({ auth: () => ({ authorization: `Bearer ${token}` }) })
    : backend;

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authenticatedBackend.users.getProfile(),
    enabled: !!token,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  useEffect(() => {
    if (profile) {
      setUser(profile);
    } else if (error && token) {
      // Token is invalid, clear it
      logout();
    }
  }, [profile, error, token]);

  const login = async (email: string, password: string) => {
    const response = await backend.auth.login({ email, password });
    const newToken = response.token;
    
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
  };

  const register = async (userData: any) => {
    const response = await backend.auth.register(userData);
    const newToken = response.token;
    
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    // For now, return true since we don't have permissions in the user object
    // In a real implementation, you would check user.permissions
    return true;
  };

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isLoading,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
