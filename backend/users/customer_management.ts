import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface CustomerDeletionRequest {
  userId: number;
  reason: string;
  transferProjectsTo?: number;
  refundAmount?: number;
  adminNotes?: string;
}

interface CustomerUpdateRequest {
  userId: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  state?: string;
  isActive?: boolean;
  adminNotes?: string;
}

interface CustomerListParams {
  page?: Query<number>;
  limit?: Query<number>;
  search?: Query<string>;
  city?: Query<string>;
  status?: Query<'active' | 'inactive' | 'all'>;
  sortBy?: Query<'name' | 'created_at' | 'last_activity' | 'total_spent'>;
  sortOrder?: Query<'asc' | 'desc'>;
}

interface CustomerDetails {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  state?: string;
  country: string;
  isActive: boolean;
  emailVerified: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalSpent: number;
    walletBalance: number;
    lastActivity?: string;
  };
  recentProjects: Array<{
    id: number;
    title: string;
    status: string;
    budget: number;
    createdAt: string;
  }>;
}

// Admin: Get detailed customer information
export const getCustomerDetails = api<{ userId: number }, CustomerDetails>(
  { auth: true, expose: true, method: "GET", path: "/users/customers/:userId" },
  async ({ userId }) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('users.view')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    // Get customer basic info
    const customer = await db.queryRow`
      SELECT 
        u.*,
        w.balance as wallet_balance
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      WHERE u.id = ${userId}
    `;

    if (!customer) {
      throw APIError.notFound("Customer not found");
    }

    // Verify customer role
    const isCustomer = await db.queryRow`
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ${userId} AND r.name = 'customer'
    `;

    if (!isCustomer) {
      throw APIError.invalidArgument("User is not a customer");
    }

    // Get project statistics
    const projectStats = await db.queryRow`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN status IN ('planning', 'in_progress', 'review') THEN 1 END) as active_projects,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
        COALESCE(SUM(budget), 0) as total_spent
      FROM projects
      WHERE client_id = ${userId}
    `;

    // Get last activity
    const lastActivity = await db.queryRow`
      SELECT created_at as last_activity
      FROM analytics_events
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    // Get recent projects
    const recentProjects = await db.queryAll`
      SELECT id, title, status, budget, created_at
      FROM projects
      WHERE client_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phone: customer.phone,
      city: customer.city,
      state: customer.state,
      country: customer.country,
      isActive: customer.is_active,
      emailVerified: customer.email_verified,
      avatarUrl: customer.avatar_url,
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
      stats: {
        totalProjects: parseInt(projectStats?.total_projects || '0'),
        activeProjects: parseInt(projectStats?.active_projects || '0'),
        completedProjects: parseInt(projectStats?.completed_projects || '0'),
        totalSpent: parseInt(projectStats?.total_spent || '0'),
        walletBalance: customer.wallet_balance || 0,
        lastActivity: lastActivity?.last_activity
      },
      recentProjects: recentProjects.map(p => ({
        id: p.id,
        title: p.title,
        status: p.status,
        budget: p.budget,
        createdAt: p.created_at
      }))
    };
  }
);

