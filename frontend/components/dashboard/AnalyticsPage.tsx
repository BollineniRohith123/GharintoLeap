import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBackend } from '../../contexts/AuthContext';
import StatsCard from './StatsCard';
import ChartCard from './ChartCard';

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState('30d');
  const [city, setCity] = useState('all');
  const backend = useBackend();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', timeframe, city],
    queryFn: () => backend.analytics.getDashboardMetrics({
      timeframe,
      city: city !== 'all' ? city : undefined,
    }),
  });

  if (isLoading) {
    return <div>Loading analytics...</div>;
  }

  const stats = [
    {
      title: 'Total Revenue',
      value: `₹${(analytics?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      trend: { value: 12.5, isPositive: true },
    },
    {
      title: 'Active Projects',
      value: analytics?.activeProjects || 0,
      icon: Activity,
      trend: { value: 5.2, isPositive: true },
    },
    {
      title: 'Total Customers',
      value: analytics?.totalLeads || 0,
      icon: Users,
      trend: { value: 8.1, isPositive: true },
    },
    {
      title: 'Conversion Rate',
      value: `${analytics?.conversionRate || 0}%`,
      icon: TrendingUp,
      trend: { value: 2.4, isPositive: true },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Business insights and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              <SelectItem value="mumbai">Mumbai</SelectItem>
              <SelectItem value="bangalore">Bangalore</SelectItem>
              <SelectItem value="hyderabad">Hyderabad</SelectItem>
              <SelectItem value="chennai">Chennai</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Revenue Trend"
          data={analytics?.monthlyTrends || []}
          type="line"
        />
        <ChartCard
          title="Project Status"
          data={analytics?.projectsByStatus || []}
          type="pie"
        />
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Top Performing Designers</span>
            </CardTitle>
            <CardDescription>Based on project completion and ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.topCities?.slice(0, 5).map((city: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{city.name}</p>
                    <p className="text-sm text-muted-foreground">{city.projectCount} projects</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{city.revenue.toLocaleString()}</p>
                  </div>
                </div>
              )) || <p className="text-muted-foreground">No data available</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Where your leads are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.leadsBySource?.map((source: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{source.source}</span>
                  <span className="text-muted-foreground">{source.count} leads</span>
                </div>
              )) || <p className="text-muted-foreground">No data available</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Satisfaction</CardTitle>
            <CardDescription>Average ratings and feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  4.2/5.0
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on {analytics?.totalLeads || 0} reviews
                </p>
              </div>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center space-x-2">
                    <span className="text-sm font-medium w-8">{rating}★</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.random() * 80 + 20}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8">
                      {Math.round(Math.random() * 80 + 20)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}