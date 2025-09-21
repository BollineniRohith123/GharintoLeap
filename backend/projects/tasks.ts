import { api, Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { APIError } from "encore.dev/api";

export interface ProjectTask {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  progressPercentage: number;
  assignedTo: {
    name: string;
    email: string;
  } | null;
  dependencies: string[];
}

export interface TasksParams {
  projectId: number;
}

export interface TasksResponse {
  tasks: ProjectTask[];
}

// Retrieves tasks for a specific project.
export const getProjectTasks = api<TasksParams, TasksResponse>(
  { auth: true, expose: true, method: "GET", path: "/projects/:projectId/tasks" },
  async (params) => {
    const auth = getAuthData()!;

    // Verify user has access to this project
    const hasAccess = await db.queryRow<{ count: number }>`
      SELECT COUNT(*) as count
      FROM projects p
      LEFT JOIN homeowner_profiles hp ON p.homeowner_id = hp.id
      LEFT JOIN designer_profiles dp ON p.designer_id = dp.id
      LEFT JOIN manager_profiles mp ON p.project_manager_id = mp.id
      WHERE p.id = ${params.projectId} 
      AND (
        hp.user_id = ${auth.userID} OR 
        dp.user_id = ${auth.userID} OR 
        mp.user_id = ${auth.userID} OR
        ${auth.permissions.includes('projects.view')}
      )
    `;

    if (!hasAccess || hasAccess.count === 0) {
      throw APIError.permissionDenied("access denied");
    }

    const tasks = await db.queryAll<{
      id: number;
      title: string;
      description: string | null;
      start_date: string | null;
      end_date: string | null;
      status: string;
      progress_percentage: number;
      dependencies: number[];
      assignee_first_name: string | null;
      assignee_last_name: string | null;
      assignee_email: string | null;
    }>`
      SELECT 
        pt.id, pt.title, pt.description, pt.start_date, pt.end_date,
        pt.status, pt.progress_percentage, pt.dependencies,
        u.first_name as assignee_first_name, u.last_name as assignee_last_name, u.email as assignee_email
      FROM project_tasks pt
      LEFT JOIN users u ON pt.assigned_to = u.id
      WHERE pt.project_id = ${params.projectId}
      ORDER BY pt.start_date ASC
    `;

    return {
      tasks: tasks.map(task => ({
        id: task.id.toString(),
        title: task.title,
        description: task.description,
        startDate: task.start_date,
        endDate: task.end_date,
        status: task.status,
        progressPercentage: task.progress_percentage,
        assignedTo: task.assignee_first_name ? {
          name: `${task.assignee_first_name} ${task.assignee_last_name}`,
          email: task.assignee_email!
        } : null,
        dependencies: task.dependencies?.map(d => d.toString()) || []
      }))
    };
  }
);

export interface CreateTaskRequest {
  projectId: number;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  assignedTo?: number;
  dependencies?: number[];
}

export interface CreateTaskResponse {
  id: string;
  title: string;
  status: string;
}

// Creates a new task for a project.
export const createProjectTask = api<CreateTaskRequest, CreateTaskResponse>(
  { auth: true, expose: true, method: "POST", path: "/projects/:projectId/tasks" },
  async (req) => {
    const auth = getAuthData()!;

    if (!auth.permissions.includes('projects.edit')) {
      throw APIError.permissionDenied("insufficient permissions");
    }

    const task = await db.queryRow<{
      id: number;
      title: string;
      status: string;
    }>`
      INSERT INTO project_tasks (
        project_id, title, description, start_date, end_date,
        assigned_to, dependencies, status, created_at, updated_at
      )
      VALUES (
        ${req.projectId}, ${req.title}, ${req.description}, ${req.startDate},
        ${req.endDate}, ${req.assignedTo}, ${req.dependencies}, 'pending',
        NOW(), NOW()
      )
      RETURNING id, title, status
    `;

    if (!task) {
      throw APIError.internal("failed to create task");
    }

    // Notify assigned user if applicable
    if (req.assignedTo) {
      await db.exec`
        INSERT INTO notifications (user_id, title, content, type, reference_id, reference_type)
        VALUES (
          ${req.assignedTo},
          'New Task Assigned',
          'You have been assigned a new task: "${req.title}"',
          'task_assigned',
          ${task.id},
          'task'
        )
      `;
    }

    return {
      id: task.id.toString(),
      title: task.title,
      status: task.status
    };
  }
);
