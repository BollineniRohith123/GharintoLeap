import { api, APIError } from "encore.dev/api";
import { getAuthData } from "../auth/auth";
import { db } from "../db/database";

// System metrics tracking
interface SystemMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
}

interface AlertRule {
  id: number;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  notificationChannels: string[];
}

interface Alert {
  id: number;
  ruleId: number;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledgedBy?: number;
}

// Real-time system monitoring
export const getSystemMetrics = api<void, {
  current: SystemMetrics;
  history: SystemMetrics[];
  alerts: Alert[];
}>(
  { auth: true, expose: true, method: "GET", path: "/monitoring/metrics" },
  async () => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('system.monitor')) {
      throw APIError.permissionDenied("Insufficient permissions to view system metrics");
    }

    try {
      // Get current system metrics
      const currentMetrics = await getCurrentSystemMetrics();
      
      // Get historical metrics (last 24 hours)
      const historyMetrics = await db.queryAll`
        SELECT * FROM system_metrics 
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        ORDER BY timestamp DESC
        LIMIT 288
      `;

      // Get active alerts
      const activeAlerts = await db.queryAll`
        SELECT 
          a.*,
          ar.name as rule_name,
          ar.metric,
          ar.threshold,
          ar.severity
        FROM alerts a
        JOIN alert_rules ar ON a.rule_id = ar.id
        WHERE a.status = 'active'
        ORDER BY a.triggered_at DESC
      `;

      return {
        current: currentMetrics,
        history: historyMetrics.map(m => ({
          timestamp: m.timestamp,
          cpuUsage: m.cpu_usage,
          memoryUsage: m.memory_usage,
          diskUsage: m.disk_usage,
          activeConnections: m.active_connections,
          requestsPerMinute: m.requests_per_minute,
          averageResponseTime: m.average_response_time,
          errorRate: m.error_rate
        })),
        alerts: activeAlerts.map(a => ({
          id: a.id,
          ruleId: a.rule_id,
          ruleName: a.rule_name,
          metric: a.metric,
          currentValue: a.current_value,
          threshold: a.threshold,
          severity: a.severity,
          status: a.status,
          triggeredAt: a.triggered_at,
          resolvedAt: a.resolved_at,
          acknowledgedBy: a.acknowledged_by
        }))
      };

    } catch (error) {
      console.error('System metrics error:', error);
      throw APIError.internal("Failed to retrieve system metrics");
    }
  }
);

// Business metrics monitoring
export const getBusinessMetrics = api<{
  dateFrom?: string;
  dateTo?: string;
}, {
  summary: {
    totalUsers: number;
    activeUsers: number;
    totalLeads: number;
    convertedLeads: number;
    totalProjects: number;
    completedProjects: number;
    totalRevenue: number;
    averageProjectValue: number;
  };
  trends: {
    userGrowth: Array<{ date: string; count: number }>;
    leadConversion: Array<{ date: string; leads: number; conversions: number }>;
    revenue: Array<{ date: string; amount: number }>;
  };
}>(
  { auth: true, expose: true, method: "GET", path: "/monitoring/business-metrics" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('analytics.view')) {
      throw APIError.permissionDenied("Insufficient permissions to view business metrics");
    }

    const dateFrom = params.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = params.dateTo || new Date().toISOString().split('T')[0];

    try {
      // Summary metrics
      const summary = await db.queryRow`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
          (SELECT COUNT(*) FROM users WHERE is_active = true AND last_login >= NOW() - INTERVAL '30 days') as active_users,
          (SELECT COUNT(*) FROM leads WHERE created_at >= ${dateFrom} AND created_at <= ${dateTo}) as total_leads,
          (SELECT COUNT(*) FROM leads WHERE status = 'converted' AND created_at >= ${dateFrom} AND created_at <= ${dateTo}) as converted_leads,
          (SELECT COUNT(*) FROM projects WHERE created_at >= ${dateFrom} AND created_at <= ${dateTo}) as total_projects,
          (SELECT COUNT(*) FROM projects WHERE status = 'completed' AND created_at >= ${dateFrom} AND created_at <= ${dateTo}) as completed_projects,
          (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'credit' AND created_at >= ${dateFrom} AND created_at <= ${dateTo}) as total_revenue,
          (SELECT COALESCE(AVG(budget), 0) FROM projects WHERE created_at >= ${dateFrom} AND created_at <= ${dateTo}) as average_project_value
      `;

      // User growth trend
      const userGrowth = await db.queryAll`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM users 
        WHERE created_at >= ${dateFrom} AND created_at <= ${dateTo}
        GROUP BY DATE(created_at)
        ORDER BY date
      `;

      // Lead conversion trend
      const leadConversion = await db.queryAll`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as leads,
          COUNT(CASE WHEN status = 'converted' THEN 1 END) as conversions
        FROM leads 
        WHERE created_at >= ${dateFrom} AND created_at <= ${dateTo}
        GROUP BY DATE(created_at)
        ORDER BY date
      `;

      // Revenue trend
      const revenue = await db.queryAll`
        SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(amount), 0) as amount
        FROM transactions 
        WHERE type = 'credit' AND created_at >= ${dateFrom} AND created_at <= ${dateTo}
        GROUP BY DATE(created_at)
        ORDER BY date
      `;

      return {
        summary: {
          totalUsers: parseInt(summary?.total_users || '0'),
          activeUsers: parseInt(summary?.active_users || '0'),
          totalLeads: parseInt(summary?.total_leads || '0'),
          convertedLeads: parseInt(summary?.converted_leads || '0'),
          totalProjects: parseInt(summary?.total_projects || '0'),
          completedProjects: parseInt(summary?.completed_projects || '0'),
          totalRevenue: parseFloat(summary?.total_revenue || '0'),
          averageProjectValue: parseFloat(summary?.average_project_value || '0')
        },
        trends: {
          userGrowth: userGrowth.map(ug => ({
            date: ug.date,
            count: parseInt(ug.count)
          })),
          leadConversion: leadConversion.map(lc => ({
            date: lc.date,
            leads: parseInt(lc.leads),
            conversions: parseInt(lc.conversions)
          })),
          revenue: revenue.map(r => ({
            date: r.date,
            amount: parseFloat(r.amount)
          }))
        }
      };

    } catch (error) {
      console.error('Business metrics error:', error);
      throw APIError.internal("Failed to retrieve business metrics");
    }
  }
);

