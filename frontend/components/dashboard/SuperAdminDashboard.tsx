import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, Target, TrendingUp, DollarSign, MapPin } from 'lucide-react';
import { useBackend } from '../../contexts/AuthContext';
import StatsCard from './StatsCard';
import RecentActivity from './RecentActivity';
import ChartCard from './ChartCard';

export default function SuperAdminDashboard() {
  const backend = useBackend();
  
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: () => backend.analytics.getDashboardMetrics({}),
  });

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Complete overview of platform performance and analytics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Projects"
          value={metrics?.totalProjects || 0}
          icon={Building2}
          description="All time projects"
        />
        <StatsCard
          title="Active Projects"
          value={metrics?.activeProjects || 0}
          icon={TrendingUp}
          description="Currently in progress"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Total Leads"
          value={metrics?.totalLeads || 0}
          icon={Target}
          description="Lead pipeline"
        />
        <StatsCard
          title="Total Revenue"
          value={`₹${(metrics?.totalRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          description="Total earnings"
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Projects by Status"
          data={metrics?.projectsByStatus || []}
          type="pie"
        />
        <ChartCard
          title="Leads by Source"
          data={metrics?.leadsBySource || []}
          type="bar"
        />
      </div>

      {/* Top Cities Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Top Performing Cities</span>
          </CardTitle>
          <CardDescription>
            Cities with highest project volume and revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics?.topCities.map((city, index) => (
              <div key={city.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary">{index + 1}</Badge>
                  <div>
                    <h3 className="font-medium">{city.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {city.projectCount} projects
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">₹{city.revenue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <ChartCard
        title="Monthly Trends"
        data={metrics?.monthlyTrends || []}
        type="line"
        className="col-span-full"
      />

      <RecentActivity />
    </div>
  );
}
