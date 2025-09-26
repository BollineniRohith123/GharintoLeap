import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { ValidationService } from "../common/validation";

interface CreateProjectRequest {
  title: string;
  description?: string;
  clientId: number;
  designerId?: number;
  projectManagerId?: number;
  budget: number;
  estimatedCost?: number;
  startDate?: string;
  endDate?: string;
  city?: string;
  address?: string;
  areaSqft?: number;
  propertyType?: string;
}

interface UpdateProjectRequest {
  title?: string;
  description?: string;
  designerId?: number;
  projectManagerId?: number;
  budget?: number;
  estimatedCost?: number;
  startDate?: string;
  endDate?: string;
  estimatedEndDate?: string;
  status?: 'planning' | 'design' | 'execution' | 'completed' | 'on_hold' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  progressPercentage?: number;
  city?: string;
  address?: string;
  areaSqft?: number;
  propertyType?: string;
}

interface ProjectMilestone {
  id?: number;
  projectId?: number;
  title: string;
  description?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  budget: number;
  actualCost?: number;
  sortOrder?: number;
}

interface ProjectWorkflow {
  id?: number;
  projectId?: number;
  stage: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  assignedTo?: number;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  sortOrder: number;
}

// Create a new project
export const createProject = api(
  { auth: true, expose: true, method: "POST", path: "/projects" },
  async (req: CreateProjectRequest) => {
    const auth = getAuthData()!;

    if (!auth.permissions.includes('projects.create')) {
      throw APIError.forbidden("Insufficient permissions to create projects");
    }

    // Validate required fields
    if (!req.title || !req.clientId || !req.budget) {
      throw APIError.badRequest("Title, client ID, and budget are required");
    }

    // Verify client exists
    const client = await db.queryRow`
      SELECT id FROM users WHERE id = ${req.clientId} AND is_active = true
    `;

    if (!client) {
      throw APIError.badRequest("Invalid client ID");
    }

    // Verify designer if provided
    if (req.designerId) {
      const designer = await db.queryRow`
        SELECT u.id FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE u.id = ${req.designerId} AND r.name = 'interior_designer' AND u.is_active = true
      `;

      if (!designer) {
        throw APIError.badRequest("Invalid designer ID");
      }
    }

    // Verify project manager if provided
    if (req.projectManagerId) {
      const pm = await db.queryRow`
        SELECT u.id FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE u.id = ${req.projectManagerId} AND r.name = 'project_manager' AND u.is_active = true
      `;

      if (!pm) {
        throw APIError.badRequest("Invalid project manager ID");
      }
    }

    // Create project
    const project = await db.queryRow`
      INSERT INTO projects (
        title, description, client_id, designer_id, project_manager_id,
        budget, estimated_cost, start_date, end_date, city, address, 
        area_sqft, property_type, status, priority
      ) VALUES (
        ${req.title}, ${req.description}, ${req.clientId}, ${req.designerId}, ${req.projectManagerId},
        ${req.budget}, ${req.estimatedCost}, ${req.startDate}, ${req.endDate}, ${req.city}, ${req.address},
        ${req.areaSqft}, ${req.propertyType}, 'planning', 'medium'
      ) RETURNING *
    `;

    if (!project) {
      throw APIError.internal("Failed to create project");
    }

    // Create default workflow stages
    const defaultStages = [
      { stage: 'consultation', sortOrder: 1 },
      { stage: 'design_concept', sortOrder: 2 }, 
      { stage: 'design_development', sortOrder: 3 },
      { stage: 'material_selection', sortOrder: 4 },
      { stage: 'execution_planning', sortOrder: 5 },
      { stage: 'execution', sortOrder: 6 },
      { stage: 'final_inspection', sortOrder: 7 }
    ];

    for (const stage of defaultStages) {
      await db.exec`
        INSERT INTO project_workflows (project_id, stage, status, sort_order)
        VALUES (${project.id}, ${stage.stage}, 'pending', ${stage.sortOrder})
      `;
    }

    // Log creation event
    await db.exec`
      INSERT INTO analytics_events (event_type, user_id, entity_type, entity_id, properties, created_at)
      VALUES ('project_created', ${auth.userID}, 'project', ${project.id}, ${JSON.stringify({ budget: req.budget })}, NOW())
    `;

    // Create notifications for assigned team members
    if (req.designerId) {
      await db.exec`
        INSERT INTO notifications (user_id, title, content, type, reference_type, reference_id)
        VALUES (
          ${req.designerId},
          'New Project Assigned',
          ${'You have been assigned as designer for project: ' + req.title},
          'project_assignment',
          'project',
          ${project.id}
        )
      `;
    }

    if (req.projectManagerId) {
      await db.exec`
        INSERT INTO notifications (user_id, title, content, type, reference_type, reference_id)
        VALUES (
          ${req.projectManagerId},
          'New Project Assigned',
          ${'You have been assigned as project manager for: ' + req.title},
          'project_assignment',
          'project',
          ${project.id}
        )
      `;
    }

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      clientId: project.client_id,
      designerId: project.designer_id,
      projectManagerId: project.project_manager_id,
      budget: project.budget,
      estimatedCost: project.estimated_cost,
      actualCost: project.actual_cost,
      status: project.status,
      priority: project.priority,
      progressPercentage: project.progress_percentage,
      startDate: project.start_date,
      endDate: project.end_date,
      estimatedEndDate: project.estimated_end_date,
      city: project.city,
      address: project.address,
      areaSqft: project.area_sqft,
      propertyType: project.property_type,
      createdAt: project.created_at,
      updatedAt: project.updated_at
    };
  }
);