// Admin: List all customers with advanced filtering
export const listCustomers = api<CustomerListParams, { customers: CustomerDetails[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/users/customers" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('users.view')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    let whereClause = `WHERE r.name = 'customer'`;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.search) {
      whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.city) {
      whereClause += ` AND u.city = $${paramIndex}`;
      queryParams.push(params.city);
      paramIndex++;
    }

    if (params.status && params.status !== 'all') {
      const isActive = params.status === 'active';
      whereClause += ` AND u.is_active = $${paramIndex}`;
      queryParams.push(isActive);
      paramIndex++;
    }

    // Determine sort order
    let orderBy = 'u.created_at DESC';
    if (params.sortBy) {
      const sortOrder = params.sortOrder || 'desc';
      switch (params.sortBy) {
        case 'name':
          orderBy = `u.first_name ${sortOrder}, u.last_name ${sortOrder}`;
          break;
        case 'created_at':
          orderBy = `u.created_at ${sortOrder}`;
          break;
        case 'last_activity':
          orderBy = `last_activity ${sortOrder}`;
          break;
        case 'total_spent':
          orderBy = `total_spent ${sortOrder}`;
          break;
      }
    }

    const customers = await db.rawQueryAll(`
      SELECT 
        u.*,
        w.balance as wallet_balance,
        COALESCE(ps.total_projects, 0) as total_projects,
        COALESCE(ps.active_projects, 0) as active_projects,
        COALESCE(ps.completed_projects, 0) as completed_projects,
        COALESCE(ps.total_spent, 0) as total_spent,
        la.last_activity
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN wallets w ON u.id = w.user_id
      LEFT JOIN (
        SELECT 
          client_id,
          COUNT(*) as total_projects,
          COUNT(CASE WHEN status IN ('planning', 'in_progress', 'review') THEN 1 END) as active_projects,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
          SUM(budget) as total_spent
        FROM projects
        GROUP BY client_id
      ) ps ON u.id = ps.client_id
      LEFT JOIN (
        SELECT 
          user_id,
          MAX(created_at) as last_activity
        FROM analytics_events
        GROUP BY user_id
      ) la ON u.id = la.user_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, ...queryParams, limit, offset);

    const totalResult = await db.rawQueryRow(`
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      ${whereClause}
    `, ...queryParams);

    return {
      customers: customers.map(customer => ({
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
        city: customer.city,
        state: customer.state,
        country: customer.country,
        isActive: customer.is_active,
        emailVerified: customer.email_verified,
        avatarUrl: customer.avatar_url,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
        stats: {
          totalProjects: parseInt(customer.total_projects || '0'),
          activeProjects: parseInt(customer.active_projects || '0'),
          completedProjects: parseInt(customer.completed_projects || '0'),
          totalSpent: parseInt(customer.total_spent || '0'),
          walletBalance: customer.wallet_balance || 0,
          lastActivity: customer.last_activity
        },
        recentProjects: [] // Will be loaded separately if needed
      })),
      total: totalResult?.total || 0,
      page,
      limit
    };
  }
);

// Admin: Update customer information
export const updateCustomer = api<CustomerUpdateRequest, { success: boolean; customer: CustomerDetails }>(
  { auth: true, expose: true, method: "PUT", path: "/users/customers/update" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('users.edit')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    if (!req.userId) {
      throw APIError.invalidArgument("User ID is required");
    }

    try {
      const result = await db.tx(async (tx) => {
        // Get current user data
        const currentUser = await tx.queryRow`
          SELECT * FROM users WHERE id = ${req.userId}
        `;

        if (!currentUser) {
          throw APIError.notFound("Customer not found");
        }

        // Build update fields
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        if (req.firstName !== undefined) {
          updateFields.push(`first_name = $${paramIndex++}`);
          updateValues.push(req.firstName);
        }
        if (req.lastName !== undefined) {
          updateFields.push(`last_name = $${paramIndex++}`);
          updateValues.push(req.lastName);
        }
        if (req.phone !== undefined) {
          updateFields.push(`phone = $${paramIndex++}`);
          updateValues.push(req.phone);
        }
        if (req.city !== undefined) {
          updateFields.push(`city = $${paramIndex++}`);
          updateValues.push(req.city);
        }
        if (req.state !== undefined) {
          updateFields.push(`state = $${paramIndex++}`);
          updateValues.push(req.state);
        }
        if (req.isActive !== undefined) {
          updateFields.push(`is_active = $${paramIndex++}`);
          updateValues.push(req.isActive);
        }

        updateFields.push(`updated_at = NOW()`);

        if (updateFields.length > 1) { // More than just updated_at
          const updatedUser = await tx.rawQueryRow(`
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
          `, ...updateValues, req.userId);

          // Log audit trail
          await tx.exec`
            INSERT INTO audit_logs (
              user_id, action, entity_type, entity_id, 
              old_values, new_values, ip_address
            ) VALUES (
              ${auth.userID}, 'customer_update', 'user', ${req.userId},
              ${JSON.stringify({
                firstName: currentUser.first_name,
                lastName: currentUser.last_name,
                phone: currentUser.phone,
                city: currentUser.city,
                state: currentUser.state,
                isActive: currentUser.is_active
              })},
              ${JSON.stringify({
                firstName: req.firstName,
                lastName: req.lastName,
                phone: req.phone,
                city: req.city,
                state: req.state,
                isActive: req.isActive,
                adminNotes: req.adminNotes
              })},
              NULL
            )
          `;

          return updatedUser;
        }

        return currentUser;
      });

      // Get updated customer details
      const customerDetails = await getCustomerDetails({ userId: req.userId });

      return {
        success: true,
        customer: customerDetails
      };

    } catch (error) {
      console.error('Customer update error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update customer");
    }
  }
);

// Admin: Soft delete customer (with project transfer and refund handling)
export const deleteCustomer = api<CustomerDeletionRequest, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "DELETE", path: "/users/customers/delete" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check super admin permissions
    if (!auth.permissions.includes('users.delete')) {
      throw APIError.permissionDenied("Insufficient permissions for customer deletion");
    }

    if (!req.userId || !req.reason) {
      throw APIError.invalidArgument("User ID and reason are required");
    }

    try {
      const result = await db.tx(async (tx) => {
        // Get customer info
        const customer = await tx.queryRow`
          SELECT * FROM users WHERE id = ${req.userId}
        `;

        if (!customer) {
          throw APIError.notFound("Customer not found");
        }

        // Check for active projects
        const activeProjects = await tx.queryAll`
          SELECT id, title, status FROM projects 
          WHERE client_id = ${req.userId} 
          AND status IN ('planning', 'in_progress', 'review')
        `;

        if (activeProjects.length > 0 && !req.transferProjectsTo) {
          throw APIError.invalidArgument(
            `Customer has ${activeProjects.length} active projects. Please specify transferProjectsTo user ID.`
          );
        }

        // Transfer active projects if specified
        if (req.transferProjectsTo && activeProjects.length > 0) {
          await tx.exec`
            UPDATE projects 
            SET client_id = ${req.transferProjectsTo}, updated_at = NOW()
            WHERE client_id = ${req.userId} 
            AND status IN ('planning', 'in_progress', 'review')
          `;

          // Notify new client about transferred projects
          await tx.exec`
            INSERT INTO notifications (user_id, title, content, type, reference_type, reference_id)
            VALUES (
              ${req.transferProjectsTo},
              'Projects Transferred',
              '${activeProjects.length} projects have been transferred to you from customer ${customer.first_name} ${customer.last_name}',
              'project_transfer',
              'user',
              ${req.userId}
            )
          `;
        }

        // Handle wallet refund if specified
        let refundTransactionId = null;
        if (req.refundAmount && req.refundAmount > 0) {
          const wallet = await tx.queryRow`
            SELECT * FROM wallets WHERE user_id = ${req.userId}
          `;

          if (wallet && wallet.balance >= req.refundAmount) {
            // Create refund transaction
            const refundTransaction = await tx.queryRow`
              INSERT INTO transactions (
                wallet_id, type, amount, description, reference_type, status
              ) VALUES (
                ${wallet.id}, 'debit', ${req.refundAmount}, 
                'Account deletion refund', 'refund', 'completed'
              ) RETURNING *
            `;

            // Update wallet balance
            await tx.exec`
              UPDATE wallets 
              SET balance = balance - ${req.refundAmount}, updated_at = NOW()
              WHERE id = ${wallet.id}
            `;

            refundTransactionId = refundTransaction.id;
          }
        }

        // Soft delete user (deactivate instead of actual deletion)
        await tx.exec`
          UPDATE users 
          SET 
            is_active = false,
            email = email || '_deleted_' || extract(epoch from now()),
            updated_at = NOW()
          WHERE id = ${req.userId}
        `;

        // Log comprehensive audit trail
        await tx.exec`
          INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, 
            old_values, new_values, ip_address
          ) VALUES (
            ${auth.userID}, 'customer_deletion', 'user', ${req.userId},
            ${JSON.stringify(customer)},
            ${JSON.stringify({
              reason: req.reason,
              transferredProjects: activeProjects.length,
              transferredTo: req.transferProjectsTo,
              refundAmount: req.refundAmount,
              refundTransactionId: refundTransactionId,
              adminNotes: req.adminNotes,
              deletedAt: new Date().toISOString()
            })},
            NULL
          )
        `;

        return {
          transferredProjects: activeProjects.length,
          refundAmount: req.refundAmount || 0,
          refundTransactionId
        };
      });

      return {
        success: true,
        message: `Customer deleted successfully. ${result.transferredProjects} projects transferred. ${result.refundAmount > 0 ? `₹${result.refundAmount} refunded.` : ''}`
      };

    } catch (error) {
      console.error('Customer deletion error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to delete customer");
    }
  }
);

// Admin: Restore deleted customer
export const restoreCustomer = api<{ userId: number; reason: string }, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/users/customers/restore" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check super admin permissions
    if (!auth.permissions.includes('users.delete')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    try {
      await db.tx(async (tx) => {
        // Restore user
        const restoredUser = await tx.queryRow`
          UPDATE users 
          SET 
            is_active = true,
            email = regexp_replace(email, '_deleted_[0-9]+$', ''),
            updated_at = NOW()
          WHERE id = ${req.userId}
          RETURNING *
        `;

        if (!restoredUser) {
          throw APIError.notFound("Customer not found");
        }

        // Log audit trail
        await tx.exec`
          INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, 
            new_values, ip_address
          ) VALUES (
            ${auth.userID}, 'customer_restoration', 'user', ${req.userId},
            ${JSON.stringify({ reason: req.reason, restoredAt: new Date().toISOString() })},
            NULL
          )
        `;
      });

      return { success: true };

    } catch (error) {
      console.error('Customer restoration error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to restore customer");
    }
  }
);