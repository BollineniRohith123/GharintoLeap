import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Public pages
import HomePage from './pages/public/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Dashboard layouts
import DashboardLayout from './components/layout/DashboardLayout';

// Portal pages
import SuperAdminDashboard from './pages/portals/SuperAdminDashboard';
import AdminDashboard from './pages/portals/AdminDashboard';
import ProjectManagerDashboard from './pages/portals/ProjectManagerDashboard';
import InteriorDesignerDashboard from './pages/portals/InteriorDesignerDashboard';
import CustomerDashboard from './pages/portals/CustomerDashboard';
import VendorDashboard from './pages/portals/VendorDashboard';

// Feature pages
import UsersPage from './pages/users/UsersPage';
import LeadsPage from './pages/leads/LeadsPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import MaterialsPage from './pages/materials/MaterialsPage';
import FinancePage from './pages/finance/FinancePage';
import SettingsPage from './pages/settings/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AppInner() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected dashboard routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <RoleDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Feature pages */}
          <Route
            path="/users"
            element={
              <ProtectedRoute permissions={['users.view']}>
                <DashboardLayout>
                  <UsersPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/leads"
            element={
              <ProtectedRoute permissions={['leads.view']}>
                <DashboardLayout>
                  <LeadsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects"
            element={
              <ProtectedRoute permissions={['projects.view']}>
                <DashboardLayout>
                  <ProjectsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute permissions={['analytics.view']}>
                <DashboardLayout>
                  <AnalyticsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/materials"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MaterialsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/finance"
            element={
              <ProtectedRoute permissions={['finance.view']}>
                <DashboardLayout>
                  <FinancePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </div>
  );
}

function RoleDashboard() {
  // This component renders the appropriate dashboard based on user role
  // Implementation would check user roles and render accordingly
  return <SuperAdminDashboard />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </QueryClientProvider>
  );
}
