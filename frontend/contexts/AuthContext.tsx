import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient, { ApiError } from '../lib/api-client';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  avatarUrl?: string;
  roles: string[];
  permissions: string[];
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

  // Set token in API client when it changes
  useEffect(() => {
    apiClient.setToken(token);
  }, [token]);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.getProfile(),
    enabled: !!token,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: false, // Don't retry on error - just fail immediately
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  useEffect(() => {
    if (profile) {
      setUser(profile);
    } else if (error && token) {
      // Only logout on 401 Unauthorized errors (invalid/expired token)
      // Don't logout on network errors or other temporary issues
      if (error instanceof ApiError && error.status === 401) {
        console.log('Token is invalid or expired, logging out');
        logout();
      } else {
        console.warn('Profile fetch error (not logging out):', error);
      }
    }
  }, [profile, error, token]);

  const login = async (email: string, password: string) => {
    const response = await apiClient.login(email, password);
    const newToken = response.token;
    
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
  };

  const register = async (userData: any) => {
    const response = await apiClient.register(userData);
    const newToken = response.token;
    
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    apiClient.logout();
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    // Check if user has the permission
    return user?.permissions?.includes(permission) || false;
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

// Alias for consistency
export const useAuthContext = useAuth;
