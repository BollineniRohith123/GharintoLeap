import { useQuery } from '@tanstack/react-query';
import { Home, MessageCircle, Calendar, DollarSign } from 'lucide-react';
import { useBackend } from '../../contexts/AuthContext';
import StatsCard from './StatsCard';

export default function HomeownerDashboard() {
  const backend = useBackend();
  
  const { data: projects, isLoading } = useQuery({
    queryKey: ['homeowner-projects'],
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
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">
          Track your home renovation projects and communicate with designers
        </p>
      </div>

      {/* Homeowner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Projects"
          value={activeProjects}
          icon={Home}
          description="Currently in progress"
        />
        <StatsCard
          title="Completed Projects"
          value={completedProjects}
          icon={Calendar}
          description="Successfully finished"
        />
        <StatsCard
          title="Messages"
          value="5"
          icon={MessageCircle}
          description="Unread messages"
        />
        <StatsCard
          title="Total Investment"
          value="₹2,50,000"
          icon={DollarSign}
          description="Across all projects"
        />
      </div>

      {/* My Projects */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">My Projects</h2>
        {projects?.projects.length === 0 ? (
          <div className="text-center py-8">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Start your interior design journey by creating your first project
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects?.projects.slice(0, 5).map((project) => (
              <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h3 className="font-medium">{project.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Designer: {project.designer?.name || 'Not assigned'} • 
                    Status: {project.status.replace('_', ' ')}
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
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border rounded-lg hover:bg-accent transition-colors text-left">
            <Home className="h-6 w-6 mb-2 text-primary" />
            <h3 className="font-medium">Start New Project</h3>
            <p className="text-sm text-muted-foreground">Begin your renovation journey</p>
          </button>
          <button className="p-4 border rounded-lg hover:bg-accent transition-colors text-left">
            <MessageCircle className="h-6 w-6 mb-2 text-primary" />
            <h3 className="font-medium">Contact Designer</h3>
            <p className="text-sm text-muted-foreground">Chat with your designer</p>
          </button>
          <button className="p-4 border rounded-lg hover:bg-accent transition-colors text-left">
            <Calendar className="h-6 w-6 mb-2 text-primary" />
            <h3 className="font-medium">Schedule Meeting</h3>
            <p className="text-sm text-muted-foreground">Book a consultation</p>
          </button>
        </div>
      </div>
    </div>
  );
}