// Alert management
export const createAlertRule = api<{
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notificationChannels: string[];
}, { ruleId: number }>(
  { auth: true, expose: true, method: "POST", path: "/monitoring/alert-rules" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('system.manage')) {
      throw APIError.permissionDenied("Insufficient permissions to create alert rules");
    }

    try {
      const rule = await db.queryRow`
        INSERT INTO alert_rules (
          name, metric, operator, threshold, duration, severity,
          notification_channels, created_by
        ) VALUES (
          ${req.name}, ${req.metric}, ${req.operator}, ${req.threshold},
          ${req.duration}, ${req.severity}, ${req.notificationChannels}, ${auth.userID}
        ) RETURNING id
      `;

      // Log audit trail
      await db.exec`
        INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id, new_values
        ) VALUES (
          ${auth.userID}, 'alert_rule_created', 'alert_rule', ${rule.id},
          ${JSON.stringify(req)}
        )
      `;

      return { ruleId: rule.id };

    } catch (error) {
      console.error('Alert rule creation error:', error);
      throw APIError.internal("Failed to create alert rule");
    }
  }
);

// Get alert rules
export const getAlertRules = api<void, { rules: AlertRule[] }>(
  { auth: true, expose: true, method: "GET", path: "/monitoring/alert-rules" },
  async () => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('system.monitor')) {
      throw APIError.permissionDenied("Insufficient permissions to view alert rules");
    }

    const rules = await db.queryAll`
      SELECT 
        id, name, metric, operator, threshold, duration, severity,
        notification_channels, is_active, created_at
      FROM alert_rules
      ORDER BY severity DESC, created_at DESC
    `;

    return {
      rules: rules.map(r => ({
        id: r.id,
        name: r.name,
        metric: r.metric,
        operator: r.operator,
        threshold: r.threshold,
        duration: r.duration,
        severity: r.severity,
        isActive: r.is_active,
        notificationChannels: r.notification_channels
      }))
    };
  }
);

// Acknowledge alert
export const acknowledgeAlert = api<{ alertId: number }, { success: boolean }>(
  { auth: true, expose: true, method: "PUT", path: "/monitoring/alerts/:alertId/acknowledge" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('system.monitor')) {
      throw APIError.permissionDenied("Insufficient permissions to acknowledge alerts");
    }

    try {
      await db.exec`
        UPDATE alerts 
        SET status = 'acknowledged', 
            acknowledged_by = ${auth.userID},
            acknowledged_at = NOW()
        WHERE id = ${req.alertId} AND status = 'active'
      `;

      return { success: true };

    } catch (error) {
      console.error('Alert acknowledgment error:', error);
      throw APIError.internal("Failed to acknowledge alert");
    }
  }
);