// Update project
export const updateProject = api(
  { auth: true, expose: true, method: "PUT", path: "/projects/:id" },
  async ({ id, ...req }: { id: number } & UpdateProjectRequest) => {
    const auth = getAuthData()!;

    if (!auth.permissions.includes('projects.update')) {
      throw APIError.forbidden("Insufficient permissions to update projects");
    }

    // Check if project exists
    const existingProject = await db.queryRow`
      SELECT * FROM projects WHERE id = ${id}
    `;

    if (!existingProject) {
      throw APIError.notFound("Project not found");
    }

    // Role-based access control
    if (auth.roles.includes('interior_designer') && existingProject.designer_id !== parseInt(auth.userID)) {
      throw APIError.forbidden("You can only update projects assigned to you");
    }
    if (auth.roles.includes('project_manager') && existingProject.project_manager_id !== parseInt(auth.userID)) {
      throw APIError.forbidden("You can only update projects assigned to you");
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (req.title) {
      updates.push(`title = $${paramIndex}`);
      values.push(req.title);
      paramIndex++;
    }
    if (req.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(req.description);
      paramIndex++;
    }
    if (req.designerId !== undefined) {
      updates.push(`designer_id = $${paramIndex}`);
      values.push(req.designerId);
      paramIndex++;
    }
    if (req.projectManagerId !== undefined) {
      updates.push(`project_manager_id = $${paramIndex}`);
      values.push(req.projectManagerId);
      paramIndex++;
    }
    if (req.budget !== undefined) {
      updates.push(`budget = $${paramIndex}`);
      values.push(req.budget);
      paramIndex++;
    }
    if (req.estimatedCost !== undefined) {
      updates.push(`estimated_cost = $${paramIndex}`);
      values.push(req.estimatedCost);
      paramIndex++;
    }
    if (req.startDate !== undefined) {
      updates.push(`start_date = $${paramIndex}`);
      values.push(req.startDate);
      paramIndex++;
    }
    if (req.endDate !== undefined) {
      updates.push(`end_date = $${paramIndex}`);
      values.push(req.endDate);
      paramIndex++;
    }
    if (req.estimatedEndDate !== undefined) {
      updates.push(`estimated_end_date = $${paramIndex}`);
      values.push(req.estimatedEndDate);
      paramIndex++;
    }
    if (req.status) {
      updates.push(`status = $${paramIndex}`);
      values.push(req.status);
      paramIndex++;
    }
    if (req.priority) {
      updates.push(`priority = $${paramIndex}`);
      values.push(req.priority);
      paramIndex++;
    }
    if (req.progressPercentage !== undefined) {
      updates.push(`progress_percentage = $${paramIndex}`);
      values.push(req.progressPercentage);
      paramIndex++;
    }
    if (req.city) {
      updates.push(`city = $${paramIndex}`);
      values.push(req.city);
      paramIndex++;
    }
    if (req.address !== undefined) {
      updates.push(`address = $${paramIndex}`);
      values.push(req.address);
      paramIndex++;
    }
    if (req.areaSqft !== undefined) {
      updates.push(`area_sqft = $${paramIndex}`);
      values.push(req.areaSqft);
      paramIndex++;
    }
    if (req.propertyType) {
      updates.push(`property_type = $${paramIndex}`);
      values.push(req.propertyType);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw APIError.badRequest("No fields to update");
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    await db.exec(
      `UPDATE projects SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      ...values
    );

    // Log update event
    await db.exec`
      INSERT INTO analytics_events (event_type, user_id, entity_type, entity_id, properties, created_at)
      VALUES ('project_updated', ${auth.userID}, 'project', ${id}, ${JSON.stringify(req)}, NOW())
    `;

    // Get updated project
    const updatedProject = await db.queryRow`
      SELECT * FROM projects WHERE id = ${id}
    `;

    return {
      id: updatedProject.id,
      title: updatedProject.title,
      description: updatedProject.description,
      clientId: updatedProject.client_id,
      designerId: updatedProject.designer_id,
      projectManagerId: updatedProject.project_manager_id,
      budget: updatedProject.budget,
      estimatedCost: updatedProject.estimated_cost,
      actualCost: updatedProject.actual_cost,
      status: updatedProject.status,
      priority: updatedProject.priority,
      progressPercentage: updatedProject.progress_percentage,
      startDate: updatedProject.start_date,
      endDate: updatedProject.end_date,
      estimatedEndDate: updatedProject.estimated_end_date,
      city: updatedProject.city,
      address: updatedProject.address,
      areaSqft: updatedProject.area_sqft,
      propertyType: updatedProject.property_type,
      createdAt: updatedProject.created_at,
      updatedAt: updatedProject.updated_at
    };
  }
);

// Get project by ID
export const getProject = api(
  { auth: true, expose: true, method: "GET", path: "/projects/:id" },
  async ({ id }: { id: number }) => {
    const auth = getAuthData()!;

    if (!auth.permissions.includes('projects.view')) {
      throw APIError.forbidden("Insufficient permissions to view projects");
    }

    const project = await db.queryRow`
      SELECT 
        p.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.email as client_email,
        c.phone as client_phone,
        d.first_name as designer_first_name,
        d.last_name as designer_last_name,
        pm.first_name as pm_first_name,
        pm.last_name as pm_last_name
      FROM projects p
      JOIN users c ON p.client_id = c.id
      LEFT JOIN users d ON p.designer_id = d.id
      LEFT JOIN users pm ON p.project_manager_id = pm.id
      WHERE p.id = ${id}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    // Role-based access control
    if (auth.roles.includes('customer') && project.client_id !== parseInt(auth.userID)) {
      throw APIError.forbidden("You can only view your own projects");
    }
    if (auth.roles.includes('interior_designer') && project.designer_id !== parseInt(auth.userID)) {
      throw APIError.forbidden("You can only view projects assigned to you");
    }
    if (auth.roles.includes('project_manager') && project.project_manager_id !== parseInt(auth.userID)) {
      throw APIError.forbidden("You can only view projects assigned to you");
    }

    // Get project milestones
    const milestonesQuery = db.query`
      SELECT * FROM project_milestones 
      WHERE project_id = ${id} 
      ORDER BY sort_order, planned_start_date
    `;

    const milestones: ProjectMilestone[] = [];
    for await (const milestone of milestonesQuery) {
      milestones.push({
        id: milestone.id,
        projectId: milestone.project_id,
        title: milestone.title,
        description: milestone.description,
        plannedStartDate: milestone.planned_start_date,
        plannedEndDate: milestone.planned_end_date,
        actualStartDate: milestone.actual_start_date,
        actualEndDate: milestone.actual_end_date,
        status: milestone.status,
        budget: milestone.budget,
        actualCost: milestone.actual_cost,
        sortOrder: milestone.sort_order
      });
    }

    // Get project workflow
    const workflowQuery = db.query`
      SELECT 
        pw.*,
        u.first_name,
        u.last_name
      FROM project_workflows pw
      LEFT JOIN users u ON pw.assigned_to = u.id
      WHERE pw.project_id = ${id}
      ORDER BY pw.sort_order
    `;

    const workflow: ProjectWorkflow[] = [];
    for await (const stage of workflowQuery) {
      workflow.push({
        id: stage.id,
        projectId: stage.project_id,
        stage: stage.stage,
        status: stage.status,
        assignedTo: stage.assigned_to,
        startedAt: stage.started_at,
        completedAt: stage.completed_at,
        notes: stage.notes,
        sortOrder: stage.sort_order
      });
    }

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      client: {
        id: project.client_id,
        name: `${project.client_first_name} ${project.client_last_name}`,
        email: project.client_email,
        phone: project.client_phone
      },
      designer: project.designer_id ? {
        id: project.designer_id,
        name: `${project.designer_first_name} ${project.designer_last_name}`
      } : null,
      projectManager: project.project_manager_id ? {
        id: project.project_manager_id,
        name: `${project.pm_first_name} ${project.pm_last_name}`
      } : null,
      budget: project.budget,
      estimatedCost: project.estimated_cost,
      actualCost: project.actual_cost,
      status: project.status,
      priority: project.priority,
      progressPercentage: project.progress_percentage,
      startDate: project.start_date,
      endDate: project.end_date,
      estimatedEndDate: project.estimated_end_date,
      city: project.city,
      address: project.address,
      areaSqft: project.area_sqft,
      propertyType: project.property_type,
      milestones,
      workflow,
      createdAt: project.created_at,
      updatedAt: project.updated_at
    };
  }
);
