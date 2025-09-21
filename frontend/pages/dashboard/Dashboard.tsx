import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import SuperAdminDashboard from '../../components/dashboard/SuperAdminDashboard';
import OperationsDashboard from '../../components/dashboard/OperationsDashboard';
import ProjectManagerDashboard from '../../components/dashboard/ProjectManagerDashboard';
import DesignerDashboard from '../../components/dashboard/DesignerDashboard';
import HomeownerDashboard from '../../components/dashboard/HomeownerDashboard';
import VendorDashboard from '../../components/dashboard/VendorDashboard';
import ProjectsPage from '../../components/dashboard/ProjectsPage';
import LeadsPage from '../../components/dashboard/LeadsPage';
import AnalyticsPage from '../../components/dashboard/AnalyticsPage';

export default function Dashboard() {
  const { user } = useAuth();

  const getDashboardComponent = () => {
    if (!user?.roles) return <HomeownerDashboard />;
    
    if (user.roles.includes('super_admin')) return <SuperAdminDashboard />;
    if (user.roles.includes('operations_team')) return <OperationsDashboard />;
    if (user.roles.includes('project_manager')) return <ProjectManagerDashboard />;
    if (user.roles.includes('interior_designer')) return <DesignerDashboard />;
    if (user.roles.includes('vendor')) return <VendorDashboard />;
    
    return <HomeownerDashboard />;
  };

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={getDashboardComponent()} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Routes>
    </DashboardLayout>
  );
}