// Enhanced health check with detailed system status
export const getDetailedHealthCheck = api<void, {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: { status: string; responseTime: number };
    authentication: { status: string; responseTime: number };
    fileStorage: { status: string; responseTime: number };
    notifications: { status: string; responseTime: number };
  };
  metrics: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
  version: string;
}>(
  { auth: false, expose: true, method: "GET", path: "/health/detailed" },
  async () => {
    try {
      const startTime = Date.now();
      
      // Test database connectivity
      const dbStart = Date.now();
      await db.queryRow`SELECT 1 as test`;
      const dbResponseTime = Date.now() - dbStart;
      
      // Test authentication service
      const authStart = Date.now();
      // Simple auth test - this would be more comprehensive in production
      const authResponseTime = Date.now() - authStart;
      
      // Get system metrics
      const metrics = await getCurrentSystemMetrics();
      
      // Determine overall health status
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (dbResponseTime > 1000 || metrics.errorRate > 5) {
        overallStatus = 'degraded';
      }
      
      if (dbResponseTime > 5000 || metrics.errorRate > 20 || metrics.cpuUsage > 90) {
        overallStatus = 'unhealthy';
      }

      return {
        status: overallStatus,
        timestamp: new Date(),
        services: {
          database: {
            status: dbResponseTime < 1000 ? 'healthy' : dbResponseTime < 5000 ? 'degraded' : 'unhealthy',
            responseTime: dbResponseTime
          },
          authentication: {
            status: authResponseTime < 500 ? 'healthy' : 'degraded',
            responseTime: authResponseTime
          },
          fileStorage: {
            status: 'healthy', // Would implement actual file storage check
            responseTime: 50
          },
          notifications: {
            status: 'healthy', // Would implement actual notification service check
            responseTime: 100
          }
        },
        metrics: {
          uptime: process.uptime(),
          memoryUsage: metrics.memoryUsage,
          cpuUsage: metrics.cpuUsage,
          activeConnections: metrics.activeConnections
        },
        version: process.env.APP_VERSION || '1.0.0'
      };

    } catch (error) {
      console.error('Detailed health check error:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        services: {
          database: { status: 'unhealthy', responseTime: -1 },
          authentication: { status: 'unknown', responseTime: -1 },
          fileStorage: { status: 'unknown', responseTime: -1 },
          notifications: { status: 'unknown', responseTime: -1 }
        },
        metrics: {
          uptime: process.uptime(),
          memoryUsage: 0,
          cpuUsage: 0,
          activeConnections: 0
        },
        version: process.env.APP_VERSION || '1.0.0'
      };
    }
  }
);

// Utility function to get current system metrics
async function getCurrentSystemMetrics(): Promise<SystemMetrics> {
  // In a real implementation, these would be actual system metrics
  // For now, we'll simulate some metrics
  const memUsage = process.memoryUsage();
  
  return {
    timestamp: new Date(),
    cpuUsage: Math.random() * 100, // Would use actual CPU monitoring
    memoryUsage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
    diskUsage: Math.random() * 100, // Would use actual disk monitoring
    activeConnections: Math.floor(Math.random() * 100) + 10,
    requestsPerMinute: Math.floor(Math.random() * 1000) + 100,
    averageResponseTime: Math.random() * 500 + 50,
    errorRate: Math.random() * 5
  };
}

// Background task to collect metrics (would be implemented as a cron job)
export const collectSystemMetrics = api<void, { success: boolean }>(
  { auth: true, expose: false, method: "POST", path: "/monitoring/collect-metrics" },
  async () => {
    try {
      const metrics = await getCurrentSystemMetrics();
      
      // Store metrics in database
      await db.exec`
        INSERT INTO system_metrics (
          timestamp, cpu_usage, memory_usage, disk_usage,
          active_connections, requests_per_minute, average_response_time, error_rate
        ) VALUES (
          ${metrics.timestamp}, ${metrics.cpuUsage}, ${metrics.memoryUsage},
          ${metrics.diskUsage}, ${metrics.activeConnections}, ${metrics.requestsPerMinute},
          ${metrics.averageResponseTime}, ${metrics.errorRate}
        )
      `;

      // Check alert rules
      await checkAlertRules(metrics);

      return { success: true };

    } catch (error) {
      console.error('Metrics collection error:', error);
      throw APIError.internal("Failed to collect system metrics");
    }
  }
);

// Check alert rules against current metrics
async function checkAlertRules(metrics: SystemMetrics) {
  const rules = await db.queryAll`
    SELECT * FROM alert_rules WHERE is_active = true
  `;

  for (const rule of rules) {
    const metricValue = getMetricValue(metrics, rule.metric);
    const shouldTrigger = evaluateAlertCondition(metricValue, rule.operator, rule.threshold);

    if (shouldTrigger) {
      // Check if alert already exists
      const existingAlert = await db.queryRow`
        SELECT id FROM alerts 
        WHERE rule_id = ${rule.id} AND status = 'active'
      `;

      if (!existingAlert) {
        // Create new alert
        await db.exec`
          INSERT INTO alerts (
            rule_id, current_value, status, triggered_at
          ) VALUES (
            ${rule.id}, ${metricValue}, 'active', NOW()
          )
        `;

        // Send notifications (would implement actual notification sending)
        console.log(`Alert triggered: ${rule.name} - ${metricValue} ${rule.operator} ${rule.threshold}`);
      }
    }
  }
}

function getMetricValue(metrics: SystemMetrics, metricName: string): number {
  switch (metricName) {
    case 'cpu_usage': return metrics.cpuUsage;
    case 'memory_usage': return metrics.memoryUsage;
    case 'disk_usage': return metrics.diskUsage;
    case 'error_rate': return metrics.errorRate;
    case 'response_time': return metrics.averageResponseTime;
    default: return 0;
  }
}

function evaluateAlertCondition(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case 'gt': return value > threshold;
    case 'gte': return value >= threshold;
    case 'lt': return value < threshold;
    case 'lte': return value <= threshold;
    case 'eq': return value === threshold;
    default: return false;
  }
}
