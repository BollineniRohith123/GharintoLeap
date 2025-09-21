import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface AuditLog {
  id: number;
  user_id?: number;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface AuditLogRequest {
  action: string;
  entity_type: string;
  entity_id?: number;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export interface AuditSearchRequest {
  user_id?: number;
  action?: string;
  entity_type?: string;
  entity_id?: number;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

export class AuditLogger {
  static async log(
    action: string,
    entity_type: string,
    entity_id?: number,
    old_values?: Record<string, any>,
    new_values?: Record<string, any>,
    user_id?: number,
    ip_address?: string,
    user_agent?: string
  ): Promise<void> {
    try {
      await db.exec`
        INSERT INTO audit_logs (
          user_id, action, entity_type, entity_id, 
          old_values, new_values, ip_address, user_agent
        ) VALUES (
          ${user_id}, ${action}, ${entity_type}, ${entity_id},
          ${old_values ? JSON.stringify(old_values) : null},
          ${new_values ? JSON.stringify(new_values) : null},
          ${ip_address}, ${user_agent}
        )
      `;
    } catch (error) {
      // Don't throw audit logging errors to avoid breaking main operations
      console.error('Audit logging failed:', error);
    }
  }

  static async logUserAction(
    action: string,
    entity_type: string,
    entity_id?: number,
    old_values?: Record<string, any>,
    new_values?: Record<string, any>
  ): Promise<void> {
    try {
      // Get current user from auth context if available
      const auth = getAuthData();
      const userId = auth ? parseInt(auth.userID) : undefined;
      
      await this.log(action, entity_type, entity_id, old_values, new_values, userId);
    } catch (error) {
      // Don't throw audit logging errors
      console.error('User audit logging failed:', error);
    }
  }

  static async logSystemAction(
    action: string,
    entity_type: string,
    entity_id?: number,
    old_values?: Record<string, any>,
    new_values?: Record<string, any>
  ): Promise<void> {
    await this.log(action, entity_type, entity_id, old_values, new_values);
  }
}

export const createAuditLog = api<AuditLogRequest, void>(
  { auth: true, expose: true, method: "POST", path: "/audit/log" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    await AuditLogger.log(
      req.action,
      req.entity_type,
      req.entity_id,
      req.old_values,
      req.new_values,
      userId,
      req.ip_address,
      req.user_agent
    );
  }
);

export const getAuditLogs = api<AuditSearchRequest, { 
  logs: AuditLog[]; 
  total_count: number;
  summary: {
    total_actions: number;
    unique_users: number;
    most_common_actions: { action: string; count: number }[];
    activity_by_hour: { hour: number; count: number }[];
  };
}>(
  { auth: true, expose: true, method: "POST", path: "/audit/search" },
  async (req) => {
    const auth = getAuthData()!;

    // Check if user can view audit logs
    if (!auth.permissions.includes('system.configure') && !auth.roles.includes('admin') && !auth.roles.includes('super_admin')) {
      throw APIError.forbidden("Access denied to view audit logs");
    }

    const { limit = 50, offset = 0 } = req;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Build where conditions
    if (req.user_id) {
      whereConditions.push(`al.user_id = $${paramIndex++}`);
      params.push(req.user_id);
    }

    if (req.action) {
      whereConditions.push(`al.action = $${paramIndex++}`);
      params.push(req.action);
    }

    if (req.entity_type) {
      whereConditions.push(`al.entity_type = $${paramIndex++}`);
      params.push(req.entity_type);
    }

    if (req.entity_id) {
      whereConditions.push(`al.entity_id = $${paramIndex++}`);
      params.push(req.entity_id);
    }

    if (req.start_date) {
      whereConditions.push(`al.created_at >= $${paramIndex++}`);
      params.push(req.start_date);
    }

    if (req.end_date) {
      whereConditions.push(`al.created_at <= $${paramIndex++}`);
      params.push(req.end_date);
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get audit logs
    const logsQuery = `
      SELECT 
        al.id,
        al.user_id,
        CASE 
          WHEN al.user_id IS NOT NULL THEN u.first_name || ' ' || u.last_name
          ELSE 'System'
        END as user_name,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const logs = await db.rawQueryAll<AuditLog>(logsQuery, ...params);

    // Parse JSON fields
    logs.forEach(log => {
      if (typeof log.old_values === 'string') {
        log.old_values = JSON.parse(log.old_values);
      }
      if (typeof log.new_values === 'string') {
        log.new_values = JSON.parse(log.new_values);
      }
    });

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM audit_logs al ${whereClause}`;
    const countResult = await db.rawQueryRow<{ count: number }>(
      countQuery, 
      ...params.slice(0, -2)
    );

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_actions,
        COUNT(DISTINCT user_id) as unique_users
      FROM audit_logs al
      ${whereClause}
    `;
    const summaryResult = await db.rawQueryRow<{ total_actions: number; unique_users: number }>(
      summaryQuery,
      ...params.slice(0, -2)
    );

    // Get most common actions
    const actionsQuery = `
      SELECT action, COUNT(*) as count
      FROM audit_logs al
      ${whereClause}
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `;
    const commonActions = await db.rawQueryAll<{ action: string; count: number }>(
      actionsQuery,
      ...params.slice(0, -2)
    );

    // Get activity by hour
    const activityQuery = `
      SELECT 
        EXTRACT(hour FROM created_at) as hour,
        COUNT(*) as count
      FROM audit_logs al
      ${whereClause}
      GROUP BY EXTRACT(hour FROM created_at)
      ORDER BY hour
    `;
    const activityByHour = await db.rawQueryAll<{ hour: number; count: number }>(
      activityQuery,
      ...params.slice(0, -2)
    );

    return {
      logs,
      total_count: countResult?.count || 0,
      summary: {
        total_actions: summaryResult?.total_actions || 0,
        unique_users: summaryResult?.unique_users || 0,
        most_common_actions: commonActions,
        activity_by_hour: activityByHour
      }
    };
  }
);

export const getEntityAuditTrail = api<{ 
  entity_type: string; 
  entity_id: number;
}, { logs: AuditLog[] }>(
  { auth: true, expose: true, method: "GET", path: "/audit/entity/:entity_type/:entity_id" },
  async ({ entity_type, entity_id }) => {
    const auth = getAuthData()!;

    // Check if user can view this entity's audit trail
    const canView = auth.permissions.includes('system.configure') || 
                   auth.roles.includes('admin') || 
                   auth.roles.includes('super_admin');

    // Additional entity-specific access checks
    if (!canView) {
      if (entity_type === 'projects') {
        const project = await db.queryRow`
          SELECT client_id, designer_id, project_manager_id 
          FROM projects 
          WHERE id = ${entity_id}
        `;
        
        if (project) {
          const userId = parseInt(auth.userID);
          const hasAccess = project.client_id === userId || 
                           project.designer_id === userId || 
                           project.project_manager_id === userId;
          
          if (!hasAccess) {
            throw APIError.forbidden("Access denied to view audit trail for this entity");
          }
        }
      } else {
        throw APIError.forbidden("Access denied to view audit trails");
      }
    }

    const logsQuery = db.rawQuery<AuditLog>(`
      SELECT 
        al.id,
        al.user_id,
        CASE 
          WHEN al.user_id IS NOT NULL THEN u.first_name || ' ' || u.last_name
          ELSE 'System'
        END as user_name,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.entity_type = $1 AND al.entity_id = $2
      ORDER BY al.created_at DESC
    `, entity_type, entity_id);

    const logs: AuditLog[] = [];
    for await (const log of logsQuery) {
      // Parse JSON fields
      if (typeof log.old_values === 'string') {
        log.old_values = JSON.parse(log.old_values);
      }
      if (typeof log.new_values === 'string') {
        log.new_values = JSON.parse(log.new_values);
      }
      logs.push(log);
    }

    return { logs };
  }
);

export const getUserAuditHistory = api<{ 
  user_id?: number;
  limit?: number;
  offset?: number;
}, { logs: AuditLog[]; total_count: number }>(
  { auth: true, expose: true, method: "GET", path: "/audit/user" },
  async ({ user_id, limit = 20, offset = 0 }) => {
    const auth = getAuthData()!;
    const targetUserId = user_id || parseInt(auth.userID);

    // Check if user can view audit history
    const canView = targetUserId === parseInt(auth.userID) || 
                   auth.permissions.includes('system.configure') ||
                   auth.roles.includes('admin') ||
                   auth.roles.includes('super_admin');

    if (!canView) {
      throw APIError.forbidden("Access denied to view user audit history");
    }

    const logsQuery = db.rawQuery<AuditLog>(`
      SELECT 
        al.id,
        al.user_id,
        u.first_name || ' ' || u.last_name as user_name,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.created_at
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.user_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2 OFFSET $3
    `, targetUserId, limit, offset);

    const logs: AuditLog[] = [];
    for await (const log of logsQuery) {
      // Parse JSON fields
      if (typeof log.old_values === 'string') {
        log.old_values = JSON.parse(log.old_values);
      }
      if (typeof log.new_values === 'string') {
        log.new_values = JSON.parse(log.new_values);
      }
      logs.push(log);
    }

    const countResult = await db.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ${targetUserId}
    `;

    return {
      logs,
      total_count: countResult?.count || 0
    };
  }
);

// Audit middleware helper functions
export async function auditCreate(
  entity_type: string,
  entity_id: number,
  new_values: Record<string, any>
): Promise<void> {
  await AuditLogger.logUserAction('CREATE', entity_type, entity_id, undefined, new_values);
}

export async function auditUpdate(
  entity_type: string,
  entity_id: number,
  old_values: Record<string, any>,
  new_values: Record<string, any>
): Promise<void> {
  await AuditLogger.logUserAction('UPDATE', entity_type, entity_id, old_values, new_values);
}

export async function auditDelete(
  entity_type: string,
  entity_id: number,
  old_values: Record<string, any>
): Promise<void> {
  await AuditLogger.logUserAction('DELETE', entity_type, entity_id, old_values, undefined);
}

export async function auditView(
  entity_type: string,
  entity_id: number
): Promise<void> {
  await AuditLogger.logUserAction('VIEW', entity_type, entity_id);
}

export async function auditLogin(user_id: number): Promise<void> {
  await AuditLogger.log('LOGIN', 'user', user_id, undefined, undefined, user_id);
}

export async function auditLogout(user_id: number): Promise<void> {
  await AuditLogger.log('LOGOUT', 'user', user_id, undefined, undefined, user_id);
}