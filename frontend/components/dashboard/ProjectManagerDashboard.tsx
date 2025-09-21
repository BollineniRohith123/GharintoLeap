import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, Users, CheckCircle } from 'lucide-react';
import { useBackend } from '../../contexts/AuthContext';
import StatsCard from './StatsCard';
import ChartCard from './ChartCard';

export default function ProjectManagerDashboard() {
  const backend = useBackend();
  
  const { data: projects, isLoading } = useQuery({
    queryKey: ['my-projects'],
    queryFn: () => backend.projects.listProjects({}),
  });

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  const activeProjects = projects?.projects.filter(p => p.status === 'in_progress').length || 0;
  const completedProjects = projects?.projects.filter(p => p.status === 'completed').length || 0;
  const overdueProjects = projects?.projects.filter(p => 
    p.expectedEndDate && new Date(p.expectedEndDate) < new Date() && p.status !== 'completed'
  ).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Project Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your projects and track team progress
        </p>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Projects"
          value={activeProjects}
          icon={Clock}
          description="Currently in progress"
        />
        <StatsCard
          title="Completed Projects"
          value={completedProjects}
          icon={CheckCircle}
          description="Successfully delivered"
        />
        <StatsCard
          title="Team Size"
          value="12"
          icon={Users}
          description="Members reporting to you"
        />
        <StatsCard
          title="Overdue"
          value={overdueProjects}
          icon={Calendar}
          description="Past deadline"
          trend={{ value: overdueProjects > 0 ? -5 : 0, isPositive: false }}
        />
      </div>

      {/* Project Timeline and Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Project Progress"
          data={projects?.projects.map(p => ({ 
            name: p.title, 
            value: p.progressPercentage 
          })) || []}
          type="bar"
        />
        <ChartCard
          title="Projects by Status"
          data={[
            { status: 'Planning', count: projects?.projects.filter(p => p.status === 'planning').length || 0 },
            { status: 'In Progress', count: activeProjects },
            { status: 'Completed', count: completedProjects },
          ]}
          type="pie"
        />
      </div>

      {/* Recent Projects */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Projects</h2>
        <div className="space-y-3">
          {projects?.projects.slice(0, 5).map((project) => (
            <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h3 className="font-medium">{project.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {project.homeowner?.name} • {project.city?.name}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  project.status === 'completed' ? 'bg-green-100 text-green-800' :
                  project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {project.status.replace('_', ' ')}
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {project.progressPercentage}% complete
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
