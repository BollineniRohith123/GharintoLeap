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
  const [token, setToken] = useState<string | null>(() => {
    // Initialize from localStorage
    return localStorage.getItem('auth_token');
  });
  const [user, setUser] = useState<User | null>(null);

  // Set token in API client when it changes
  useEffect(() => {
    if (token) {
      apiClient.setToken(token);
    }
  }, [token]);

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['profile', token], // Include token in query key to refetch when it changes
    queryFn: async () => {
      if (!token) return null;
      try {
        return await apiClient.getProfile();
      } catch (err) {
        console.error('Profile fetch error:', err);
        throw err;
      }
    },
    enabled: !!token, // Only fetch when we have a token
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // Cache for 1 hour (formerly cacheTime)
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors
      const status = (error as any)?.status || (error as any)?.response?.status;
      if (status === 401 || status === 403) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true, // Refetch when internet connection is restored
  });

  // Handle profile data and errors
  useEffect(() => {
    if (profile && token) {
      setUser(profile);
    } else if (error && token) {
      // Only logout on authentication errors
      const errorStatus = (error as any)?.status || (error as any)?.response?.status;
      if (errorStatus === 401 || errorStatus === 403) {
        console.log('Authentication failed, logging out');
        // Clear everything
        localStorage.removeItem('auth_token');
        apiClient.logout();
        setToken(null);
        setUser(null);
      } else {
        console.warn('Profile fetch error (keeping session):', error);
        // Keep the session active for network errors
      }
    } else if (!token) {
      // No token means no user
      setUser(null);
    }
  }, [profile, error, token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      const newToken = response.token;

      // Set token in localStorage first
      localStorage.setItem('auth_token', newToken);
      // Then update state - this will trigger profile fetch
      setToken(newToken);
      // User will be set when profile fetch completes
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await apiClient.register(userData);
      const newToken = response.token;

      localStorage.setItem('auth_token', newToken);
      setToken(newToken);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    // Clear everything in the correct order
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    apiClient.logout();
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
