import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Target, TrendingUp, CheckCircle } from 'lucide-react';
import { useBackend } from '../../contexts/AuthContext';
import StatsCard from './StatsCard';
import ChartCard from './ChartCard';

export default function OperationsDashboard() {
  const backend = useBackend();
  
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['operations-metrics'],
    queryFn: () => backend.analytics.getDashboardMetrics({}),
  });

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Operations Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor team performance and operational metrics
        </p>
      </div>

      {/* Operations Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Projects"
          value={metrics?.activeProjects || 0}
          icon={TrendingUp}
          description="Currently managed"
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Open Leads"
          value={(metrics?.totalLeads || 0) - (metrics?.convertedLeads || 0)}
          icon={Target}
          description="Awaiting conversion"
        />
        <StatsCard
          title="Conversion Rate"
          value={`${metrics?.conversionRate || 0}%`}
          icon={CheckCircle}
          description="Lead to project"
          trend={{ value: 3, isPositive: true }}
        />
        <StatsCard
          title="Team Members"
          value="24"
          icon={Users}
          description="Active team size"
        />
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Monthly Performance"
          data={metrics?.monthlyTrends || []}
          type="line"
        />
        <ChartCard
          title="Lead Sources"
          data={metrics?.leadsBySource || []}
          type="bar"
        />
      </div>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
          <CardDescription>Individual team member metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mock team data */}
            {[
              { name: 'Sarah Wilson', role: 'Project Manager', projects: 8, leads: 15, conversion: 73 },
              { name: 'Mike Johnson', role: 'Operations Lead', projects: 12, leads: 22, conversion: 68 },
              { name: 'Emma Davis', role: 'Project Manager', projects: 6, leads: 11, conversion: 82 },
            ].map((member) => (
              <div key={member.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
                <div className="flex space-x-6 text-center">
                  <div>
                    <p className="text-2xl font-bold">{member.projects}</p>
                    <p className="text-xs text-muted-foreground">Projects</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{member.leads}</p>
                    <p className="text-xs text-muted-foreground">Leads</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{member.conversion}%</p>
                    <p className="text-xs text-muted-foreground">Conversion</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
