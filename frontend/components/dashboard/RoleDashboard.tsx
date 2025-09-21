import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Building2, 
  Target, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Clock,
  CheckCircle,
  Star,
  Package,
  Truck,
  Settings
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import backend from '~backend/client';

interface DashboardProps {
  userRole: string;
}

const RoleDashboard: React.FC<DashboardProps> = ({ userRole }) => {
  const { user } = useAuthContext();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [userRole]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      let data;
      
      switch (userRole) {
        case 'super_admin':
          data = await backend.analytics.getSuperAdminDashboard();
          break;
        case 'interior_designer':
          data = await backend.analytics.getDesignerDashboard();
          break;
        case 'customer':
          data = await backend.analytics.getCustomerDashboard();
          break;
        case 'vendor':
          data = await backend.analytics.getVendorDashboard();
          break;
        case 'project_manager':
          data = await backend.analytics.getProjectManagerDashboard();
          break;
        default:
          // Fallback to general dashboard for other roles
          data = await backend.analytics.getDashboard({});
      }
      
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set empty data structure to prevent errors
      setDashboardData({});
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}! Here's your overview.
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Customize
        </Button>
      </div>

      {userRole === 'super_admin' && <SuperAdminDashboard data={dashboardData} />}
      {userRole === 'interior_designer' && <DesignerDashboard data={dashboardData} />}
      {userRole === 'customer' && <CustomerDashboard data={dashboardData} />}
      {userRole === 'vendor' && <VendorDashboard data={dashboardData} />}
      {userRole === 'project_manager' && <ProjectManagerDashboard data={dashboardData} />}
    </div>
  );
};

