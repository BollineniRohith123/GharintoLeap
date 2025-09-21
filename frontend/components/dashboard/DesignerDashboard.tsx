import { useQuery } from '@tanstack/react-query';
import { Palette, Star, DollarSign, Calendar } from 'lucide-react';
import { useBackend } from '../../contexts/AuthContext';
import StatsCard from './StatsCard';

export default function DesignerDashboard() {
  const backend = useBackend();
  
  const { data: projects, isLoading } = useQuery({
    queryKey: ['designer-projects'],
    queryFn: () => backend.projects.listProjects({}),
  });

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  const activeProjects = projects?.projects.filter(p => p.status === 'in_progress').length || 0;
  const completedProjects = projects?.projects.filter(p => p.status === 'completed').length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Designer Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your design projects and portfolio
        </p>
      </div>

      {/* Designer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Projects"
          value={activeProjects}
          icon={Palette}
          description="Currently designing"
        />
        <StatsCard
          title="Completed Projects"
          value={completedProjects}
          icon={Calendar}
          description="Portfolio pieces"
        />
        <StatsCard
          title="Rating"
          value="4.8⭐"
          icon={Star}
          description="Client satisfaction"
        />
        <StatsCard
          title="This Month Earnings"
          value="₹45,000"
          icon={DollarSign}
          description="Current month"
          trend={{ value: 12, isPositive: true }}
        />
      </div>

      {/* Current Projects */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Current Projects</h2>
        <div className="space-y-3">
          {projects?.projects.filter(p => p.status !== 'completed').slice(0, 5).map((project) => (
            <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h3 className="font-medium">{project.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {project.homeowner?.name} • Due: {project.expectedEndDate}
                </p>
              </div>
              <div className="text-right">
                <div className="w-24 bg-muted rounded-full h-2 mb-1">
                  <div 
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${project.progressPercentage}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  {project.progressPercentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio Showcase */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Portfolio Highlights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mock portfolio items */}
          {[1, 2, 3].map((item) => (
            <div key={item} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
              <span className="text-4xl">🏠</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
