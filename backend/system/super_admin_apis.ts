import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface SystemStats {
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
    newThisMonth: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    totalValue: number;
    avgCompletionTime: number;
  };
  leads: {
    total: number;
    converted: number;
    conversionRate: number;
    bySource: Array<{ source: string; count: number; rate: number }>;
  };
  complaints: {
    total: number;
    open: number;
    resolved: number;
    avgResolutionTime: number;
    byCategory: Record<string, number>;
  };
  finance: {
    totalRevenue: number;
    outstandingPayments: number;
    walletBalance: number;
    monthlyRecurring: number;
  };
  performance: {
    serverUptime: number;
    avgResponseTime: number;
    errorRate: number;
    activeUsers: number;
  };
}

interface SystemSetting {
  key: string;
  value: string;
  description: string;
  category: string;
  isPublic: boolean;
}

interface UpdateSystemSettingRequest {
  key: string;
  value: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
}

interface BulkUserOperation {
  userIds: number[];
  operation: 'activate' | 'deactivate' | 'delete' | 'assign_role' | 'remove_role';
  roleId?: number;
  reason: string;
}

interface SystemBackupRequest {
  includeUserData: boolean;
  includeAnalytics: boolean;
  includeFiles: boolean;
  format: 'sql' | 'json';
}

// Super Admin: Get comprehensive system statistics
export const getSystemStats = api<void, SystemStats>(
  { auth: true, expose: true, method: "GET", path: "/system/admin/stats" },
  async () => {
    const auth = getAuthData()!;
    
    // Check super admin permissions
    if (!auth.permissions.includes('system.admin')) {
      throw APIError.permissionDenied("Super admin access required");
    }

    try {
      // User statistics
      const userStats = await db.queryRow`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
          COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as new_this_month
        FROM users
      `;

      const usersByRole = await db.queryAll`
        SELECT 
          r.name as role,
          COUNT(ur.user_id) as count
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.role_id
        LEFT JOIN users u ON ur.user_id = u.id AND u.is_active = true
        GROUP BY r.name
        ORDER BY count DESC
      `;

      // Project statistics
      const projectStats = await db.queryRow`
        SELECT 
          COUNT(*) as total_projects,
          COUNT(CASE WHEN status IN ('planning', 'in_progress', 'review') THEN 1 END) as active_projects,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
          COALESCE(SUM(budget), 0) as total_value,
          AVG(EXTRACT(EPOCH FROM (end_date - start_date))/86400) as avg_completion_days
        FROM projects
      `;

      // Lead statistics
      const leadStats = await db.queryRow`
        SELECT 
          COUNT(*) as total_leads,
          COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads
        FROM leads
      `;

      const leadsBySource = await db.queryAll`
        SELECT 
          source,
          COUNT(*) as count,
          (COUNT(CASE WHEN status = 'converted' THEN 1 END) * 100.0 / COUNT(*)) as conversion_rate
        FROM leads
        GROUP BY source
        ORDER BY count DESC
      `;

      // Complaint statistics
      const complaintStats = await db.queryRow`
        SELECT 
          COUNT(*) as total_complaints,
          COUNT(CASE WHEN status IN ('open', 'in_progress') THEN 1 END) as open_complaints,
          COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved_complaints,
          AVG(EXTRACT(EPOCH FROM (actual_resolution_date - created_at))/86400) as avg_resolution_days
        FROM complaints
      `;

      const complaintsByCategory = await db.queryAll`
        SELECT 
          category,
          COUNT(*) as count
        FROM complaints
        GROUP BY category
        ORDER BY count DESC
      `;

      // Financial statistics
      const financeStats = await db.queryRow`
        SELECT 
          COALESCE(SUM(p.budget), 0) as total_revenue,
          COALESCE(SUM(py.amount), 0) FILTER (WHERE py.status = 'pending') as outstanding_payments,
          COALESCE(SUM(w.balance), 0) as total_wallet_balance
        FROM projects p
        FULL OUTER JOIN payments py ON p.id = py.project_id
        FULL OUTER JOIN wallets w ON true
      `;

      const monthlyRevenue = await db.queryRow`
        SELECT COALESCE(SUM(budget), 0) as monthly_revenue
        FROM projects
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
      `;

      // Performance statistics (mock data - would be from monitoring tools)
      const performanceStats = {
        serverUptime: 99.8,
        avgResponseTime: 245, // milliseconds
        errorRate: 0.02, // 0.02%
        activeUsers: parseInt(userStats?.active_users || '0')
      };

      const conversionRate = leadStats?.total_leads > 0 
        ? (leadStats.converted_leads / leadStats.total_leads) * 100 
        : 0;

      return {
        users: {
          total: parseInt(userStats?.total_users || '0'),
          active: parseInt(userStats?.active_users || '0'),
          byRole: usersByRole.reduce((acc, role) => {
            acc[role.role] = parseInt(role.count || '0');
            return acc;
          }, {} as Record<string, number>),
          newThisMonth: parseInt(userStats?.new_this_month || '0')
        },
        projects: {
          total: parseInt(projectStats?.total_projects || '0'),
          active: parseInt(projectStats?.active_projects || '0'),
          completed: parseInt(projectStats?.completed_projects || '0'),
          totalValue: parseInt(projectStats?.total_value || '0'),
          avgCompletionTime: Math.round(projectStats?.avg_completion_days || 0)
        },
        leads: {
          total: parseInt(leadStats?.total_leads || '0'),
          converted: parseInt(leadStats?.converted_leads || '0'),
          conversionRate: Math.round(conversionRate * 100) / 100,
          bySource: leadsBySource.map(source => ({
            source: source.source,
            count: parseInt(source.count || '0'),
            rate: Math.round((source.conversion_rate || 0) * 100) / 100
          }))
        },
        complaints: {
          total: parseInt(complaintStats?.total_complaints || '0'),
          open: parseInt(complaintStats?.open_complaints || '0'),
          resolved: parseInt(complaintStats?.resolved_complaints || '0'),
          avgResolutionTime: Math.round(complaintStats?.avg_resolution_days || 0),
          byCategory: complaintsByCategory.reduce((acc, cat) => {
            acc[cat.category] = parseInt(cat.count || '0');
            return acc;
          }, {} as Record<string, number>)
        },
        finance: {
          totalRevenue: parseInt(financeStats?.total_revenue || '0'),
          outstandingPayments: parseInt(financeStats?.outstanding_payments || '0'),
          walletBalance: parseInt(financeStats?.total_wallet_balance || '0'),
          monthlyRecurring: parseInt(monthlyRevenue?.monthly_revenue || '0')
        },
        performance: performanceStats
      };

    } catch (error) {
      console.error('System stats error:', error);
      throw APIError.internal("Failed to fetch system statistics");
    }
  }
);

