import { api, Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface LeadListParams {
  page?: Query<number>;
  limit?: Query<number>;
  status?: Query<string>;
  cityId?: Query<number>;
  assignedTo?: Query<number>;
  source?: Query<string>;
}

export interface Lead {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  source: string | null;
  leadType: string | null;
  projectType: string | null;
  budgetRange: string | null;
  status: string;
  score: number;
  assignedTo: {
    name: string;
    email: string;
  } | null;
  city: {
    name: string;
    state: string;
  } | null;
  createdAt: string;
}

export interface LeadListResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
}

// Retrieves a list of leads based on user permissions and filters.
export const listLeads = api<LeadListParams, LeadListResponse>(
  { auth: true, expose: true, method: "GET", path: "/leads" },
  async (params) => {
    const auth = getAuthData()!;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Role-based filtering
    if (!auth.permissions.includes('leads.view')) {
      // If user can't view all leads, only show assigned ones
      whereClause += ` AND l.assigned_to = $${paramIndex++}`;
      queryParams.push(parseInt(auth.userID));
    }

    // Status filter
    if (params.status) {
      whereClause += ` AND l.status = $${paramIndex++}`;
      queryParams.push(params.status);
    }

    // City filter
    if (params.cityId) {
      whereClause += ` AND l.city_id = $${paramIndex++}`;
      queryParams.push(params.cityId);
    }

    // Assigned to filter
    if (params.assignedTo) {
      whereClause += ` AND l.assigned_to = $${paramIndex++}`;
      queryParams.push(params.assignedTo);
    }

    // Source filter
    if (params.source) {
      whereClause += ` AND l.source = $${paramIndex++}`;
      queryParams.push(params.source);
    }

    const query = `
      SELECT 
        l.id, l.customer_name, l.customer_email, l.customer_phone,
        l.source, l.lead_type, l.project_type, l.budget_range,
        l.status, l.score, l.created_at,
        u.first_name as assignee_first_name, u.last_name as assignee_last_name, u.email as assignee_email,
        c.name as city_name, c.state as city_state
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      LEFT JOIN cities c ON l.city_id = c.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    queryParams.push(limit, offset);

    const leads = await db.rawQueryAll<any>(query, ...queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM leads l
      ${whereClause}
    `;

    const countResult = await db.rawQueryRow<{ total: number }>(
      countQuery, 
      ...queryParams.slice(0, -2)
    );

    return {
      leads: leads.map(l => ({
        id: l.id.toString(),
        customerName: l.customer_name,
        customerEmail: l.customer_email,
        customerPhone: l.customer_phone,
        source: l.source,
        leadType: l.lead_type,
        projectType: l.project_type,
        budgetRange: l.budget_range,
        status: l.status,
        score: l.score,
        assignedTo: l.assignee_first_name ? {
          name: `${l.assignee_first_name} ${l.assignee_last_name}`,
          email: l.assignee_email
        } : null,
        city: l.city_name ? {
          name: l.city_name,
          state: l.city_state
        } : null,
        createdAt: l.created_at
      })),
      total: countResult?.total || 0,
      page,
      limit
    };
  }
);
