import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface ListLeadsParams {
  page?: Query<number>;
  limit?: Query<number>;
  status?: Query<string>;
  city?: Query<string>;
  assignedTo?: Query<number>;
  minScore?: Query<number>;
}

interface Lead {
  id: number;
  source: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  budgetMin?: number;
  budgetMax?: number;
  projectType?: string;
  score: number;
  status: string;
  assignedTo?: {
    id: number;
    name: string;
  };
  createdAt: string;
}

interface ListLeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
}

// Lists leads with filtering and pagination
export const listLeads = api<ListLeadsParams, ListLeadsResponse>(
  { auth: true, expose: true, method: "GET", path: "/leads" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('leads.view')) {
      throw new Error("Insufficient permissions");
    }

    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Role-based filtering
    if (auth.roles.includes('interior_designer')) {
      whereClause += ` AND l.assigned_to = $${paramIndex}`;
      queryParams.push(auth.userID);
      paramIndex++;
    }

    if (params.status) {
      whereClause += ` AND l.status = $${paramIndex}`;
      queryParams.push(params.status);
      paramIndex++;
    }

    if (params.city) {
      whereClause += ` AND l.city = $${paramIndex}`;
      queryParams.push(params.city);
      paramIndex++;
    }

    if (params.assignedTo) {
      whereClause += ` AND l.assigned_to = $${paramIndex}`;
      queryParams.push(params.assignedTo);
      paramIndex++;
    }

    if (params.minScore) {
      whereClause += ` AND l.score >= $${paramIndex}`;
      queryParams.push(params.minScore);
      paramIndex++;
    }

    const leads = await db.rawQueryAll(`
      SELECT 
        l.*,
        u.first_name as assigned_first_name,
        u.last_name as assigned_last_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      ${whereClause}
      ORDER BY l.score DESC, l.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, ...queryParams, limit, offset);

    const totalResult = await db.rawQueryRow(`
      SELECT COUNT(*) as total
      FROM leads l
      ${whereClause}
    `, ...queryParams);

    return {
      leads: leads.map(lead => ({
        id: lead.id,
        source: lead.source,
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        city: lead.city,
        budgetMin: lead.budget_min,
        budgetMax: lead.budget_max,
        projectType: lead.project_type,
        score: lead.score,
        status: lead.status,
        assignedTo: lead.assigned_to ? {
          id: lead.assigned_to,
          name: `${lead.assigned_first_name} ${lead.assigned_last_name}`
        } : undefined,
        createdAt: lead.created_at
      })),
      total: totalResult?.total || 0,
      page,
      limit
    };
  }
);