const SuperAdminDashboard: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Users"
        value={data?.users?.total || 0}
        description={`${data?.users?.new_this_month || 0} new this month`}
        icon={<Users className="h-4 w-4" />}
        trend={12}
      />
      <MetricCard
        title="Active Projects"
        value={data?.projects?.active || 0}
        description={`₹${(data?.projects?.total_value || 0).toLocaleString()}`}
        icon={<Building2 className="h-4 w-4" />}
        trend={8}
      />
      <MetricCard
        title="Leads This Month"
        value={data?.leads?.this_month || 0}
        description={`${data?.leads?.conversion_rate || 0}% conversion rate`}
        icon={<Target className="h-4 w-4" />}
        trend={15}
      />
      <MetricCard
        title="Revenue"
        value={`₹${(data?.revenue?.this_month || 0).toLocaleString()}`}
        description={`${data?.revenue?.growth_rate || 0}% growth`}
        icon={<DollarSign className="h-4 w-4" />}
        trend={data?.revenue?.growth_rate || 0}
      />
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Project Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.projects?.by_status?.length > 0 ? (
              data.projects.by_status.map((item: any) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No project data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lead Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.leads?.by_source?.length > 0 ? (
              data.leads.by_source.map((item: any) => (
                <div key={item.source} className="flex items-center justify-between">
                  <span className="text-sm">{item.source}</span>
                  <Badge>{item.count}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No lead source data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const DesignerDashboard: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Active Projects"
        value={data?.projects?.in_progress || 0}
        description={`${data?.projects?.assigned || 0} total assigned`}
        icon={<Building2 className="h-4 w-4" />}
      />
      <MetricCard
        title="Pending Tasks"
        value={data?.tasks?.pending || 0}
        description={`${data?.tasks?.overdue || 0} overdue`}
        icon={<Clock className="h-4 w-4" />}
        variant={data?.tasks?.overdue > 0 ? 'destructive' : 'default'}
      />
      <MetricCard
        title="New Leads"
        value={data?.leads?.new_today || 0}
        description={`${data?.leads?.high_priority || 0} high priority`}
        icon={<Target className="h-4 w-4" />}
      />
      <MetricCard
        title="This Month Earnings"
        value={`₹${(data?.earnings?.this_month || 0).toLocaleString()}`}
        description={`₹${(data?.earnings?.pending || 0).toLocaleString()} pending`}
        icon={<DollarSign className="h-4 w-4" />}
      />
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.projects?.upcoming_deadlines?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
            ) : (
              data?.projects?.upcoming_deadlines?.map((project: any) => (
                <div key={project.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{project.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {new Date(project.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {Math.ceil((new Date(project.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Completed This Week</span>
                <span className="text-sm font-medium">{data?.tasks?.completed_this_week || 0}</span>
              </div>
              <Progress value={((data?.tasks?.completed_this_week || 0) / 20) * 100} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{data?.tasks?.pending || 0}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{data?.tasks?.in_progress || 0}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{data?.tasks?.overdue || 0}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const CustomerDashboard: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
          <CardDescription>Current Stage: {data?.project?.current_stage}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={data?.project?.progress_percentage || 0} />
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{data?.project?.progress_percentage || 0}% Complete</span>
            </div>
            {data?.project?.next_milestone && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="font-medium">Next Milestone</p>
                <p className="text-sm text-muted-foreground">{data.project.next_milestone.stage}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Communications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm">{data?.communications?.unread_messages || 0} unread messages</span>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              View Messages
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Total Budget</span>
              <span className="font-bold">₹{(data?.payments?.total_budget || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Paid Amount</span>
              <span className="text-green-600">₹{(data?.payments?.paid_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pending Amount</span>
              <span className="text-orange-600">₹{(data?.payments?.pending_amount || 0).toLocaleString()}</span>
            </div>
            <Progress 
              value={((data?.payments?.paid_amount || 0) / (data?.payments?.total_budget || 1)) * 100} 
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Progress photos and design renders will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const VendorDashboard: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Pending Orders"
        value={data?.orders?.pending || 0}
        description={`${data?.orders?.in_progress || 0} in progress`}
        icon={<Package className="h-4 w-4" />}
      />
      <MetricCard
        title="Monthly Revenue"
        value={`₹${(data?.orders?.revenue_this_month || 0).toLocaleString()}`}
        description={`${data?.orders?.completed_this_month || 0} orders completed`}
        icon={<DollarSign className="h-4 w-4" />}
      />
      <MetricCard
        title="Rating"
        value={data?.performance?.rating?.toFixed(1) || '0.0'}
        description={`${data?.performance?.total_reviews || 0} reviews`}
        icon={<Star className="h-4 w-4" />}
      />
      <MetricCard
        title="Materials Listed"
        value={data?.materials?.total_listed || 0}
        description={`${data?.materials?.out_of_stock || 0} out of stock`}
        icon={<Truck className="h-4 w-4" />}
        variant={data?.materials?.out_of_stock > 0 ? 'warning' : 'default'}
      />
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Top Selling Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.materials?.top_selling?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales data available</p>
            ) : (
              data?.materials?.top_selling?.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{item.name}</span>
                  <Badge>{item.order_count} orders</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">On-time Delivery</span>
                <span className="text-sm font-medium">{data?.performance?.on_time_delivery || 0}%</span>
              </div>
              <Progress value={data?.performance?.on_time_delivery || 0} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Customer Rating</span>
                <span className="text-sm font-medium">{data?.performance?.rating?.toFixed(1) || '0.0'}/5.0</span>
              </div>
              <Progress value={(data?.performance?.rating || 0) * 20} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const ProjectManagerDashboard: React.FC<{ data: any }> = ({ data }) => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Managed Projects"
        value={data?.projects?.managed || 0}
        description={`${data?.projects?.on_schedule || 0} on schedule`}
        icon={<Building2 className="h-4 w-4" />}
      />
      <MetricCard
        title="Delayed Projects"
        value={data?.projects?.delayed || 0}
        description="Need attention"
        icon={<AlertCircle className="h-4 w-4" />}
        variant={data?.projects?.delayed > 0 ? 'destructive' : 'default'}
      />
      <MetricCard
        title="Budget Utilization"
        value={`${data?.financial?.budget_variance || 0}%`}
        description="Average across projects"
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <MetricCard
        title="Quality Score"
        value={`${data?.operations?.quality_score || 0}%`}
        description="Project quality rating"
        icon={<CheckCircle className="h-4 w-4" />}
      />
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Active Designers</span>
              <Badge>{data?.team?.active_designers || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Active Vendors</span>
              <Badge>{data?.team?.active_vendors || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Pending Approvals</span>
              <Badge variant="outline">{data?.operations?.pending_approvals || 0}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financial Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Cost Savings</span>
              <span className="font-bold text-green-600">
                ₹{(data?.financial?.cost_savings || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Revenue Impact</span>
              <span className="font-bold">
                ₹{(data?.financial?.revenue_impact || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: number;
  variant?: 'default' | 'destructive' | 'warning';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  description, 
  icon, 
  trend,
  variant = 'default' 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return '';
    }
  };

  return (
    <Card className={getVariantStyles()}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {description}
            {trend !== undefined && (
              <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
                {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
              </span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RoleDashboard;