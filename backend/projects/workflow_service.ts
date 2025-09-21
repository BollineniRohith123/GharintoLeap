import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { AppError, withErrorHandling, safeAsync } from "../common/error_handler";

export interface ProjectWorkflow {
  id: number;
  project_id: number;
  stage: string;
  status: string;
  assigned_to?: number;
  assigned_to_name?: string;
  started_at?: Date;
  completed_at?: Date;
  notes?: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateWorkflowRequest {
  project_id: number;
  stage: string;
  assigned_to?: number;
  notes?: string;
  sort_order?: number;
}

export interface UpdateWorkflowRequest {
  workflow_id: number;
  status?: string;
  assigned_to?: number;
  notes?: string;
  started_at?: Date;
  completed_at?: Date;
}

export interface WorkflowTemplate {
  stage: string;
  sort_order: number;
  typical_duration_days: number;
  required_role?: string;
}

const DEFAULT_WORKFLOW_STAGES: WorkflowTemplate[] = [
  { stage: "Initial Consultation", sort_order: 1, typical_duration_days: 2, required_role: "interior_designer" },
  { stage: "Site Measurement", sort_order: 2, typical_duration_days: 1, required_role: "interior_designer" },
  { stage: "Concept Design", sort_order: 3, typical_duration_days: 7, required_role: "interior_designer" },
  { stage: "Design Approval", sort_order: 4, typical_duration_days: 3, required_role: "customer" },
  { stage: "Detailed Drawings", sort_order: 5, typical_duration_days: 10, required_role: "interior_designer" },
  { stage: "Material Selection", sort_order: 6, typical_duration_days: 5, required_role: "interior_designer" },
  { stage: "Budget Finalization", sort_order: 7, typical_duration_days: 2, required_role: "project_manager" },
  { stage: "Vendor Coordination", sort_order: 8, typical_duration_days: 3, required_role: "project_manager" },
  { stage: "Construction Start", sort_order: 9, typical_duration_days: 1, required_role: "project_manager" },
  { stage: "Electrical Work", sort_order: 10, typical_duration_days: 7, required_role: "vendor" },
  { stage: "Plumbing Work", sort_order: 11, typical_duration_days: 5, required_role: "vendor" },
  { stage: "Flooring", sort_order: 12, typical_duration_days: 10, required_role: "vendor" },
  { stage: "Wall Finishing", sort_order: 13, typical_duration_days: 8, required_role: "vendor" },
  { stage: "Furniture Installation", sort_order: 14, typical_duration_days: 5, required_role: "vendor" },
  { stage: "Lighting Setup", sort_order: 15, typical_duration_days: 3, required_role: "vendor" },
  { stage: "Final Inspection", sort_order: 16, typical_duration_days: 1, required_role: "project_manager" },
  { stage: "Client Handover", sort_order: 17, typical_duration_days: 1, required_role: "interior_designer" },
  { stage: "Project Closure", sort_order: 18, typical_duration_days: 1, required_role: "project_manager" }
];

export const createProjectWorkflows = api<{ project_id: number }, { workflows: ProjectWorkflow[] }>(
  { auth: true, expose: true, method: "POST", path: "/projects/:project_id/workflows" },
  async ({ project_id }) => {
    const auth = getAuthData()!;

    // Check if user can create workflows
    if (!auth.permissions.includes('projects.manage') && !auth.permissions.includes('projects.edit')) {
      throw APIError.forbidden("Access denied to create workflows");
    }

    // Verify project exists and user has access
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
                     auth.permissions.includes('projects.manage');

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this project");
    }

    // Check if workflows already exist
    const existingWorkflows = await db.queryRow`
      SELECT COUNT(*) as count FROM project_workflows WHERE project_id = ${project_id}
    `;

    if (existingWorkflows?.count > 0) {
      throw APIError.alreadyExists("Workflows already exist for this project");
    }

    // Create workflows from template
    const workflows: ProjectWorkflow[] = [];
    
    for (const template of DEFAULT_WORKFLOW_STAGES) {
      // Auto-assign based on role
      let assignedTo: number | null = null;
      
      if (template.required_role === 'interior_designer' && project.designer_id) {
        assignedTo = project.designer_id;
      } else if (template.required_role === 'project_manager' && project.project_manager_id) {
        assignedTo = project.project_manager_id;
      }

      const workflow = await db.queryRow<ProjectWorkflow>`
        INSERT INTO project_workflows (project_id, stage, status, assigned_to, sort_order)
        VALUES (${project_id}, ${template.stage}, 'pending', ${assignedTo}, ${template.sort_order})
        RETURNING *
      `;

      if (workflow) {
        // Get assigned user name if exists
        if (assignedTo) {
          const user = await db.queryRow<{ first_name: string; last_name: string }>`
            SELECT first_name, last_name FROM users WHERE id = ${assignedTo}
          `;
          workflow.assigned_to_name = user ? `${user.first_name} ${user.last_name}` : undefined;
        }
        
        workflows.push(workflow);
      }
    }

    return { workflows };
  }
);

