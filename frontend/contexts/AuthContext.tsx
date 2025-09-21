import { createContext, useContext, useEffect, useState } from 'react';
import backend from '~backend/client';
import type { UserProfile } from '~backend/users/profile';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getStoredToken = () => localStorage.getItem('auth_token');

  const authenticatedBackend = () => {
    const token = getStoredToken();
    return backend; // For now, let's just use the basic backend
  };

  useEffect(() => {
    const loadUser = async () => {
      const token = getStoredToken();
      if (token) {
        try {
          const profile = await authenticatedBackend().users.getProfile();
          setUser(profile);
        } catch (error) {
          localStorage.removeItem('auth_token');
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await backend.auth.login({ email, password });
    localStorage.setItem('auth_token', response.token);
    
    // Get user profile
    const profile = await authenticatedBackend().users.getProfile();
    setUser(profile);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      isAuthenticated: !!user
    }}>
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

export function useBackend() {
  return backend; // For now, let's just use the basic backend
}
