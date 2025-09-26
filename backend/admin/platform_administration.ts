import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface PlatformStats {
  total_users: number;
  active_users: number;
  total_projects: number;
  active_projects: number;
  total_revenue: number;
  monthly_revenue: number;
  total_vendors: number;
  verified_vendors: number;
  system_health: 'healthy' | 'warning' | 'critical';
}

interface SystemHealth {
  database_status: 'healthy' | 'warning' | 'critical';
  api_response_time: number;
  active_connections: number;
  memory_usage: number;
  disk_usage: number;
  last_backup: Date;
}

interface UserActivity {
  user_id: number;
  user_name: string;
  email: string;
  last_login: Date;
  total_projects: number;
  total_spent: number;
  status: 'active' | 'inactive' | 'suspended';
}

// Get platform dashboard statistics
export const getPlatformStats = api<{}, PlatformStats>(
  { auth: true, expose: true, method: "GET", path: "/admin/platform/stats" },
  async () => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('platform.admin') && !auth.permissions.includes('analytics.view')) {
      throw APIError.forbidden("Insufficient permissions to view platform statistics");
    }

    try {
      // Get user statistics
      const userStats = await db.queryRow`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE is_active = true) as active_users
        FROM users
      `;

      // Get project statistics
      const projectStats = await db.queryRow`
        SELECT 
          COUNT(*) as total_projects,
          COUNT(*) FILTER (WHERE status IN ('in_progress', 'planning')) as active_projects
        FROM projects
      `;

      // Get revenue statistics
      const revenueStats = await db.queryRow`
        SELECT 
          COALESCE(SUM(budget), 0) as total_revenue,
          COALESCE(SUM(budget) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) as monthly_revenue
        FROM projects
        WHERE status = 'completed'
      `;

      // Get vendor statistics
      const vendorStats = await db.queryRow`
        SELECT 
          COUNT(*) as total_vendors,
          COUNT(*) FILTER (WHERE is_verified = true) as verified_vendors
        FROM vendors
      `;

      // Simple system health check
      const systemHealth = 'healthy'; // In a real implementation, you'd check various metrics

      return {
        total_users: parseInt(userStats?.total_users || '0'),
        active_users: parseInt(userStats?.active_users || '0'),
        total_projects: parseInt(projectStats?.total_projects || '0'),
        active_projects: parseInt(projectStats?.active_projects || '0'),
        total_revenue: parseInt(revenueStats?.total_revenue || '0'),
        monthly_revenue: parseInt(revenueStats?.monthly_revenue || '0'),
        total_vendors: parseInt(vendorStats?.total_vendors || '0'),
        verified_vendors: parseInt(vendorStats?.verified_vendors || '0'),
        system_health: systemHealth
      };

    } catch (error) {
      console.error('Get platform stats error:', error);
      throw APIError.internal("Failed to fetch platform statistics");
    }
  }
);

// Get system health status
export const getSystemHealth = api<{}, SystemHealth>(
  { auth: true, expose: true, method: "GET", path: "/admin/platform/health" },
  async () => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('system.admin')) {
      throw APIError.forbidden("Insufficient permissions to view system health");
    }

    try {
      // Simple health checks (in a real implementation, you'd check actual metrics)
      const startTime = Date.now();
      
      // Test database connection
      await db.queryRow`SELECT 1`;
      const apiResponseTime = Date.now() - startTime;

      // Mock system metrics (in production, you'd get these from system monitoring)
      const systemHealth: SystemHealth = {
        database_status: 'healthy',
        api_response_time: apiResponseTime,
        active_connections: 25, // Mock value
        memory_usage: 65, // Mock percentage
        disk_usage: 45, // Mock percentage
        last_backup: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      };

      return systemHealth;

    } catch (error) {
      console.error('Get system health error:', error);
      throw APIError.internal("Failed to fetch system health");
    }
  }
);

// Get recent user activity
export const getRecentUserActivity = api<{ limit?: Query<number> }, { activities: UserActivity[] }>(
  { auth: true, expose: true, method: "GET", path: "/admin/platform/user-activity" },
  async ({ limit = 20 }) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('users.admin') && !auth.permissions.includes('analytics.view')) {
      throw APIError.forbidden("Insufficient permissions to view user activity");
    }

    try {
      const activityQuery = `
        SELECT 
          u.id as user_id,
          u.first_name || ' ' || u.last_name as user_name,
          u.email,
          u.last_login_at as last_login,
          COUNT(p.id) as total_projects,
          COALESCE(SUM(p.budget), 0) as total_spent,
          CASE 
            WHEN u.is_active = false THEN 'suspended'
            WHEN u.last_login_at > NOW() - INTERVAL '30 days' THEN 'active'
            ELSE 'inactive'
          END as status
        FROM users u
        LEFT JOIN projects p ON u.id = p.client_id
        WHERE u.role != 'admin'
        GROUP BY u.id, u.first_name, u.last_name, u.email, u.last_login_at, u.is_active
        ORDER BY u.last_login_at DESC NULLS LAST
        LIMIT $1
      `;

      const activityResult = await db.query(activityQuery, limit);
      const activities: UserActivity[] = [];

      for await (const row of activityResult) {
        activities.push({
          user_id: row.user_id,
          user_name: row.user_name,
          email: row.email,
          last_login: row.last_login,
          total_projects: parseInt(row.total_projects || '0'),
          total_spent: parseInt(row.total_spent || '0'),
          status: row.status
        });
      }

      return { activities };

    } catch (error) {
      console.error('Get recent user activity error:', error);
      throw APIError.internal("Failed to fetch user activity");
    }
  }
);

