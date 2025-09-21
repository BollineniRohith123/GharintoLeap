import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { APIError } from "encore.dev/api";

export interface CreateProjectRequest {
  title: string;
  description?: string;
  projectType: string;
  budget?: number;
  startDate?: string;
  expectedEndDate?: string;
  homeownerId?: number;
  designerId?: number;
  cityId: number;
  priority?: 'low' | 'medium' | 'high';
}

export interface CreateProjectResponse {
  id: string;
  title: string;
  status: string;
}

// Creates a new project.
export const createProject = api<CreateProjectRequest, CreateProjectResponse>(
  { auth: true, expose: true, method: "POST", path: "/projects" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('projects.create')) {
      throw APIError.permissionDenied("insufficient permissions");
    }

    const project = await db.queryRow<{
      id: number;
      title: string;
      status: string;
    }>`
      INSERT INTO projects (
        title, description, project_type, budget, start_date, 
        expected_end_date, homeowner_id, designer_id, city_id, 
        priority, status, created_at, updated_at
      )
      VALUES (
        ${req.title}, ${req.description}, ${req.projectType}, ${req.budget},
        ${req.startDate}, ${req.expectedEndDate}, ${req.homeownerId}, 
        ${req.designerId}, ${req.cityId}, ${req.priority || 'medium'}, 
        'planning', NOW(), NOW()
      )
      RETURNING id, title, status
    `;

    if (!project) {
      throw APIError.internal("failed to create project");
    }

    // Create initial notification for stakeholders
    const stakeholders = [req.homeownerId, req.designerId].filter(Boolean);
    
    for (const stakeholderId of stakeholders) {
      if (stakeholderId) {
        await db.exec`
          INSERT INTO notifications (user_id, title, content, type, reference_id, reference_type)
          VALUES (
            ${stakeholderId}, 
            'New Project Created', 
            'A new project "${req.title}" has been created and assigned to you.',
            'project_created',
            ${project.id},
            'project'
          )
        `;
      }
    }

    return {
      id: project.id.toString(),
      title: project.title,
      status: project.status
    };
  }
);
