import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

export interface ChangeOrder {
  id: number;
  project_id: number;
  change_order_number: string;
  title: string;
  description: string;
  reason?: string;
  cost_impact: number;
  time_impact_days: number;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  requested_by: number;
  approved_by?: number;
  requested_at: Date;
  approved_at?: Date;
  implemented_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface CreateChangeOrderRequest {
  project_id: number;
  title: string;
  description: string;
  reason?: string;
  cost_impact?: number;
  time_impact_days?: number;
}

interface UpdateChangeOrderRequest {
  title?: string;
  description?: string;
  reason?: string;
  cost_impact?: number;
  time_impact_days?: number;
}

interface ApproveChangeOrderRequest {
  status: 'approved' | 'rejected';
  notes?: string;
}

interface ChangeOrderListParams {
  page?: Query<number>;
  limit?: Query<number>;
  project_id?: Query<number>;
  status?: Query<string>;
  requested_by?: Query<number>;
}

// Generate unique change order number
async function generateChangeOrderNumber(projectId: number): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const lastCO = await db.queryRow`
    SELECT change_order_number 
    FROM change_orders 
    WHERE project_id = ${projectId}
    AND change_order_number LIKE ${'CO' + year + month + '%'}
    ORDER BY change_order_number DESC 
    LIMIT 1
  `;

  let sequence = 1;
  if (lastCO) {
    const lastSequence = parseInt(lastCO.change_order_number.slice(-3));
    sequence = lastSequence + 1;
  }

  return `CO${year}${month}${String(sequence).padStart(3, '0')}`;
}

// Create new change order
export const createChangeOrder = api<CreateChangeOrderRequest, ChangeOrder>(
  { auth: true, expose: true, method: "POST", path: "/projects/change-orders" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Validate required fields
    if (!req.title || !req.description || !req.project_id) {
      throw APIError.badRequest("Title, description, and project ID are required");
    }

    // Verify project exists and user has access
    const project = await db.queryRow`
      SELECT id, client_id, designer_id, project_manager_id, status
      FROM projects 
      WHERE id = ${req.project_id}
    `;

    if (!project) {
      throw APIError.badRequest("Invalid project ID");
    }

    const userId = parseInt(auth.userID);
    const hasAccess = project.client_id === userId || 
                     project.designer_id === userId || 
                     project.project_manager_id === userId ||
                     auth.permissions.includes('projects.manage');

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this project");
    }

    // Can't create change orders for completed projects
    if (project.status === 'completed') {
      throw APIError.badRequest("Cannot create change orders for completed projects");
    }

    try {
      // Generate change order number
      const changeOrderNumber = await generateChangeOrderNumber(req.project_id);

      // Create change order
      const changeOrder = await db.queryRow<ChangeOrder>`
        INSERT INTO change_orders (
          project_id, change_order_number, title, description, reason,
          cost_impact, time_impact_days, requested_by, requested_at
        ) VALUES (
          ${req.project_id}, ${changeOrderNumber}, ${req.title}, ${req.description}, ${req.reason || null},
          ${req.cost_impact || 0}, ${req.time_impact_days || 0}, ${auth.userID}, NOW()
        )
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'create', 'change_order', ${changeOrder.id}, ${JSON.stringify(changeOrder)})
      `;

      return changeOrder;

    } catch (error) {
      console.error('Change order creation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create change order");
    }
  }
);

