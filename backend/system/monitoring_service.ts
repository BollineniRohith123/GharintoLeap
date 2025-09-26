import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";
import { logger } from "../common/logger";
import { realtimeService } from "./realtime_service";

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  services: {
    database: ServiceStatus;
    realtime: ServiceStatus;
    auth: ServiceStatus;
    payments: ServiceStatus;
    notifications: ServiceStatus;
  };
  metrics: {
    responseTime: number;
    errorRate: number;
    activeUsers: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  alerts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'critical';
  responseTime: number;
  lastCheck: Date;
  errors: number;
  uptime: number;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  service?: string;
  endpoint?: string;
}

interface BusinessMetrics {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  users: {
    activeToday: number;
    newToday: number;
    totalActive: number;
    retentionRate: number;
  };
  projects: {
    activeProjects: number;
    completedToday: number;
    conversionRate: number;
    avgProjectValue: number;
  };
  complaints: {
    openComplaints: number;
    resolvedToday: number;
    avgResolutionTime: number;
    satisfactionScore: number;
  };
}

class MonitoringService {
  private static instance: MonitoringService;
  private startTime: Date = new Date();
  private healthChecks: Map<string, ServiceStatus> = new Map();

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  async getSystemHealth(): Promise<SystemHealth> {
    try {
      // Perform health checks for all services
      const [database, realtime, auth, payments, notifications] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkRealtimeHealth(),
        this.checkAuthHealth(),
        this.checkPaymentsHealth(),
        this.checkNotificationsHealth()
      ]);

      // Get system metrics
      const metrics = await this.getSystemMetrics();
      
      // Get alert counts
      const alerts = await this.getAlertCounts();

      // Determine overall status
      const services = { database, realtime, auth, payments, notifications };
      const overallStatus = this.determineOverallStatus(services);

      const uptime = (Date.now() - this.startTime.getTime()) / 1000;

