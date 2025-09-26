import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface SystemPerformance {
  timestamp: Date;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_connections: number;
  response_time: number;
  error_rate: number;
  throughput: number;
}

interface APIPerformance {
  endpoint: string;
  method: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  max_response_time: number;
  min_response_time: number;
  error_rate: number;
  last_24h_requests: number;
}

interface UserActivityMetrics {
  active_users_now: number;
  active_users_today: number;
  active_users_week: number;
  active_users_month: number;
  peak_concurrent_users: number;
  average_session_duration: number;
  bounce_rate: number;
  page_views: number;
}

interface PerformanceAlert {
  id: number;
  type: 'cpu' | 'memory' | 'disk' | 'response_time' | 'error_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  current_value: number;
  created_at: Date;
  resolved_at?: Date;
}

interface MonitoringParams {
  start_date?: Query<string>;
  end_date?: Query<string>;
  interval?: Query<'1m' | '5m' | '15m' | '1h' | '1d'>;
  metric_type?: Query<string>;
}

// Get current system performance
export const getSystemPerformance = api<{}, SystemPerformance>(
  { auth: true, expose: true, method: "GET", path: "/analytics/performance/system" },
  async () => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('system.monitor') && !auth.permissions.includes('analytics.view')) {
      throw APIError.forbidden("Insufficient permissions to view system performance");
    }

    try {
      // Mock system performance data (in production, you'd get this from system monitoring tools)
      const performance: SystemPerformance = {
        timestamp: new Date(),
        cpu_usage: Math.random() * 80 + 10, // 10-90%
        memory_usage: Math.random() * 70 + 20, // 20-90%
        disk_usage: Math.random() * 50 + 30, // 30-80%
        active_connections: Math.floor(Math.random() * 100 + 50), // 50-150
        response_time: Math.random() * 200 + 50, // 50-250ms
        error_rate: Math.random() * 2, // 0-2%
        throughput: Math.random() * 1000 + 500 // 500-1500 req/min
      };

      return performance;

    } catch (error) {
      console.error('Get system performance error:', error);
      throw APIError.internal("Failed to fetch system performance");
    }
  }
);

// Get API performance metrics
export const getAPIPerformance = api<MonitoringParams, { endpoints: APIPerformance[]; summary: any }>(
  { auth: true, expose: true, method: "GET", path: "/analytics/performance/api" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('system.monitor') && !auth.permissions.includes('analytics.view')) {
      throw APIError.forbidden("Insufficient permissions to view API performance");
    }

    try {
      // Mock API performance data
      const mockEndpoints: APIPerformance[] = [
        {
          endpoint: "/projects",
          method: "GET",
          total_requests: 15420,
          successful_requests: 15280,
          failed_requests: 140,
          average_response_time: 125,
          max_response_time: 2500,
          min_response_time: 45,
          error_rate: 0.9,
          last_24h_requests: 1250
        },
        {
          endpoint: "/users/profile",
          method: "GET",
          total_requests: 8750,
          successful_requests: 8720,
          failed_requests: 30,
          average_response_time: 85,
          max_response_time: 1200,
          min_response_time: 35,
          error_rate: 0.3,
          last_24h_requests: 890
        },
        {
          endpoint: "/finance/invoices",
          method: "POST",
          total_requests: 3200,
          successful_requests: 3150,
          failed_requests: 50,
          average_response_time: 180,
          max_response_time: 3000,
          min_response_time: 90,
          error_rate: 1.6,
          last_24h_requests: 320
        },
        {
          endpoint: "/communications/notifications",
          method: "POST",
          total_requests: 25600,
          successful_requests: 25450,
          failed_requests: 150,
          average_response_time: 95,
          max_response_time: 800,
          min_response_time: 25,
          error_rate: 0.6,
          last_24h_requests: 2100
        }
      ];

      const summary = {
        total_requests: mockEndpoints.reduce((sum, ep) => sum + ep.total_requests, 0),
        total_errors: mockEndpoints.reduce((sum, ep) => sum + ep.failed_requests, 0),
        average_response_time: mockEndpoints.reduce((sum, ep) => sum + ep.average_response_time, 0) / mockEndpoints.length,
        overall_error_rate: mockEndpoints.reduce((sum, ep) => sum + ep.error_rate, 0) / mockEndpoints.length,
        slowest_endpoint: mockEndpoints.reduce((max, curr) => curr.average_response_time > max.average_response_time ? curr : max),
        most_used_endpoint: mockEndpoints.reduce((max, curr) => curr.total_requests > max.total_requests ? curr : max)
      };

      return { endpoints: mockEndpoints, summary };

    } catch (error) {
      console.error('Get API performance error:', error);
      throw APIError.internal("Failed to fetch API performance");
    }
  }
);

