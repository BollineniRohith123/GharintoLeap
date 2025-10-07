import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';

interface SystemHealthData {
  status: string;
  timestamp: string;
  database: {
    status: string;
    response_time_ms: number;
    current_time: string;
  };
  server: {
    uptime_seconds: number;
    memory_usage_mb: number;
    node_version: string;
    platform: string;
  };
}

export default function SystemHealthPage() {
  const { token } = useAuth();

  const { data: healthData, isLoading, error, refetch } = useQuery<SystemHealthData>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await fetch('http://localhost:4000/system/admin/health', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }
      return response.json();
    },
    enabled: !!token,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getStatusColor = (status: string) => {
    return status === 'healthy' ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
    if (status === 'healthy') {
      return `${baseClasses} bg-green-100 text-green-800`;
    }
    return `${baseClasses} bg-red-100 text-red-800`;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading System Health</h3>
          <p className="text-red-600 mb-4">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Health Monitor</h1>
        <div className="flex items-center space-x-4">
          <span className={`text-sm ${getStatusColor(healthData?.status || 'unknown')}`}>
            Last updated: {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : 'Unknown'}
          </span>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Overall Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Overall Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">System Status:</span>
                <span className={getStatusBadge(healthData.status)}>
                  {healthData.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Last Check:</span>
                <span className="text-gray-900">
                  {new Date(healthData.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Database Health */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Database Health</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Connection:</span>
                <span className={getStatusBadge(healthData.database.status)}>
                  {healthData.database.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Response Time:</span>
                <span className="text-gray-900">{healthData.database.response_time_ms}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">DB Time:</span>
                <span className="text-gray-900">
                  {new Date(healthData.database.current_time).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Server Health */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Server Health</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Uptime:</span>
                <span className="text-gray-900">{formatUptime(healthData.server.uptime_seconds)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Memory Usage:</span>
                <span className="text-gray-900">{healthData.server.memory_usage_mb} MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Node Version:</span>
                <span className="text-gray-900">{healthData.server.node_version}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Platform:</span>
                <span className="text-gray-900">{healthData.server.platform}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>🔄 Auto-refreshing every 30 seconds</p>
      </div>
    </div>
  );
}