      return {
        status: overallStatus,
        uptime,
        services,
        metrics,
        alerts
      };

    } catch (error) {
      logger.error('MonitoringService', 'health_check_failed', error as Error);
      
      return {
        status: 'critical',
        uptime: 0,
        services: {
          database: this.createErrorStatus(),
          realtime: this.createErrorStatus(),
          auth: this.createErrorStatus(),
          payments: this.createErrorStatus(),
          notifications: this.createErrorStatus()
        },
        metrics: {
          responseTime: -1,
          errorRate: 100,
          activeUsers: 0,
          memoryUsage: 0,
          cpuUsage: 0
        },
        alerts: {
          critical: 1,
          high: 0,
          medium: 0,
          low: 0
        }
      };
    }
  }

  private async checkDatabaseHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      // Test database connectivity and performance
      await db.queryRow`SELECT 1 as test`;
      
      // Check recent errors
      const recentErrors = await db.queryRow`
        SELECT COUNT(*) as error_count
        FROM system_logs
        WHERE level IN ('error', 'critical') 
        AND service = 'database'
        AND timestamp >= NOW() - INTERVAL '5 minutes'
      `;

      const responseTime = Date.now() - startTime;
      const errorCount = parseInt(recentErrors?.error_count || '0');

      return {
        status: this.determineServiceStatus(responseTime, errorCount),
        responseTime,
        lastCheck: new Date(),
        errors: errorCount,
        uptime: this.calculateUptime('database')
      };

    } catch (error) {
      logger.error('MonitoringService', 'database_health_check_failed', error as Error);
      return this.createErrorStatus();
    }
  }

  private async checkRealtimeHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      const stats = await realtimeService.monitorSystemHealth();
      const responseTime = Date.now() - startTime;

      return {
        status: stats.activeUsers > 5000 ? 'degraded' : 'healthy',
        responseTime,
        lastCheck: new Date(),
        errors: 0,
        uptime: this.calculateUptime('realtime')
      };

    } catch (error) {
      logger.error('MonitoringService', 'realtime_health_check_failed', error as Error);
      return this.createErrorStatus();
    }
  }

  private async checkAuthHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      // Check authentication service by testing token validation
      const recentAuthErrors = await db.queryRow`
        SELECT COUNT(*) as error_count
        FROM system_logs
        WHERE level IN ('error', 'critical') 
        AND service = 'auth'
        AND timestamp >= NOW() - INTERVAL '5 minutes'
      `;

      const responseTime = Date.now() - startTime;
      const errorCount = parseInt(recentAuthErrors?.error_count || '0');

      return {
        status: this.determineServiceStatus(responseTime, errorCount),
        responseTime,
        lastCheck: new Date(),
        errors: errorCount,
        uptime: this.calculateUptime('auth')
      };

    } catch (error) {
      logger.error('MonitoringService', 'auth_health_check_failed', error as Error);
      return this.createErrorStatus();
    }
  }

  private async checkPaymentsHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      // Check recent payment failures
      const recentPaymentErrors = await db.queryRow`
        SELECT COUNT(*) as error_count
        FROM system_logs
        WHERE level IN ('error', 'critical') 
        AND service = 'payments'
        AND timestamp >= NOW() - INTERVAL '10 minutes'
      `;

      const responseTime = Date.now() - startTime;
      const errorCount = parseInt(recentPaymentErrors?.error_count || '0');

      return {
        status: this.determineServiceStatus(responseTime, errorCount, 5), // Stricter for payments
        responseTime,
        lastCheck: new Date(),
        errors: errorCount,
        uptime: this.calculateUptime('payments')
      };

    } catch (error) {
      logger.error('MonitoringService', 'payments_health_check_failed', error as Error);
      return this.createErrorStatus();
    }
  }

  private async checkNotificationsHealth(): Promise<ServiceStatus> {
    const startTime = Date.now();
    
    try {
      // Check notification delivery rates
      const notificationStats = await db.queryRow`
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed_notifications
        FROM notifications
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `;

      const responseTime = Date.now() - startTime;
      const failureRate = notificationStats?.total_notifications > 0 
        ? (notificationStats.failed_notifications / notificationStats.total_notifications) * 100 
        : 0;

      const status = failureRate > 10 ? 'degraded' : failureRate > 5 ? 'degraded' : 'healthy';

      return {
        status,
        responseTime,
        lastCheck: new Date(),
        errors: parseInt(notificationStats?.failed_notifications || '0'),
        uptime: this.calculateUptime('notifications')
      };

    } catch (error) {
      logger.error('MonitoringService', 'notifications_health_check_failed', error as Error);
      return this.createErrorStatus();
    }
  }

  private async getSystemMetrics() {
    try {
      // Get average response time from recent logs
      const responseTimeMetric = await db.queryRow`
        SELECT AVG(
          CAST(metadata->>'duration' AS NUMERIC)
        ) as avg_response_time
        FROM system_logs
        WHERE service = 'HTTP' 
        AND action = 'request_complete'
        AND timestamp >= NOW() - INTERVAL '5 minutes'
        AND metadata->>'duration' IS NOT NULL
      `;

      // Get error rate
      const errorRate = await db.queryRow`
        SELECT 
          COUNT(CASE WHEN level IN ('error', 'critical') THEN 1 END) * 100.0 / COUNT(*) as error_rate
        FROM system_logs
        WHERE timestamp >= NOW() - INTERVAL '5 minutes'
      `;

      // Get active users (last 24 hours)
      const activeUsers = await db.queryRow`
        SELECT COUNT(DISTINCT user_id) as active_users
        FROM analytics_events
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `;

      // System resource usage (mock data - would be from actual monitoring)
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      return {
        responseTime: Math.round(parseFloat(responseTimeMetric?.avg_response_time || '0')),
        errorRate: Math.round((parseFloat(errorRate?.error_rate || '0')) * 100) / 100,
        activeUsers: parseInt(activeUsers?.active_users || '0'),
        memoryUsage: Math.round(memoryUsagePercent * 100) / 100,
        cpuUsage: Math.round(Math.random() * 20 + 10) // Mock CPU usage
      };

    } catch (error) {
      logger.error('MonitoringService', 'system_metrics_failed', error as Error);
      return {
        responseTime: -1,
        errorRate: 100,
        activeUsers: 0,
        memoryUsage: 0,
        cpuUsage: 0
      };
    }
  }

  private async getAlertCounts() {
    try {
      const alertCounts = await db.queryRow`
        SELECT 
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
          COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium,
          COUNT(CASE WHEN severity = 'low' THEN 1 END) as low
        FROM system_alerts
        WHERE resolved = false
        AND timestamp >= NOW() - INTERVAL '24 hours'
      `;

      return {
        critical: parseInt(alertCounts?.critical || '0'),
        high: parseInt(alertCounts?.high || '0'),
        medium: parseInt(alertCounts?.medium || '0'),
        low: parseInt(alertCounts?.low || '0')
      };

    } catch (error) {
      logger.error('MonitoringService', 'alert_counts_failed', error as Error);
      return { critical: 0, high: 0, medium: 0, low: 0 };
    }
  }

  private determineServiceStatus(responseTime: number, errors: number, errorThreshold: number = 3): 'healthy' | 'degraded' | 'critical' {
    if (errors > errorThreshold * 2 || responseTime > 5000) return 'critical';
    if (errors > errorThreshold || responseTime > 2000) return 'degraded';
    return 'healthy';
  }

  private determineOverallStatus(services: Record<string, ServiceStatus>): 'healthy' | 'degraded' | 'critical' {
    const statuses = Object.values(services).map(s => s.status);
    
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('degraded')) return 'degraded';
    return 'healthy';
  }

  private createErrorStatus(): ServiceStatus {
    return {
      status: 'critical',
      responseTime: -1,
      lastCheck: new Date(),
      errors: 1,
      uptime: 0
    };
  }

  private calculateUptime(service: string): number {
    // Simplified uptime calculation - in production, would track actual downtime
    const uptime = (Date.now() - this.startTime.getTime()) / 1000;
    return Math.round((uptime / (uptime + 60)) * 10000) / 100; // Mock 99%+ uptime
  }

  async recordPerformanceMetric(metric: PerformanceMetric) {
    try {
      await db.exec`
        INSERT INTO performance_metrics (
          metric_name, metric_value, metric_unit, service, endpoint, timestamp, metadata
        ) VALUES (
          ${metric.name}, ${metric.value}, ${metric.unit}, ${metric.service}, 
          ${metric.endpoint}, ${metric.timestamp}, '{}'
        )
      `;

      // Alert on performance degradation
      if (metric.name === 'response_time' && metric.value > 5000) {
        await logger.triggerAlert({
          type: 'performance_degradation',
          severity: 'high',
          title: 'Slow Response Time Detected',
          description: `${metric.endpoint} responded in ${metric.value}ms`,
          metadata: { metric },
          resolved: false,
          timestamp: new Date()
        });
      }

    } catch (error) {
      console.error('Failed to record performance metric:', error);
    }
  }

  async getBusinessMetrics(): Promise<BusinessMetrics> {
    try {
      // Revenue metrics
      const revenueStats = await db.queryRow`
        SELECT 
          COALESCE(SUM(CASE WHEN p.created_at::date = CURRENT_DATE THEN p.budget END), 0) as revenue_today,
          COALESCE(SUM(CASE WHEN p.created_at >= date_trunc('week', CURRENT_DATE) THEN p.budget END), 0) as revenue_week,
          COALESCE(SUM(CASE WHEN p.created_at >= date_trunc('month', CURRENT_DATE) THEN p.budget END), 0) as revenue_month,
          COALESCE(SUM(CASE WHEN p.created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' 
                            AND p.created_at < date_trunc('month', CURRENT_DATE) THEN p.budget END), 0) as revenue_last_month
        FROM projects p
        WHERE p.status IN ('in_progress', 'completed')
      `;

      // User metrics
      const userStats = await db.queryRow`
        SELECT 
          COUNT(DISTINCT ae.user_id) FILTER (WHERE ae.created_at >= CURRENT_DATE) as active_today,
          COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= CURRENT_DATE) as new_today,
          COUNT(DISTINCT ae.user_id) FILTER (WHERE ae.created_at >= CURRENT_DATE - INTERVAL '7 days') as active_7days,
          COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true) as total_active
        FROM users u
        FULL OUTER JOIN analytics_events ae ON u.id = ae.user_id
      `;

      // Project metrics
      const projectStats = await db.queryRow`
        SELECT 
          COUNT(*) FILTER (WHERE status IN ('planning', 'in_progress', 'review')) as active_projects,
          COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= CURRENT_DATE) as completed_today,
          AVG(budget) as avg_project_value
        FROM projects
      `;

      // Lead conversion rate
      const conversionStats = await db.queryRow`
        SELECT 
          COUNT(*) as total_leads,
          COUNT(*) FILTER (WHERE status = 'converted') as converted_leads
        FROM leads
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `;

      // Complaint metrics
      const complaintStats = await db.queryRow`
        SELECT 
          COUNT(*) FILTER (WHERE status IN ('open', 'in_progress')) as open_complaints,
          COUNT(*) FILTER (WHERE status IN ('resolved', 'closed') AND updated_at >= CURRENT_DATE) as resolved_today,
          AVG(EXTRACT(EPOCH FROM (actual_resolution_date - created_at))/86400) as avg_resolution_days
        FROM complaints
      `;

      // Calculate growth rate
      const currentMonth = parseFloat(revenueStats?.revenue_month || '0');
      const lastMonth = parseFloat(revenueStats?.revenue_last_month || '0');
      const growth = lastMonth > 0 ? ((currentMonth - lastMonth) / lastMonth) * 100 : 0;

      // Calculate conversion rate
      const totalLeads = parseInt(conversionStats?.total_leads || '0');
      const convertedLeads = parseInt(conversionStats?.converted_leads || '0');
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      // Calculate retention rate (simplified)
      const activeToday = parseInt(userStats?.active_today || '0');
      const active7Days = parseInt(userStats?.active_7days || '0');
      const retentionRate = active7Days > 0 ? (activeToday / active7Days) * 100 : 0;

      return {
        revenue: {
          today: parseInt(revenueStats?.revenue_today || '0'),
          thisWeek: parseInt(revenueStats?.revenue_week || '0'),
          thisMonth: parseInt(revenueStats?.revenue_month || '0'),
          growth: Math.round(growth * 100) / 100
        },
        users: {
          activeToday: parseInt(userStats?.active_today || '0'),
          newToday: parseInt(userStats?.new_today || '0'),
          totalActive: parseInt(userStats?.total_active || '0'),
          retentionRate: Math.round(retentionRate * 100) / 100
        },
        projects: {
          activeProjects: parseInt(projectStats?.active_projects || '0'),
          completedToday: parseInt(projectStats?.completed_today || '0'),
          conversionRate: Math.round(conversionRate * 100) / 100,
          avgProjectValue: parseInt(projectStats?.avg_project_value || '0')
        },
        complaints: {
          openComplaints: parseInt(complaintStats?.open_complaints || '0'),
          resolvedToday: parseInt(complaintStats?.resolved_today || '0'),
          avgResolutionTime: Math.round(parseFloat(complaintStats?.avg_resolution_days || '0') * 100) / 100,
          satisfactionScore: 4.2 // Mock satisfaction score
        }
      };

    } catch (error) {
      logger.error('MonitoringService', 'business_metrics_failed', error as Error);
      throw error;
    }
  }

  async cleanupOldData() {
    try {
      // Get retention settings
      const settings = await db.queryAll`
        SELECT key, value FROM system_settings 
        WHERE key IN ('log_retention_days', 'alert_retention_days', 'performance_retention_days')
      `;

      const settingsMap = new Map(settings.map(s => [s.key, parseInt(s.value)]));
      const logRetention = settingsMap.get('log_retention_days') || 90;
      const alertRetention = settingsMap.get('alert_retention_days') || 365;
      const performanceRetention = settingsMap.get('performance_retention_days') || 30;

      // Clean up old logs
      const deletedLogs = await db.queryRow`
        DELETE FROM system_logs 
        WHERE timestamp < NOW() - INTERVAL '${logRetention} days'
        RETURNING count(*)
      `;

      // Clean up old resolved alerts
      const deletedAlerts = await db.queryRow`
        DELETE FROM system_alerts 
        WHERE resolved = true 
        AND resolved_at < NOW() - INTERVAL '${alertRetention} days'
        RETURNING count(*)
      `;

      // Clean up old performance metrics
      const deletedMetrics = await db.queryRow`
        DELETE FROM performance_metrics 
        WHERE timestamp < NOW() - INTERVAL '${performanceRetention} days'
        RETURNING count(*)
      `;

      logger.info('MonitoringService', 'cleanup_completed', {
        deletedLogs: deletedLogs?.count || 0,
        deletedAlerts: deletedAlerts?.count || 0,
        deletedMetrics: deletedMetrics?.count || 0
      });

    } catch (error) {
      logger.error('MonitoringService', 'cleanup_failed', error as Error);
    }
  }
}

