import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
  FolderOpen,
  Building,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import backend from '~backend/client';
import { useAuth } from '../../contexts/AuthContext';

export default function SuperAdminDashboard() {
  const { token } = useAuth();

  const authenticatedBackend = token 
    ? backend.with({ auth: () => ({ authorization: `Bearer ${token}` }) })
    : backend;

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => authenticatedBackend.analytics.getDashboard(),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Complete overview of platform performance and operations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">Export Report</Button>
          <Button className="bg-green-500 hover:bg-green-600">Settings</Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{dashboard?.leadsThisMonth || 0}</span> this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalProjects || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-blue-600">{dashboard?.activeProjects || 0}</span> active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{((dashboard?.totalRevenue || 0) / 100000).toFixed(1)}L
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+₹{((dashboard?.revenueThisMonth || 0) / 100000).toFixed(1)}L</span> this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Lead to project conversion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Cities by Performance</CardTitle>
            <CardDescription>Revenue and project distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard?.topCities?.slice(0, 5).map((city, index) => (
                <div key={city.city} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center dark:bg-green-900">
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{city.city}</p>
                      <p className="text-sm text-muted-foreground">
                        {city.projects} projects • {city.leads} leads
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{(city.revenue / 100000).toFixed(1)}L</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Where our leads are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard?.leadsBySource?.map((source) => (
                <div key={source.source} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium capitalize">
                      {source.source.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {source.percentage.toFixed(1)}%
                    </span>
                    <Badge variant="secondary">{source.count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Project Status Distribution</CardTitle>
          <CardDescription>Current status of all projects in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dashboard?.projectsByStatus?.map((status) => (
              <div key={status.status} className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{status.count}</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {status.status.replace('_', ' ')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {status.percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Platform status and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>API Services</span>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Database</span>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>File Storage</span>
                </div>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  Degraded
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Payment Gateway</span>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Operational
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="sm" className="justify-start">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
              <Button variant="outline" size="sm" className="justify-start">
                <Building className="mr-2 h-4 w-4" />
                System Settings
              </Button>
              <Button variant="outline" size="sm" className="justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Reports
              </Button>
              <Button variant="outline" size="sm" className="justify-start">
                <AlertCircle className="mr-2 h-4 w-4" />
                System Logs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
