import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Server, 
  Database, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  RefreshCcw
} from 'lucide-react';
import apiClient from '../../src/lib/api-client';
import { toast } from '@/components/ui/use-toast';

interface SystemHealth {
  status: string;
  timestamp: string;
  database: string;
}

const SystemHealthPage: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);

  const { data: healthData, isLoading, error, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => apiClient.getSystemHealth(),
    refetchInterval: 30000,
    retry: 2,
  });

  const { data: dbHealthData, refetch: refetchDb } = useQuery({
    queryKey: ['database-health'],
    queryFn: () => apiClient.getDatabaseHealth(),
    refetchInterval: 30000,
    retry: 2,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchDb()]);
      toast({
        title: 'Success',
        description: 'System health data refreshed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to refresh system health data',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ok':
      case 'healthy':
      case 'connected':
        return 'bg-green-500/20 text-green-300';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'critical':
      case 'error':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ok':
      case 'healthy':
      case 'connected':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'critical':
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Server className="h-4 w-4" />;
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-semibold">System Health Unavailable</h3>
            </div>
            <p className="text-red-300 mb-4">Unable to fetch system health data</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Activity className="h-8 w-8" />
            System Health Monitor
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time system performance and health monitoring
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">API Status</CardTitle>
                {getStatusIcon(healthData?.status || 'unknown')}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  <Badge className={getStatusColor(healthData?.status || 'unknown')}>
                    {(healthData?.status || 'Unknown').toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Last checked: {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : 'Unknown'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Database Status</CardTitle>
                <Database className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  <Badge className={getStatusColor(healthData?.database || 'unknown')}>
                    {(healthData?.database || 'Unknown').toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Connection status
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Database Health</CardTitle>
                <Database className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  <Badge className={getStatusColor(dbHealthData?.status || 'unknown')}>
                    {(dbHealthData?.status || 'Unknown').toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Detailed check: {dbHealthData?.timestamp ? new Date(dbHealthData.timestamp).toLocaleTimeString() : 'Unknown'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">System Health Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthData?.status === 'ok' && healthData?.database === 'connected' ? (
                  <div className="flex items-center gap-2 p-3 rounded bg-green-500/10 border border-green-500/20">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-green-300 font-medium">All Systems Operational</p>
                      <p className="text-green-400 text-sm">API and Database are functioning normally</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="text-yellow-300 font-medium">System Status Check Required</p>
                      <p className="text-yellow-400 text-sm">
                        API Status: {healthData?.status || 'Unknown'} | Database: {healthData?.database || 'Unknown'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SystemHealthPage;