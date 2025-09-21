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
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check role permissions
  if (roles.length > 0 && !roles.some(role => user.roles.includes(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  // For now, skip permission checks since we don't have permissions in user object
  // In a real implementation, you would check permissions here

  return <>{children}</>;
}