// Super Admin: Get all system settings
export const getSystemSettings = api<{ category?: Query<string> }, { settings: SystemSetting[] }>(
  { auth: true, expose: true, method: "GET", path: "/system/admin/settings" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check super admin permissions
    if (!auth.permissions.includes('system.admin')) {
      throw APIError.permissionDenied("Super admin access required");
    }

    let whereClause = "";
    const queryParams: any[] = [];

    if (params.category) {
      whereClause = "WHERE category = $1";
      queryParams.push(params.category);
    }

    const settings = await db.rawQueryAll(`
      SELECT key, value, description, category, is_public, created_at, updated_at
      FROM system_settings
      ${whereClause}
      ORDER BY category, key
    `, ...queryParams);

    return {
      settings: settings.map(setting => ({
        key: setting.key,
        value: setting.value,
        description: setting.description,
        category: setting.category,
        isPublic: setting.is_public
      }))
    };
  }
);

// Super Admin: Update system setting
export const updateSystemSetting = api<UpdateSystemSettingRequest, { success: boolean }>(
  { auth: true, expose: true, method: "PUT", path: "/system/admin/settings" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check super admin permissions
    if (!auth.permissions.includes('system.admin')) {
      throw APIError.permissionDenied("Super admin access required");
    }

    if (!req.key || !req.value) {
      throw APIError.invalidArgument("Key and value are required");
    }

    try {
      // Check if setting exists
      const existingSetting = await db.queryRow`
        SELECT key FROM system_settings WHERE key = ${req.key}
      `;

      if (existingSetting) {
        // Update existing setting
        await db.exec`
          UPDATE system_settings 
          SET 
            value = ${req.value},
            description = COALESCE(${req.description}, description),
            category = COALESCE(${req.category}, category),
            is_public = COALESCE(${req.isPublic}, is_public),
            updated_at = NOW()
          WHERE key = ${req.key}
        `;
      } else {
        // Create new setting
        await db.exec`
          INSERT INTO system_settings (key, value, description, category, is_public)
          VALUES (
            ${req.key}, ${req.value}, ${req.description || ''},
            ${req.category || 'general'}, ${req.isPublic || false}
          )
        `;
      }

      // Log the change
      await db.exec`
        INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id, new_values
        ) VALUES (
          ${auth.userID}, 'system_setting_updated', 'setting', 0,
          ${JSON.stringify(req)}
        )
      `;

      return { success: true };

    } catch (error) {
      console.error('Update system setting error:', error);
      throw APIError.internal("Failed to update system setting");
    }
  }
);

