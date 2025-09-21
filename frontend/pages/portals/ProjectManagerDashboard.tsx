import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FolderOpen,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  Target,
} from 'lucide-react';
import backend from '~backend/client';
import { useAuth } from '../../contexts/AuthContext';

export default function ProjectManagerDashboard() {
  const { token } = useAuth();

  const authenticatedBackend = token 
    ? backend.with({ auth: () => ({ authorization: `Bearer ${token}` }) })
    : backend;

  const { data: projects, isLoading } = useQuery({
    queryKey: ['my-projects'],
    queryFn: () => authenticatedBackend.projects.listProjects({ limit: 20 }),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeProjects = projects?.projects?.filter(p => 
    ['planning', 'in_progress', 'review'].includes(p.status)
  ) || [];

  const completedProjects = projects?.projects?.filter(p => p.status === 'completed') || [];
  const delayedProjects = projects?.projects?.filter(p => 
    new Date(p.endDate || '') < new Date() && p.status !== 'completed'
  ) || [];

  const totalBudget = projects?.projects?.reduce((sum, p) => sum + p.budget, 0) || 0;
  const avgProgress = projects?.projects?.reduce((sum, p) => sum + p.progressPercentage, 0) / (projects?.projects?.length || 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Project Manager Dashboard</h1>
          <p className="text-muted-foreground">
            Manage projects, timelines, and deliverables
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">Schedule Meeting</Button>
          <Button className="bg-green-500 hover:bg-green-600">Create Project</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{completedProjects.length}</span> completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalBudget / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProgress.toFixed(0)}%</div>
            <Progress value={avgProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delayed Projects</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{delayedProjects.length}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project Status Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
            <CardDescription>Projects currently in progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeProjects.slice(0, 5).map((project) => (
                <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center dark:bg-blue-900">
                      <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <p className="font-medium">{project.title}</p>
                      <p className="text-sm text-muted-foreground">{project.client.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={project.status === 'in_progress' ? 'default' : 'secondary'}
                      className={project.status === 'in_progress' ? 'bg-blue-500' : ''}
                    >
                      {project.status.replace('_', ' ')}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {project.progressPercentage}% complete
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
            <CardDescription>Upcoming milestones and deadlines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeProjects.slice(0, 5).map((project) => (
                <div key={project.id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center dark:bg-green-900">
                    <Calendar className="h-4 w-4 text-green-600 dark:text-green-300" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{project.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'TBD'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {new Date(project.endDate || '') < new Date() && project.status !== 'completed' ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : (
                      <Badge variant="outline">On Track</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget and Resource Management */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
            <CardDescription>Financial status of projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Total Budget</span>
                <span className="font-medium">₹{(totalBudget / 100000).toFixed(1)}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Utilized</span>
                <span className="font-medium">₹{((totalBudget * 0.65) / 100000).toFixed(1)}L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Remaining</span>
                <span className="font-medium text-green-600">₹{((totalBudget * 0.35) / 100000).toFixed(1)}L</span>
              </div>
              <Progress value={65} className="mt-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Workload</CardTitle>
            <CardDescription>Designer assignment status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Available Designers</span>
                <span className="font-medium text-green-600">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Fully Assigned</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Overloaded</span>
                <span className="font-medium text-red-600">2</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality Metrics</CardTitle>
            <CardDescription>Project quality indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Client Satisfaction</span>
                <span className="font-medium">4.8/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">On-time Delivery</span>
                <span className="font-medium">92%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Budget Adherence</span>
                <span className="font-medium">88%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common project management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" size="sm" className="justify-start">
              <Clock className="mr-2 h-4 w-4" />
              Update Timeline
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <Users className="mr-2 h-4 w-4" />
              Assign Team
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark Milestone
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Report Issue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