// Get user activity metrics
export const getUserActivityMetrics = api<MonitoringParams, UserActivityMetrics>(
  { auth: true, expose: true, method: "GET", path: "/analytics/performance/user-activity" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('analytics.view') && !auth.permissions.includes('users.admin')) {
      throw APIError.forbidden("Insufficient permissions to view user activity metrics");
    }

    try {
      // Get real user activity data
      const activityData = await db.queryRow`
        SELECT 
          COUNT(DISTINCT u.id) FILTER (WHERE u.last_login_at > NOW() - INTERVAL '1 day') as active_today,
          COUNT(DISTINCT u.id) FILTER (WHERE u.last_login_at > NOW() - INTERVAL '7 days') as active_week,
          COUNT(DISTINCT u.id) FILTER (WHERE u.last_login_at > NOW() - INTERVAL '30 days') as active_month
        FROM users u
        WHERE u.is_active = true
      `;

      // Mock some metrics that would require session tracking
      const metrics: UserActivityMetrics = {
        active_users_now: Math.floor(Math.random() * 50 + 10), // 10-60 users
        active_users_today: parseInt(activityData?.active_today || '0'),
        active_users_week: parseInt(activityData?.active_week || '0'),
        active_users_month: parseInt(activityData?.active_month || '0'),
        peak_concurrent_users: Math.floor(Math.random() * 100 + 50), // Mock value
        average_session_duration: Math.floor(Math.random() * 1800 + 600), // 10-40 minutes in seconds
        bounce_rate: Math.random() * 30 + 20, // 20-50%
        page_views: Math.floor(Math.random() * 10000 + 5000) // Mock page views
      };

      return metrics;

    } catch (error) {
      console.error('Get user activity metrics error:', error);
      throw APIError.internal("Failed to fetch user activity metrics");
    }
  }
);

// Get performance alerts
export const getPerformanceAlerts = api<{ 
  severity?: Query<string>;
  resolved?: Query<boolean>;
  limit?: Query<number>;
}, { alerts: PerformanceAlert[]; summary: any }>(
  { auth: true, expose: true, method: "GET", path: "/analytics/performance/alerts" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('system.monitor') && !auth.permissions.includes('alerts.view')) {
      throw APIError.forbidden("Insufficient permissions to view performance alerts");
    }

    const limit = Math.min(params.limit || 50, 200);

    try {
      // Mock performance alerts
      const mockAlerts: PerformanceAlert[] = [
        {
          id: 1,
          type: 'response_time',
          severity: 'high',
          message: 'API response time exceeded threshold',
          threshold: 200,
          current_value: 350,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          resolved_at: undefined
        },
        {
          id: 2,
          type: 'memory',
          severity: 'medium',
          message: 'Memory usage is above normal levels',
          threshold: 80,
          current_value: 85,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          resolved_at: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
        },
        {
          id: 3,
          type: 'error_rate',
          severity: 'critical',
          message: 'Error rate spike detected',
          threshold: 2,
          current_value: 5.2,
          created_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          resolved_at: undefined
        }
      ];

      // Apply filters
      let filteredAlerts = mockAlerts;

      if (params.severity) {
        filteredAlerts = filteredAlerts.filter(alert => alert.severity === params.severity);
      }

      if (params.resolved !== undefined) {
        filteredAlerts = filteredAlerts.filter(alert => 
          params.resolved ? alert.resolved_at !== undefined : alert.resolved_at === undefined
        );
      }

      // Sort by creation time (newest first) and limit
      filteredAlerts.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      filteredAlerts = filteredAlerts.slice(0, limit);

      const summary = {
        total_alerts: mockAlerts.length,
        active_alerts: mockAlerts.filter(a => !a.resolved_at).length,
        critical_alerts: mockAlerts.filter(a => a.severity === 'critical' && !a.resolved_at).length,
        high_alerts: mockAlerts.filter(a => a.severity === 'high' && !a.resolved_at).length,
        by_type: {
          cpu: mockAlerts.filter(a => a.type === 'cpu').length,
          memory: mockAlerts.filter(a => a.type === 'memory').length,
          disk: mockAlerts.filter(a => a.type === 'disk').length,
          response_time: mockAlerts.filter(a => a.type === 'response_time').length,
          error_rate: mockAlerts.filter(a => a.type === 'error_rate').length
        }
      };

      return { alerts: filteredAlerts, summary };

    } catch (error) {
      console.error('Get performance alerts error:', error);
      throw APIError.internal("Failed to fetch performance alerts");
    }
  }
);

