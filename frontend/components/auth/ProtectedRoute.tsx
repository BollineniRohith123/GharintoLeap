import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  permissions?: string[];
  roles?: string[];
}

export function ProtectedRoute({ children, permissions = [], roles = [] }: ProtectedRouteProps) {
  const { user, token, isLoading, hasPermission, hasRole } = useAuth();

  // Show loading while fetching user profile
  if (isLoading || (token && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if no token
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to login if token exists but user fetch failed
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role requirements
  if (roles.length > 0 && !roles.some(role => hasRole(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check permission requirements
  if (permissions.length > 0 && !permissions.some(permission => hasPermission(permission))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