// Get change order by ID
export const getChangeOrder = api<{ id: number }, { changeOrder: ChangeOrder; requester?: any; approver?: any }>(
  { auth: true, expose: true, method: "GET", path: "/projects/change-orders/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Get change order with project info
    const changeOrder = await db.queryRow<ChangeOrder>`
      SELECT co.*, p.client_id, p.designer_id, p.project_manager_id, p.title as project_title
      FROM change_orders co
      JOIN projects p ON co.project_id = p.id
      WHERE co.id = ${id}
    `;

    if (!changeOrder) {
      throw APIError.notFound("Change order not found");
    }

    // Check access permissions
    const userId = parseInt(auth.userID);
    const hasAccess = changeOrder.client_id === userId || 
                     changeOrder.designer_id === userId || 
                     changeOrder.project_manager_id === userId ||
                     changeOrder.requested_by === userId ||
                     auth.permissions.includes('projects.view');

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this change order");
    }

    // Get requester info
    const requester = await db.queryRow`
      SELECT id, first_name, last_name, email
      FROM users 
      WHERE id = ${changeOrder.requested_by}
    `;

    // Get approver info if approved
    let approver = null;
    if (changeOrder.approved_by) {
      approver = await db.queryRow`
        SELECT id, first_name, last_name, email
        FROM users 
        WHERE id = ${changeOrder.approved_by}
      `;
    }

    return { changeOrder, requester, approver };
  }
);

