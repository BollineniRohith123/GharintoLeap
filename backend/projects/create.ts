import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface CreateProjectRequest {
  title: string;
  description?: string;
  clientId: number;
  designerId?: number;
  budget: number;
  startDate?: string;
  endDate?: string;
  city?: string;
  address?: string;
  areaSqft?: number;
  propertyType?: string;
  leadId?: number;
}

interface Project {
  id: number;
  title: string;
  description?: string;
  clientId: number;
  designerId?: number;
  projectManagerId?: number;
  status: string;
  priority: string;
  budget: number;
  startDate?: string;
  endDate?: string;
  city?: string;
  address?: string;
  areaSqft?: number;
  propertyType?: string;
  progressPercentage: number;
  createdAt: string;
}

// Creates a new project
export const createProject = api<CreateProjectRequest, Project>(
  { auth: true, expose: true, method: "POST", path: "/projects" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('projects.create')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    // Assign project manager (current user if they're a PM, or find available PM)
    let projectManagerId = null;
    if (auth.roles.includes('project_manager')) {
      projectManagerId = parseInt(auth.userID);
    } else {
      const pm = await db.queryRow`
        SELECT u.id, COUNT(p.id) as project_count
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        LEFT JOIN projects p ON u.id = p.project_manager_id AND p.status NOT IN ('completed', 'cancelled')
        WHERE r.name = 'project_manager' AND u.is_active = true
        GROUP BY u.id
        ORDER BY project_count ASC
        LIMIT 1
      `;
      projectManagerId = pm?.id;
    }

    const project = await db.queryRow`
      INSERT INTO projects (
        title, description, client_id, designer_id, project_manager_id,
        budget, start_date, end_date, city, address, area_sqft, property_type
      ) VALUES (
        ${req.title}, ${req.description}, ${req.clientId}, ${req.designerId}, ${projectManagerId},
        ${req.budget}, ${req.startDate}, ${req.endDate}, ${req.city}, ${req.address}, ${req.areaSqft}, ${req.propertyType}
      ) RETURNING *
    `;

    if (!project) {
      throw APIError.internal("Failed to create project");
    }

    // Mark lead as converted if leadId provided
    if (req.leadId) {
      await db.exec`
        UPDATE leads SET status = 'converted', converted_to_project = ${project.id} WHERE id = ${req.leadId}
      `;
    }

    // Create default milestones
    const defaultMilestones = [
      { title: 'Design Planning', order: 1, budget: Math.floor(req.budget * 0.1) },
      { title: 'Material Selection', order: 2, budget: Math.floor(req.budget * 0.2) },
      { title: 'Execution Phase 1', order: 3, budget: Math.floor(req.budget * 0.3) },
      { title: 'Execution Phase 2', order: 4, budget: Math.floor(req.budget * 0.25) },
      { title: 'Final Touches', order: 5, budget: Math.floor(req.budget * 0.15) }
    ];

    for (const milestone of defaultMilestones) {
      await db.exec`
        INSERT INTO project_milestones (project_id, title, budget, sort_order)
        VALUES (${project.id}, ${milestone.title}, ${milestone.budget}, ${milestone.order})
      `;
    }

    // Create notifications
    if (req.designerId) {
      await db.exec`
        INSERT INTO notifications (user_id, title, content, type, reference_type, reference_id)
        VALUES (
          ${req.designerId},
          'New Project Assigned',
          'A new project "${req.title}" has been assigned to you',
          'project_assignment',
          'project',
          ${project.id}
        )
      `;
    }

    // Log the project creation event
    await db.exec`
      INSERT INTO analytics_events (event_type, user_id, entity_type, entity_id, properties, created_at)
      VALUES ('project_created', ${auth.userID}, 'project', ${project.id}, ${JSON.stringify({ budget: req.budget })}, NOW())
    `;

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      clientId: project.client_id,
      designerId: project.designer_id,
      projectManagerId: project.project_manager_id,
      status: project.status,
      priority: project.priority,
      budget: project.budget,
      startDate: project.start_date,
      endDate: project.end_date,
      city: project.city,
      address: project.address,
      areaSqft: project.area_sqft,
      propertyType: project.property_type,
      progressPercentage: project.progress_percentage,
      createdAt: project.created_at
    };
  }
);