// Resolve performance alert
export const resolvePerformanceAlert = api<{ id: number; notes?: string }, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/analytics/performance/alerts/:id/resolve" },
  async ({ id, notes }) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('system.admin') && !auth.permissions.includes('alerts.manage')) {
      throw APIError.forbidden("Insufficient permissions to resolve performance alerts");
    }

    try {
      // Log alert resolution
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'resolve_alert', 'performance_alert', ${id}, ${JSON.stringify({ notes, resolved_at: new Date() })})
      `;

      return { success: true };

    } catch (error) {
      console.error('Resolve performance alert error:', error);
      throw APIError.internal("Failed to resolve performance alert");
    }
  }
);

// Get performance trends
export const getPerformanceTrends = api<MonitoringParams, { 
  trends: any[];
  insights: string[];
  recommendations: string[];
}>(
  { auth: true, expose: true, method: "GET", path: "/analytics/performance/trends" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('analytics.view') && !auth.permissions.includes('system.monitor')) {
      throw APIError.forbidden("Insufficient permissions to view performance trends");
    }

    try {
      // Mock performance trends data
      const trends = [
        {
          metric: 'response_time',
          current_value: 125,
          previous_value: 110,
          change_percentage: 13.6,
          trend: 'increasing',
          period: '24h'
        },
        {
          metric: 'throughput',
          current_value: 850,
          previous_value: 780,
          change_percentage: 9.0,
          trend: 'increasing',
          period: '24h'
        },
        {
          metric: 'error_rate',
          current_value: 0.8,
          previous_value: 1.2,
          change_percentage: -33.3,
          trend: 'decreasing',
          period: '24h'
        },
        {
          metric: 'memory_usage',
          current_value: 68,
          previous_value: 65,
          change_percentage: 4.6,
          trend: 'increasing',
          period: '24h'
        }
      ];

      const insights = [
        "API response times have increased by 13.6% in the last 24 hours",
        "System throughput has improved by 9% indicating better performance",
        "Error rates have decreased by 33.3%, showing improved stability",
        "Memory usage is gradually increasing and should be monitored"
      ];

      const recommendations = [
        "Consider optimizing database queries to reduce response times",
        "Monitor memory usage trends and plan for scaling if needed",
        "Investigate the cause of recent response time increases",
        "Continue monitoring error rate improvements"
      ];

      return { trends, insights, recommendations };

    } catch (error) {
      console.error('Get performance trends error:', error);
      throw APIError.internal("Failed to fetch performance trends");
    }
  }
);

// Create performance alert rule
export const createAlertRule = api<{
  metric_type: 'cpu' | 'memory' | 'disk' | 'response_time' | 'error_rate';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: 'greater_than' | 'less_than' | 'equals';
  duration_minutes: number;
  enabled: boolean;
}, { success: boolean; rule_id: number }>(
  { auth: true, expose: true, method: "POST", path: "/analytics/performance/alert-rules" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('system.admin') && !auth.permissions.includes('alerts.manage')) {
      throw APIError.forbidden("Insufficient permissions to create alert rules");
    }

    // Validate inputs
    if (req.threshold <= 0 || req.duration_minutes <= 0) {
      throw APIError.badRequest("Threshold and duration must be positive numbers");
    }

    try {
      const ruleId = Math.floor(Math.random() * 1000000);

      // Log alert rule creation
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'create_alert_rule', 'alert_rule', ${ruleId}, ${JSON.stringify(req)})
      `;

      return { success: true, rule_id: ruleId };

    } catch (error) {
      console.error('Create alert rule error:', error);
      throw APIError.internal("Failed to create alert rule");
    }
  }
);
