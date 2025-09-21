import { api, Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface ProjectListParams {
  page?: Query<number>;
  limit?: Query<number>;
  status?: Query<string>;
  cityId?: Query<number>;
  search?: Query<string>;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  projectType: string | null;
  status: string;
  priority: string;
  budget: number | null;
  progressPercentage: number;
  startDate: string | null;
  expectedEndDate: string | null;
  homeowner: {
    name: string;
    email: string;
  } | null;
  designer: {
    name: string;
    businessName: string | null;
  } | null;
  city: {
    name: string;
    state: string;
  } | null;
  createdAt: string;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
}

// Retrieves a list of projects based on user permissions and filters.
export const listProjects = api<ProjectListParams, ProjectListResponse>(
  { auth: true, expose: true, method: "GET", path: "/projects" },
  async (params) => {
    const auth = getAuthData()!;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Role-based filtering
    if (auth.roles.includes('homeowner')) {
      whereClause += ` AND hp.user_id = $${paramIndex++}`;
      queryParams.push(parseInt(auth.userID));
    } else if (auth.roles.includes('interior_designer')) {
      whereClause += ` AND dp.user_id = $${paramIndex++}`;
      queryParams.push(parseInt(auth.userID));
    } else if (auth.roles.includes('project_manager')) {
      whereClause += ` AND mp.user_id = $${paramIndex++}`;
      queryParams.push(parseInt(auth.userID));
    }

    // Status filter
    if (params.status) {
      whereClause += ` AND p.status = $${paramIndex++}`;
      queryParams.push(params.status);
    }

    // City filter
    if (params.cityId) {
      whereClause += ` AND p.city_id = $${paramIndex++}`;
      queryParams.push(params.cityId);
    }

    // Search filter
    if (params.search) {
      whereClause += ` AND (p.title ILIKE $${paramIndex++} OR p.description ILIKE $${paramIndex})`;
      queryParams.push(`%${params.search}%`, `%${params.search}%`);
      paramIndex += 2;
    }

    const query = `
      SELECT 
        p.id, p.title, p.description, p.project_type, p.status, p.priority,
        p.budget, p.progress_percentage, p.start_date, p.expected_end_date,
        p.created_at,
        hu.first_name as homeowner_first_name, hu.last_name as homeowner_last_name, hu.email as homeowner_email,
        du.first_name as designer_first_name, du.last_name as designer_last_name, dp.business_name,
        c.name as city_name, c.state as city_state
      FROM projects p
      LEFT JOIN homeowner_profiles hp ON p.homeowner_id = hp.id
      LEFT JOIN users hu ON hp.user_id = hu.id
      LEFT JOIN designer_profiles dp ON p.designer_id = dp.id
      LEFT JOIN users du ON dp.user_id = du.id
      LEFT JOIN manager_profiles mp ON p.project_manager_id = mp.id
      LEFT JOIN cities c ON p.city_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    queryParams.push(limit, offset);

    const projects = await db.rawQueryAll<any>(query, ...queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM projects p
      LEFT JOIN homeowner_profiles hp ON p.homeowner_id = hp.id
      LEFT JOIN designer_profiles dp ON p.designer_id = dp.id
      LEFT JOIN manager_profiles mp ON p.project_manager_id = mp.id
      ${whereClause}
    `;

    const countResult = await db.rawQueryRow<{ total: number }>(
      countQuery, 
      ...queryParams.slice(0, -2) // Remove limit and offset
    );

    return {
      projects: projects.map(p => ({
        id: p.id.toString(),
        title: p.title,
        description: p.description,
        projectType: p.project_type,
        status: p.status,
        priority: p.priority,
        budget: p.budget,
        progressPercentage: p.progress_percentage,
        startDate: p.start_date,
        expectedEndDate: p.expected_end_date,
        homeowner: p.homeowner_first_name ? {
          name: `${p.homeowner_first_name} ${p.homeowner_last_name}`,
          email: p.homeowner_email
        } : null,
        designer: p.designer_first_name ? {
          name: `${p.designer_first_name} ${p.designer_last_name}`,
          businessName: p.business_name
        } : null,
        city: p.city_name ? {
          name: p.city_name,
          state: p.city_state
        } : null,
        createdAt: p.created_at
      })),
      total: countResult?.total || 0,
      page,
      limit
    };
  }
);
