import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface ListProjectsParams {
  page?: Query<number>;
  limit?: Query<number>;
  status?: Query<string>;
  city?: Query<string>;
  designerId?: Query<number>;
  clientId?: Query<number>;
}

interface Project {
  id: number;
  title: string;
  description?: string;
  client: {
    id: number;
    name: string;
    email: string;
  };
  designer?: {
    id: number;
    name: string;
  };
  projectManager?: {
    id: number;
    name: string;
  };
  status: string;
  priority: string;
  budget: number;
  estimatedCost?: number;
  actualCost: number;
  progressPercentage: number;
  startDate?: string;
  endDate?: string;
  city?: string;
  createdAt: string;
}

interface ListProjectsResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
}

// Lists projects with filtering and pagination
export const listProjects = api<ListProjectsParams, ListProjectsResponse>(
  { auth: true, expose: true, method: "GET", path: "/projects" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('projects.view')) {
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
      whereClause += ` AND p.designer_id = $${paramIndex}`;
      queryParams.push(auth.userID);
      paramIndex++;
    } else if (auth.roles.includes('project_manager')) {
      whereClause += ` AND p.project_manager_id = $${paramIndex}`;
      queryParams.push(auth.userID);
      paramIndex++;
    } else if (auth.roles.includes('customer')) {
      whereClause += ` AND p.client_id = $${paramIndex}`;
      queryParams.push(auth.userID);
      paramIndex++;
    }

    if (params.status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      queryParams.push(params.status);
      paramIndex++;
    }

    if (params.city) {
      whereClause += ` AND p.city = $${paramIndex}`;
      queryParams.push(params.city);
      paramIndex++;
    }

    if (params.designerId) {
      whereClause += ` AND p.designer_id = $${paramIndex}`;
      queryParams.push(params.designerId);
      paramIndex++;
    }

    if (params.clientId) {
      whereClause += ` AND p.client_id = $${paramIndex}`;
      queryParams.push(params.clientId);
      paramIndex++;
    }

    const projects = await db.rawQueryAll(`
      SELECT 
        p.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.email as client_email,
        d.first_name as designer_first_name,
        d.last_name as designer_last_name,
        pm.first_name as pm_first_name,
        pm.last_name as pm_last_name
      FROM projects p
      JOIN users c ON p.client_id = c.id
      LEFT JOIN users d ON p.designer_id = d.id
      LEFT JOIN users pm ON p.project_manager_id = pm.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, ...queryParams, limit, offset);

    const totalResult = await db.rawQueryRow(`
      SELECT COUNT(*) as total
      FROM projects p
      ${whereClause}
    `, ...queryParams);

    return {
      projects: projects.map(project => ({
        id: project.id,
        title: project.title,
        description: project.description,
        client: {
          id: project.client_id,
          name: `${project.client_first_name} ${project.client_last_name}`,
          email: project.client_email
        },
        designer: project.designer_id ? {
          id: project.designer_id,
          name: `${project.designer_first_name} ${project.designer_last_name}`
        } : undefined,
        projectManager: project.project_manager_id ? {
          id: project.project_manager_id,
          name: `${project.pm_first_name} ${project.pm_last_name}`
        } : undefined,
        status: project.status,
        priority: project.priority,
        budget: project.budget,
        estimatedCost: project.estimated_cost,
        actualCost: project.actual_cost,
        progressPercentage: project.progress_percentage,
        startDate: project.start_date,
        endDate: project.end_date,
        city: project.city,
        createdAt: project.created_at
      })),
      total: totalResult?.total || 0,
      page,
      limit
    };
  }
);