export const getProjectWorkflows = api<{ project_id: number }, { workflows: ProjectWorkflow[] }>(
  { auth: true, expose: true, method: "GET", path: "/projects/:project_id/workflows" },
  async ({ project_id }) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Verify project access
    const project = await db.queryRow`
      SELECT id, client_id, designer_id, project_manager_id 
      FROM projects 
      WHERE id = ${project_id}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    const hasAccess = project.client_id === userId || 
                     project.designer_id === userId || 
                     project.project_manager_id === userId ||
                     auth.permissions.includes('projects.view');

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this project");
    }

    const workflowsQuery = db.query<ProjectWorkflow>`
      SELECT 
        pw.*,
        u.first_name || ' ' || u.last_name as assigned_to_name
      FROM project_workflows pw
      LEFT JOIN users u ON pw.assigned_to = u.id
      WHERE pw.project_id = ${project_id}
      ORDER BY pw.sort_order ASC
    `;

    const workflows: ProjectWorkflow[] = [];
    for await (const workflow of workflowsQuery) {
      workflows.push(workflow);
    }

    return { workflows };
  }
);

export const updateWorkflow = api<UpdateWorkflowRequest, ProjectWorkflow>(
  { auth: true, expose: true, method: "PUT", path: "/workflows/update" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Get workflow and project info
    const workflow = await db.queryRow<{
      id: number;
      project_id: number;
      stage: string;
      status: string;
      assigned_to?: number;
    }>`
      SELECT id, project_id, stage, status, assigned_to
      FROM project_workflows 
      WHERE id = ${req.workflow_id}
    `;

    if (!workflow) {
      throw APIError.notFound("Workflow not found");
    }

    // Check if user can update this workflow
    const project = await db.queryRow`
      SELECT client_id, designer_id, project_manager_id 
      FROM projects 
      WHERE id = ${workflow.project_id}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    const canUpdate = workflow.assigned_to === userId ||
                     project.designer_id === userId ||
                     project.project_manager_id === userId ||
                     auth.permissions.includes('projects.manage');

    if (!canUpdate) {
      throw APIError.forbidden("Access denied to update this workflow");
    }

    // Build update query
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (req.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      params.push(req.status);
      
      // Auto-set timestamps based on status
      if (req.status === 'in_progress' && workflow.status === 'pending') {
        updateFields.push(`started_at = NOW()`);
      } else if (req.status === 'completed') {
        updateFields.push(`completed_at = NOW()`);
      }
    }

    if (req.assigned_to !== undefined) {
      updateFields.push(`assigned_to = $${paramIndex++}`);
      params.push(req.assigned_to);
    }

    if (req.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      params.push(req.notes);
    }

    if (req.started_at !== undefined) {
      updateFields.push(`started_at = $${paramIndex++}`);
      params.push(req.started_at);
    }

    if (req.completed_at !== undefined) {
      updateFields.push(`completed_at = $${paramIndex++}`);
      params.push(req.completed_at);
    }

    if (updateFields.length === 0) {
      throw APIError.badRequest("No fields to update");
    }

    updateFields.push(`updated_at = NOW()`);
    params.push(req.workflow_id);

    const updateQuery = `
      UPDATE project_workflows 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updatedWorkflow = await db.rawQueryRow<ProjectWorkflow>(updateQuery, ...params);

    if (!updatedWorkflow) {
      throw APIError.internal("Failed to update workflow");
    }

    // Get assigned user name
    if (updatedWorkflow.assigned_to) {
      const user = await db.queryRow<{ first_name: string; last_name: string }>`
        SELECT first_name, last_name FROM users WHERE id = ${updatedWorkflow.assigned_to}
      `;
      updatedWorkflow.assigned_to_name = user ? `${user.first_name} ${user.last_name}` : undefined;
    }

    // Update project progress if workflow completed
    if (req.status === 'completed') {
      await updateProjectProgress(workflow.project_id);
    }

    return updatedWorkflow;
  }
);

export const assignWorkflow = api<{ 
  workflow_id: number; 
  assigned_to: number;
}, ProjectWorkflow>(
  { auth: true, expose: true, method: "POST", path: "/workflows/:workflow_id/assign" },
  async ({ workflow_id, assigned_to }) => {
    const auth = getAuthData()!;

    // Check if user can assign workflows
    if (!auth.permissions.includes('projects.manage')) {
      throw APIError.forbidden("Access denied to assign workflows");
    }

    // Verify assignee exists
    const assignee = await db.queryRow`
      SELECT id, first_name, last_name FROM users WHERE id = ${assigned_to}
    `;

    if (!assignee) {
      throw APIError.notFound("Assignee not found");
    }

    const updatedWorkflow = await db.queryRow<ProjectWorkflow>`
      UPDATE project_workflows 
      SET assigned_to = ${assigned_to}, updated_at = NOW()
      WHERE id = ${workflow_id}
      RETURNING *
    `;

    if (!updatedWorkflow) {
      throw APIError.notFound("Workflow not found");
    }

    updatedWorkflow.assigned_to_name = `${assignee.first_name} ${assignee.last_name}`;

    // Create notification for assignee
    await db.exec`
      INSERT INTO notifications (user_id, title, content, type, reference_type, reference_id)
      VALUES (
        ${assigned_to},
        'New Workflow Assignment',
        ${'You have been assigned to: ' + updatedWorkflow.stage},
        'workflow_assignment',
        'workflow',
        ${workflow_id}
      )
    `;

    return updatedWorkflow;
  }
);

export const getWorkflowTemplate = api<void, { templates: WorkflowTemplate[] }>(
  { auth: true, expose: true, method: "GET", path: "/workflows/template" },
  async () => {
    const auth = getAuthData()!;

    // Check if user can view templates
    if (!auth.permissions.includes('projects.view')) {
      throw APIError.forbidden("Access denied to view workflow templates");
    }

    return { templates: DEFAULT_WORKFLOW_STAGES };
  }
);

export const getUserWorkflows = api<{ 
  status?: string;
  limit?: number;
  offset?: number;
}, { workflows: ProjectWorkflow[]; total_count: number }>(
  { auth: true, expose: true, method: "GET", path: "/workflows/assigned" },
  async ({ status, limit = 20, offset = 0 }) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    let whereClause = "WHERE pw.assigned_to = $1";
    const params = [userId, limit, offset];
    let paramIndex = 4;

    if (status) {
      whereClause += ` AND pw.status = $${paramIndex++}`;
      params.splice(-2, 0, status);
    }

    const workflowsQuery = db.rawQuery<ProjectWorkflow & { project_title: string }>(`
      SELECT 
        pw.*,
        p.title as project_title,
        u.first_name || ' ' || u.last_name as assigned_to_name
      FROM project_workflows pw
      JOIN projects p ON pw.project_id = p.id
      LEFT JOIN users u ON pw.assigned_to = u.id
      ${whereClause}
      ORDER BY 
        CASE WHEN pw.status = 'in_progress' THEN 1
             WHEN pw.status = 'pending' THEN 2
             ELSE 3 END,
        pw.sort_order ASC
      LIMIT $${paramIndex - 2} OFFSET $${paramIndex - 1}
    `, ...params);

    const workflows: ProjectWorkflow[] = [];
    for await (const workflow of workflowsQuery) {
      workflows.push(workflow);
    }

    const countResult = await db.rawQueryRow<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM project_workflows pw
      JOIN projects p ON pw.project_id = p.id
      ${whereClause.replace(/LIMIT.*$/, '')}
    `, ...params.slice(0, -2));

    return {
      workflows,
      total_count: countResult?.count || 0
    };
  }
);

async function updateProjectProgress(projectId: number): Promise<void> {
  // Calculate progress percentage based on completed workflows
  const progressResult = await db.queryRow<{ progress: number }>`
    SELECT 
      ROUND(
        (COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100
      ) as progress
    FROM project_workflows
    WHERE project_id = ${projectId}
  `;

  if (progressResult) {
    await db.exec`
      UPDATE projects 
      SET progress_percentage = ${progressResult.progress}, updated_at = NOW()
      WHERE id = ${projectId}
    `;
  }
}