// List change orders with filtering
export const listChangeOrders = api<ChangeOrderListParams, { changeOrders: any[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/projects/change-orders" },
  async (params) => {
    const auth = getAuthData()!;
    
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Role-based filtering
    const userId = parseInt(auth.userID);
    if (!auth.permissions.includes('projects.view')) {
      whereClause += ` AND (p.client_id = $${paramIndex} OR p.designer_id = $${paramIndex} OR p.project_manager_id = $${paramIndex} OR co.requested_by = $${paramIndex})`;
      queryParams.push(userId);
      paramIndex++;
    }

    // Project filter
    if (params.project_id) {
      whereClause += ` AND co.project_id = $${paramIndex}`;
      queryParams.push(params.project_id);
      paramIndex++;
    }

    // Status filter
    if (params.status) {
      whereClause += ` AND co.status = $${paramIndex}`;
      queryParams.push(params.status);
      paramIndex++;
    }

    // Requested by filter
    if (params.requested_by) {
      whereClause += ` AND co.requested_by = $${paramIndex}`;
      queryParams.push(params.requested_by);
      paramIndex++;
    }

    try {
      // Get change orders
      const changeOrdersQuery = `
        SELECT 
          co.*,
          p.title as project_title,
          requester.first_name || ' ' || requester.last_name as requester_name,
          approver.first_name || ' ' || approver.last_name as approver_name
        FROM change_orders co
        JOIN projects p ON co.project_id = p.id
        LEFT JOIN users requester ON co.requested_by = requester.id
        LEFT JOIN users approver ON co.approved_by = approver.id
        ${whereClause}
        ORDER BY co.requested_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const changeOrdersResult = await db.query(changeOrdersQuery, ...queryParams);
      const changeOrders: any[] = [];
      for await (const co of changeOrdersResult) {
        changeOrders.push({
          id: co.id,
          project_id: co.project_id,
          project_title: co.project_title,
          change_order_number: co.change_order_number,
          title: co.title,
          description: co.description,
          reason: co.reason,
          cost_impact: co.cost_impact,
          time_impact_days: co.time_impact_days,
          status: co.status,
          requested_by: co.requested_by,
          requester_name: co.requester_name,
          approved_by: co.approved_by,
          approver_name: co.approver_name,
          requested_at: co.requested_at,
          approved_at: co.approved_at,
          implemented_at: co.implemented_at,
          created_at: co.created_at,
          updated_at: co.updated_at
        });
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM change_orders co
        JOIN projects p ON co.project_id = p.id
        ${whereClause}
      `;
      const countResult = await db.query(countQuery, ...queryParams.slice(0, -2));
      let total = 0;
      for await (const row of countResult) {
        total = parseInt(row.total);
        break;
      }

      return {
        changeOrders,
        total,
        page,
        limit
      };

    } catch (error) {
      console.error('List change orders error:', error);
      throw APIError.internal("Failed to fetch change orders");
    }
  }
);

// Update change order
export const updateChangeOrder = api<{ id: number } & UpdateChangeOrderRequest, ChangeOrder>(
  { auth: true, expose: true, method: "PUT", path: "/projects/change-orders/:id" },
  async ({ id, ...req }) => {
    const auth = getAuthData()!;
    
    // Get existing change order
    const existingCO = await db.queryRow<ChangeOrder>`
      SELECT co.*, p.client_id, p.designer_id, p.project_manager_id
      FROM change_orders co
      JOIN projects p ON co.project_id = p.id
      WHERE co.id = ${id}
    `;

    if (!existingCO) {
      throw APIError.notFound("Change order not found");
    }

    // Check permissions
    const userId = parseInt(auth.userID);
    const canEdit = existingCO.requested_by === userId || 
                   existingCO.project_manager_id === userId ||
                   auth.permissions.includes('projects.manage');

    if (!canEdit) {
      throw APIError.forbidden("Access denied to edit this change order");
    }

    // Can't edit approved/rejected/implemented change orders
    if (['approved', 'rejected', 'implemented'].includes(existingCO.status)) {
      throw APIError.badRequest("Cannot edit approved, rejected, or implemented change orders");
    }

    try {
      // Update change order
      const changeOrder = await db.queryRow<ChangeOrder>`
        UPDATE change_orders SET
          title = COALESCE(${req.title}, title),
          description = COALESCE(${req.description}, description),
          reason = COALESCE(${req.reason}, reason),
          cost_impact = COALESCE(${req.cost_impact}, cost_impact),
          time_impact_days = COALESCE(${req.time_impact_days}, time_impact_days),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'update', 'change_order', ${id}, ${JSON.stringify(existingCO)}, ${JSON.stringify(changeOrder)})
      `;

      return changeOrder;

    } catch (error) {
      console.error('Change order update error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update change order");
    }
  }
);

// Approve or reject change order
export const approveChangeOrder = api<{ id: number } & ApproveChangeOrderRequest, ChangeOrder>(
  { auth: true, expose: true, method: "POST", path: "/projects/change-orders/:id/approve" },
  async ({ id, status, notes }) => {
    const auth = getAuthData()!;
    
    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      throw APIError.badRequest("Status must be 'approved' or 'rejected'");
    }

    // Get change order
    const changeOrder = await db.queryRow<ChangeOrder>`
      SELECT co.*, p.client_id, p.designer_id, p.project_manager_id
      FROM change_orders co
      JOIN projects p ON co.project_id = p.id
      WHERE co.id = ${id}
    `;

    if (!changeOrder) {
      throw APIError.notFound("Change order not found");
    }

    // Check permissions - only project manager or client can approve
    const userId = parseInt(auth.userID);
    const canApprove = changeOrder.client_id === userId || 
                      changeOrder.project_manager_id === userId ||
                      auth.permissions.includes('projects.manage');

    if (!canApprove) {
      throw APIError.forbidden("Insufficient permissions to approve change orders");
    }

    if (changeOrder.status !== 'pending') {
      throw APIError.badRequest("Only pending change orders can be approved or rejected");
    }

    try {
      // Update change order status
      const updatedCO = await db.queryRow<ChangeOrder>`
        UPDATE change_orders SET
          status = ${status},
          approved_by = ${auth.userID},
          approved_at = NOW(),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // If approved, update project budget and timeline
      if (status === 'approved' && (changeOrder.cost_impact !== 0 || changeOrder.time_impact_days !== 0)) {
        await db.exec`
          UPDATE projects SET
            budget = budget + ${changeOrder.cost_impact},
            estimated_end_date = CASE 
              WHEN estimated_end_date IS NOT NULL THEN estimated_end_date + INTERVAL '${changeOrder.time_impact_days} days'
              ELSE estimated_end_date
            END,
            updated_at = NOW()
          WHERE id = ${changeOrder.project_id}
        `;
      }

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, ${status}, 'change_order', ${id}, ${JSON.stringify(changeOrder)}, ${JSON.stringify({ status, notes })})
      `;

      return updatedCO;

    } catch (error) {
      console.error('Approve change order error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to approve change order");
    }
  }
);

// Mark change order as implemented
export const implementChangeOrder = api<{ id: number; notes?: string }, ChangeOrder>(
  { auth: true, expose: true, method: "POST", path: "/projects/change-orders/:id/implement" },
  async ({ id, notes }) => {
    const auth = getAuthData()!;
    
    // Get change order
    const changeOrder = await db.queryRow<ChangeOrder>`
      SELECT co.*, p.client_id, p.designer_id, p.project_manager_id
      FROM change_orders co
      JOIN projects p ON co.project_id = p.id
      WHERE co.id = ${id}
    `;

    if (!changeOrder) {
      throw APIError.notFound("Change order not found");
    }

    // Check permissions - only project team can mark as implemented
    const userId = parseInt(auth.userID);
    const canImplement = changeOrder.designer_id === userId || 
                        changeOrder.project_manager_id === userId ||
                        auth.permissions.includes('projects.manage');

    if (!canImplement) {
      throw APIError.forbidden("Insufficient permissions to implement change orders");
    }

    if (changeOrder.status !== 'approved') {
      throw APIError.badRequest("Only approved change orders can be implemented");
    }

    try {
      // Update change order status
      const updatedCO = await db.queryRow<ChangeOrder>`
        UPDATE change_orders SET
          status = 'implemented',
          implemented_at = NOW(),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'implement', 'change_order', ${id}, ${JSON.stringify(changeOrder)}, ${JSON.stringify({ status: 'implemented', notes })})
      `;

      return updatedCO;

    } catch (error) {
      console.error('Implement change order error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to implement change order");
    }
  }
);

// Get change order statistics for project
export const getChangeOrderStatistics = api<{ project_id: number }, { 
  total_change_orders: number;
  pending_change_orders: number;
  approved_change_orders: number;
  rejected_change_orders: number;
  implemented_change_orders: number;
  total_cost_impact: number;
  total_time_impact: number;
  approval_rate: number;
}>(
  { auth: true, expose: true, method: "GET", path: "/projects/:project_id/change-orders/statistics" },
  async ({ project_id }) => {
    const auth = getAuthData()!;
    
    // Verify project access
    const project = await db.queryRow`
      SELECT id, client_id, designer_id, project_manager_id 
      FROM projects 
      WHERE id = ${project_id}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    const userId = parseInt(auth.userID);
    const hasAccess = project.client_id === userId || 
                     project.designer_id === userId || 
                     project.project_manager_id === userId ||
                     auth.permissions.includes('projects.view');

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this project");
    }

    try {
      // Get statistics
      const stats = await db.queryRow`
        SELECT 
          COUNT(*) as total_change_orders,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_change_orders,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_change_orders,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_change_orders,
          COUNT(*) FILTER (WHERE status = 'implemented') as implemented_change_orders,
          COALESCE(SUM(cost_impact) FILTER (WHERE status IN ('approved', 'implemented')), 0) as total_cost_impact,
          COALESCE(SUM(time_impact_days) FILTER (WHERE status IN ('approved', 'implemented')), 0) as total_time_impact
        FROM change_orders
        WHERE project_id = ${project_id}
      `;

      const totalCOs = parseInt(stats?.total_change_orders || '0');
      const approvedCOs = parseInt(stats?.approved_change_orders || '0') + parseInt(stats?.implemented_change_orders || '0');
      const approvalRate = totalCOs > 0 ? Math.round((approvedCOs / totalCOs) * 100) : 0;

      return {
        total_change_orders: totalCOs,
        pending_change_orders: parseInt(stats?.pending_change_orders || '0'),
        approved_change_orders: parseInt(stats?.approved_change_orders || '0'),
        rejected_change_orders: parseInt(stats?.rejected_change_orders || '0'),
        implemented_change_orders: parseInt(stats?.implemented_change_orders || '0'),
        total_cost_impact: parseInt(stats?.total_cost_impact || '0'),
        total_time_impact: parseInt(stats?.total_time_impact || '0'),
        approval_rate: approvalRate
      };

    } catch (error) {
      console.error('Get change order statistics error:', error);
      throw APIError.internal("Failed to fetch change order statistics");
    }
  }
);