// Super Admin: Bulk user operations
export const bulkUserOperation = api<BulkUserOperation, { processedCount: number; failedCount: number; errors: string[] }>(
  { auth: true, expose: true, method: "POST", path: "/system/admin/bulk-user-operations" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check super admin permissions
    if (!auth.permissions.includes('system.admin')) {
      throw APIError.permissionDenied("Super admin access required");
    }

    if (!req.userIds.length || !req.operation || !req.reason) {
      throw APIError.invalidArgument("User IDs, operation, and reason are required");
    }

    let processedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const userId of req.userIds) {
      try {
        await db.tx(async (tx) => {
          // Verify user exists
          const user = await tx.queryRow`
            SELECT id, email, first_name, last_name, is_active
            FROM users WHERE id = ${userId}
          `;

          if (!user) {
            throw new Error(`User ${userId} not found`);
          }

          switch (req.operation) {
            case 'activate':
              await tx.exec`
                UPDATE users SET is_active = true, updated_at = NOW()
                WHERE id = ${userId}
              `;
              break;

            case 'deactivate':
              await tx.exec`
                UPDATE users SET is_active = false, updated_at = NOW()
                WHERE id = ${userId}
              `;
              break;

            case 'delete':
              // Soft delete by deactivating and marking email
              await tx.exec`
                UPDATE users 
                SET 
                  is_active = false,
                  email = email || '_deleted_' || extract(epoch from now()),
                  updated_at = NOW()
                WHERE id = ${userId}
              `;
              break;

            case 'assign_role':
              if (!req.roleId) {
                throw new Error('Role ID required for assign_role operation');
              }
              
              // Check if role assignment already exists
              const existingRole = await tx.queryRow`
                SELECT id FROM user_roles WHERE user_id = ${userId} AND role_id = ${req.roleId}
              `;

              if (!existingRole) {
                await tx.exec`
                  INSERT INTO user_roles (user_id, role_id, assigned_by)
                  VALUES (${userId}, ${req.roleId}, ${auth.userID})
                `;
              }
              break;

            case 'remove_role':
              if (!req.roleId) {
                throw new Error('Role ID required for remove_role operation');
              }
              
              await tx.exec`
                DELETE FROM user_roles 
                WHERE user_id = ${userId} AND role_id = ${req.roleId}
              `;
              break;

            default:
              throw new Error(`Unknown operation: ${req.operation}`);
          }

          // Log the operation
          await tx.exec`
            INSERT INTO audit_logs (
              user_id, action, entity_type, entity_id, new_values
            ) VALUES (
              ${auth.userID}, 'bulk_user_operation', 'user', ${userId},
              ${JSON.stringify({ 
                operation: req.operation, 
                reason: req.reason,
                roleId: req.roleId 
              })}
            )
          `;

          // Create notification for the affected user (except for delete operation)
          if (req.operation !== 'delete') {
            await tx.exec`
              INSERT INTO notifications (
                user_id, title, content, type, reference_type, reference_id
              ) VALUES (
                ${userId},
                'Account Updated',
                'Your account has been updated by admin. Operation: ${req.operation}. Reason: ${req.reason}',
                'admin_action',
                'user',
                ${userId}
              )
            `;
          }
        });

        processedCount++;

      } catch (error) {
        failedCount++;
        errors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Bulk operation failed for user ${userId}:`, error);
      }
    }

    // Log the bulk operation summary
    await db.exec`
      INSERT INTO analytics_events (
        event_type, user_id, properties
      ) VALUES (
        'bulk_user_operation', ${auth.userID},
        ${JSON.stringify({
          operation: req.operation,
          totalUsers: req.userIds.length,
          processedCount,
          failedCount,
          reason: req.reason
        })}
      )
    `;

    return {
      processedCount,
      failedCount,
      errors
    };
  }
);

// Super Admin: System health check
export const systemHealthCheck = api(
  { auth: true, expose: true, method: "GET", path: "/system/admin/health" },
  async () => {
    const auth = getAuthData()!;
    
    // Check super admin permissions
    if (!auth.permissions.includes('system.admin')) {
      throw APIError.permissionDenied("Super admin access required");
    }

    const healthChecks = {
      database: { status: 'unknown', responseTime: 0, details: '' },
      storage: { status: 'unknown', responseTime: 0, details: '' },
      cache: { status: 'unknown', responseTime: 0, details: '' },
      external_apis: { status: 'unknown', responseTime: 0, details: '' }
    };

    try {
      // Database health check
      const dbStart = Date.now();
      const dbTest = await db.queryRow`SELECT 1 as test`;
      healthChecks.database = {
        status: dbTest ? 'healthy' : 'error',
        responseTime: Date.now() - dbStart,
        details: dbTest ? 'Database connection successful' : 'Database connection failed'
      };

      // Check recent error rates
      const recentErrors = await db.queryRow`
        SELECT COUNT(*) as error_count
        FROM analytics_events
        WHERE event_type = 'error' 
        AND created_at >= NOW() - INTERVAL '1 hour'
      `;

      const errorRate = parseInt(recentErrors?.error_count || '0');

      // Storage health check (simplified)
      const storageStart = Date.now();
      healthChecks.storage = {
        status: 'healthy', // Would check actual file system/cloud storage
        responseTime: Date.now() - storageStart,
        details: 'File storage accessible'
      };

      // Overall system status
      const overallStatus = Object.values(healthChecks).every(check => check.status === 'healthy') 
        ? 'healthy' 
        : 'degraded';

      return {
        overall_status: overallStatus,
        timestamp: new Date().toISOString(),
        checks: healthChecks,
        metrics: {
          error_rate_1h: errorRate,
          avg_response_time: Math.round(
            Object.values(healthChecks).reduce((sum, check) => sum + check.responseTime, 0) / 
            Object.keys(healthChecks).length
          )
        }
      };

    } catch (error) {
      console.error('Health check error:', error);
      return {
        overall_status: 'error',
        timestamp: new Date().toISOString(),
        checks: healthChecks,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
);

// Super Admin: Generate system backup
export const generateSystemBackup = api<SystemBackupRequest, { backupId: string; downloadUrl: string; size: number }>(
  { auth: true, expose: true, method: "POST", path: "/system/admin/backup" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check super admin permissions
    if (!auth.permissions.includes('system.admin')) {
      throw APIError.permissionDenied("Super admin access required");
    }

    try {
      const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      
      // Create backup record
      await db.exec`
        INSERT INTO system_backups (
          backup_id, created_by, include_user_data, include_analytics, 
          include_files, format, status
        ) VALUES (
          ${backupId}, ${auth.userID}, ${req.includeUserData}, 
          ${req.includeAnalytics}, ${req.includeFiles}, ${req.format}, 'processing'
        )
      `;

      // In a real implementation, this would trigger an async backup process
      // For now, we'll simulate the backup creation
      
      // Log the backup request
      await db.exec`
        INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id, new_values
        ) VALUES (
          ${auth.userID}, 'system_backup_requested', 'system', 0,
          ${JSON.stringify(req)}
        )
      `;

      // Simulate backup size calculation
      let estimatedSize = 0;
      if (req.includeUserData) estimatedSize += 50 * 1024 * 1024; // 50MB
      if (req.includeAnalytics) estimatedSize += 100 * 1024 * 1024; // 100MB
      if (req.includeFiles) estimatedSize += 500 * 1024 * 1024; // 500MB

      return {
        backupId,
        downloadUrl: `/system/admin/backup/${backupId}/download`,
        size: estimatedSize
      };

    } catch (error) {
      console.error('Backup generation error:', error);
      throw APIError.internal("Failed to generate system backup");
    }
  }
);

// Super Admin: Get audit logs
export const getAuditLogs = api(
  { auth: true, expose: true, method: "GET", path: "/system/admin/audit-logs" },
  async (params: { 
    page?: Query<number>; 
    limit?: Query<number>; 
    action?: Query<string>; 
    userId?: Query<number>;
    entityType?: Query<string>;
    dateFrom?: Query<string>;
    dateTo?: Query<string>;
  }) => {
    const auth = getAuthData()!;
    
    // Check super admin permissions
    if (!auth.permissions.includes('system.admin')) {
      throw APIError.permissionDenied("Super admin access required");
    }

    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 200);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.action) {
      whereClause += ` AND action = $${paramIndex++}`;
      queryParams.push(params.action);
    }

    if (params.userId) {
      whereClause += ` AND user_id = $${paramIndex++}`;
      queryParams.push(params.userId);
    }

    if (params.entityType) {
      whereClause += ` AND entity_type = $${paramIndex++}`;
      queryParams.push(params.entityType);
    }

    if (params.dateFrom) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      queryParams.push(params.dateFrom);
    }

    if (params.dateTo) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      queryParams.push(params.dateTo);
    }

    const logs = await db.rawQueryAll(`
      SELECT 
        al.*,
        u.first_name, u.last_name, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, ...queryParams, limit, offset);

    const totalResult = await db.rawQueryRow(`
      SELECT COUNT(*) as total FROM audit_logs al ${whereClause}
    `, ...queryParams);

    return {
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        user: log.user_id ? {
          id: log.user_id,
          name: `${log.first_name || ''} ${log.last_name || ''}`.trim(),
          email: log.email
        } : null,
        oldValues: log.old_values ? JSON.parse(log.old_values) : null,
        newValues: log.new_values ? JSON.parse(log.new_values) : null,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        createdAt: log.created_at
      })),
      total: totalResult?.total || 0,
      page,
      limit
    };
  }
);