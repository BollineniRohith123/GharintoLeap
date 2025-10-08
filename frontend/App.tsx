import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Public pages
import HomePage from './pages/public/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordForm from './components/auth/ForgotPasswordForm';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Dashboard layouts
import DashboardLayout from './components/layout/DashboardLayout';
import RoleDashboard from './components/dashboard/RoleDashboard';

// Feature pages
import UsersPage from './pages/users/UsersPage';
import LeadsPage from './pages/leads/LeadsPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectDetailsPage from './pages/projects/ProjectDetailsPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import MaterialsPage from './pages/materials/MaterialsPage';
import FinancePage from './pages/finance/FinancePage';
import FinancialManagementPage from './pages/finance/FinancialManagementPage';
import PartnerApprovalsPage from './pages/approvals/PartnerApprovalsPage';
import SettingsPage from './pages/settings/SettingsPage';
import TestimonialsPage from './pages/testimonials/TestimonialsPage';
import VendorsPage from './pages/vendors/VendorsPage';
import CommunicationsPage from './pages/communications/CommunicationsPage';
import EmployeesPage from './pages/admin/EmployeesPage';
import ComplaintsPage from './pages/support/ComplaintsPage';
import SystemHealthPage from './pages/system/SystemHealthPage';
import SystemSettingsPage from './pages/system/SystemSettingsPage';
import AuditLogsPage from './pages/system/AuditLogsPage';
import RolesPage from './pages/system/RolesPage';
import CityManagementPage from './pages/system/CityManagementPage';
import MenuConfigurationPage from './pages/system/MenuConfigurationPage';
import AssignmentConfigPage from './pages/system/AssignmentConfigPage';
import CommissionConfigPage from './pages/finance/CommissionConfigPage';

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
          <Route path="/forgot-password" element={<ForgotPasswordForm />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected dashboard routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardComponent />
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
            path="/projects/:id"
            element={
              <ProtectedRoute permissions={['projects.view']}>
                <DashboardLayout>
                  <ProjectDetailsPage />
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
            path="/finance/management"
            element={
              <ProtectedRoute permissions={['finance.manage']}>
                <DashboardLayout>
                  <FinancialManagementPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/approvals/partners"
            element={
              <ProtectedRoute permissions={['approvals.manage']}>
                <DashboardLayout>
                  <PartnerApprovalsPage />
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

          <Route
            path="/testimonials"
            element={
              <ProtectedRoute permissions={['content.manage']}>
                <DashboardLayout>
                  <TestimonialsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/vendors"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <VendorsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/communications"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CommunicationsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees"
            element={
              <ProtectedRoute permissions={['users.admin']}>
                <DashboardLayout>
                  <EmployeesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/complaints"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ComplaintsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/system/health"
            element={
              <ProtectedRoute permissions={['system.configure']}>
                <DashboardLayout>
                  <SystemHealthPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/system/settings"
            element={
              <ProtectedRoute permissions={['system.configure']}>
                <DashboardLayout>
                  <SystemSettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/system/audit-logs"
            element={
              <ProtectedRoute permissions={['system.configure']}>
                <DashboardLayout>
                  <AuditLogsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/system/roles"
            element={
              <ProtectedRoute permissions={['system.configure']}>
                <DashboardLayout>
                  <RolesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/system/cities"
            element={
              <ProtectedRoute permissions={['system.admin']}>
                <DashboardLayout>
                  <CityManagementPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/system/menus"
            element={
              <ProtectedRoute permissions={['system.admin']}>
                <DashboardLayout>
                  <MenuConfigurationPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/system/assignment-config"
            element={
              <ProtectedRoute permissions={['system.admin']}>
                <DashboardLayout>
                  <AssignmentConfigPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/finance/commission-config"
            element={
              <ProtectedRoute permissions={['system.admin']}>
                <DashboardLayout>
                  <CommissionConfigPage />
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

function DashboardComponent() {
  const { user } = useAuth();
  const primaryRole = user?.roles?.[0] || 'customer';
  
  return <RoleDashboard userRole={primaryRole} />;
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