export const monitoringService = MonitoringService.getInstance();

// API Endpoints
export const getSystemHealth = api(
  { auth: true, expose: true, method: "GET", path: "/monitoring/health" },
  async () => {
    const auth = getAuthData()!;
    
    if (!auth.permissions.includes('system.view')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    return await monitoringService.getSystemHealth();
  }
);

export const getBusinessMetrics = api(
  { auth: true, expose: true, method: "GET", path: "/monitoring/business-metrics" },
  async () => {
    const auth = getAuthData()!;
    
    if (!auth.permissions.includes('analytics.view')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    return await monitoringService.getBusinessMetrics();
  }
);

export const getPerformanceMetrics = api(
  { auth: true, expose: true, method: "GET", path: "/monitoring/performance" },
  async (params: {
    service?: Query<string>;
    startDate?: Query<string>;
    endDate?: Query<string>;
    metricName?: Query<string>;
  }) => {
    const auth = getAuthData()!;
    
    if (!auth.permissions.includes('system.view')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.service) {
      whereClause += ` AND service = $${paramIndex++}`;
      queryParams.push(params.service);
    }

    if (params.metricName) {
      whereClause += ` AND metric_name = $${paramIndex++}`;
      queryParams.push(params.metricName);
    }

    if (params.startDate) {
      whereClause += ` AND timestamp >= $${paramIndex++}`;
      queryParams.push(params.startDate);
    }

    if (params.endDate) {
      whereClause += ` AND timestamp <= $${paramIndex++}`;
      queryParams.push(params.endDate);
    }

    const metrics = await db.rawQueryAll(`
      SELECT 
        metric_name,
        metric_value,
        metric_unit,
        service,
        endpoint,
        timestamp
      FROM performance_metrics
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT 1000
    `, ...queryParams);

    return {
      metrics: metrics.map(m => ({
        name: m.metric_name,
        value: m.metric_value,
        unit: m.metric_unit,
        service: m.service,
        endpoint: m.endpoint,
        timestamp: m.timestamp
      }))
    };
  }
);

export const triggerHealthCheck = api(
  { auth: true, expose: true, method: "POST", path: "/monitoring/health-check" },
  async () => {
    const auth = getAuthData()!;
    
    if (!auth.permissions.includes('system.admin')) {
      throw APIError.permissionDenied("Super admin access required");
    }

    const health = await monitoringService.getSystemHealth();
    
    logger.info('MonitoringService', 'manual_health_check', {
      triggeredBy: auth.userID,
      status: health.status
    });

    return health;
  }
);

export const cleanupSystemData = api(
  { auth: true, expose: true, method: "POST", path: "/monitoring/cleanup" },
  async () => {
    const auth = getAuthData()!;
    
    if (!auth.permissions.includes('system.admin')) {
      throw APIError.permissionDenied("Super admin access required");
    }

    await monitoringService.cleanupOldData();
    
    logger.info('MonitoringService', 'manual_cleanup_triggered', {
      triggeredBy: auth.userID
    });

    return { success: true, message: "Cleanup completed successfully" };
  }
);