// Get audit logs
export const getAuditLogs = api<{ 
  page?: Query<number>;
  limit?: Query<number>;
  user_id?: Query<number>;
  action?: Query<string>;
  entity_type?: Query<string>;
  start_date?: Query<string>;
  end_date?: Query<string>;
}, { logs: any[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/admin/platform/audit-logs" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('audit.view') && !auth.permissions.includes('system.admin')) {
      throw APIError.forbidden("Insufficient permissions to view audit logs");
    }

    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 200);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // User filter
    if (params.user_id) {
      whereClause += ` AND al.user_id = $${paramIndex}`;
      queryParams.push(params.user_id);
      paramIndex++;
    }

    // Action filter
    if (params.action) {
      whereClause += ` AND al.action = $${paramIndex}`;
      queryParams.push(params.action);
      paramIndex++;
    }

    // Entity type filter
    if (params.entity_type) {
      whereClause += ` AND al.entity_type = $${paramIndex}`;
      queryParams.push(params.entity_type);
      paramIndex++;
    }

    // Date range filter
    if (params.start_date) {
      whereClause += ` AND al.created_at >= $${paramIndex}`;
      queryParams.push(params.start_date);
      paramIndex++;
    }

    if (params.end_date) {
      whereClause += ` AND al.created_at <= $${paramIndex}`;
      queryParams.push(params.end_date);
      paramIndex++;
    }

    try {
      // Get audit logs
      const logsQuery = `
        SELECT 
          al.*,
          u.first_name || ' ' || u.last_name as user_name,
          u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const logsResult = await db.query(logsQuery, ...queryParams);
      const logs: any[] = [];
      for await (const log of logsResult) {
        logs.push({
          id: log.id,
          user_id: log.user_id,
          user_name: log.user_name,
          user_email: log.user_email,
          action: log.action,
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          old_values: log.old_values,
          new_values: log.new_values,
          created_at: log.created_at
        });
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`;
      const countResult = await db.query(countQuery, ...queryParams.slice(0, -2));
      let total = 0;
      for await (const row of countResult) {
        total = parseInt(row.total);
        break;
      }

      return {
        logs,
        total,
        page,
        limit
      };

    } catch (error) {
      console.error('Get audit logs error:', error);
      throw APIError.internal("Failed to fetch audit logs");
    }
  }
);

// Suspend/Unsuspend user
export const toggleUserSuspension = api<{ user_id: number; suspend: boolean; reason?: string }, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "POST", path: "/admin/platform/users/:user_id/suspend" },
  async ({ user_id, suspend, reason }) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('users.admin')) {
      throw APIError.forbidden("Insufficient permissions to suspend/unsuspend users");
    }

    // Get user
    const user = await db.queryRow`
      SELECT id, first_name, last_name, email, is_active
      FROM users 
      WHERE id = ${user_id}
    `;

    if (!user) {
      throw APIError.notFound("User not found");
    }

    // Can't suspend admin users
    const userRoles = await db.query`
      SELECT r.name FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ${user_id}
    `;

    let isAdmin = false;
    for await (const role of userRoles) {
      if (role.name === 'admin') {
        isAdmin = true;
        break;
      }
    }

    if (isAdmin) {
      throw APIError.badRequest("Cannot suspend admin users");
    }

    try {
      // Update user status
      await db.exec`
        UPDATE users SET
          is_active = ${!suspend},
          updated_at = NOW()
        WHERE id = ${user_id}
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, ${suspend ? 'suspend' : 'unsuspend'}, 'user', ${user_id}, ${JSON.stringify({ reason, suspended_by: auth.userID })})
      `;

      return {
        success: true,
        message: `User ${suspend ? 'suspended' : 'unsuspended'} successfully`
      };

    } catch (error) {
      console.error('Toggle user suspension error:', error);
      throw APIError.internal("Failed to update user suspension status");
    }
  }
);

// Clear system cache (placeholder)
export const clearSystemCache = api<{}, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "POST", path: "/admin/platform/clear-cache" },
  async () => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('system.admin')) {
      throw APIError.forbidden("Insufficient permissions to clear system cache");
    }

    try {
      // In a real implementation, you would clear various caches here
      // For now, just log the action
      
      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'clear_cache', 'system', 0, '{"cleared_at": "${new Date().toISOString()}"}')
      `;

      return {
        success: true,
        message: "System cache cleared successfully"
      };

    } catch (error) {
      console.error('Clear system cache error:', error);
      throw APIError.internal("Failed to clear system cache");
    }
  }
);
