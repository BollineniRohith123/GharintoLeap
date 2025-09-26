import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

export interface ProjectTask {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  assigned_to?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: Date;
  estimated_hours?: number;
  actual_hours?: number;
  dependencies: number[];
  created_by: number;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface CreateTaskRequest {
  project_id: number;
  title: string;
  description?: string;
  assigned_to?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  estimated_hours?: number;
  dependencies?: number[];
}

interface UpdateTaskRequest {
  title?: string;
  description?: string;
  assigned_to?: number;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  dependencies?: number[];
}

interface TaskListParams {
  page?: Query<number>;
  limit?: Query<number>;
  project_id?: Query<number>;
  assigned_to?: Query<number>;
  status?: Query<string>;
  priority?: Query<string>;
  overdue?: Query<boolean>;
}

// Create new task
export const createTask = api<CreateTaskRequest, ProjectTask>(
  { auth: true, expose: true, method: "POST", path: "/projects/tasks" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('projects.manage') && !auth.permissions.includes('tasks.create')) {
      throw APIError.forbidden("Insufficient permissions to create tasks");
    }

    // Validate required fields
    if (!req.title || !req.project_id) {
      throw APIError.badRequest("Title and project ID are required");
    }

    // Verify project exists and user has access
    const project = await db.queryRow`
      SELECT id, client_id, designer_id, project_manager_id 
      FROM projects 
      WHERE id = ${req.project_id}
    `;

    if (!project) {
      throw APIError.badRequest("Invalid project ID");
    }

    const userId = parseInt(auth.userID);
    const hasAccess = project.client_id === userId || 
                     project.designer_id === userId || 
                     project.project_manager_id === userId ||
                     auth.permissions.includes('projects.manage');

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this project");
    }

    // Verify assigned user if provided
    if (req.assigned_to) {
      const assignedUser = await db.queryRow`
        SELECT id FROM users WHERE id = ${req.assigned_to} AND is_active = true
      `;
      if (!assignedUser) {
        throw APIError.badRequest("Invalid assigned user ID");
      }
    }

    // Verify dependencies if provided
    if (req.dependencies?.length) {
      for (const depId of req.dependencies) {
        const depTask = await db.queryRow`
          SELECT id FROM project_tasks WHERE id = ${depId} AND project_id = ${req.project_id}
        `;
        if (!depTask) {
          throw APIError.badRequest(`Invalid dependency task ID: ${depId}`);
        }
      }
    }

    try {
      // Create task
      const task = await db.queryRow<ProjectTask>`
        INSERT INTO project_tasks (
          project_id, title, description, assigned_to, priority,
          due_date, estimated_hours, dependencies, created_by
        ) VALUES (
          ${req.project_id}, ${req.title}, ${req.description || null}, ${req.assigned_to || null},
          ${req.priority || 'medium'}, ${req.due_date || null}, ${req.estimated_hours || null},
          ${req.dependencies || []}, ${auth.userID}
        )
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'create', 'project_task', ${task.id}, ${JSON.stringify(task)})
      `;

      return task;

    } catch (error) {
      console.error('Task creation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create task");
    }
  }
);

// Get task by ID
export const getTask = api<{ id: number }, { task: ProjectTask; assignee?: any; dependencies?: ProjectTask[] }>(
  { auth: true, expose: true, method: "GET", path: "/projects/tasks/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Get task with project info
    const task = await db.queryRow<ProjectTask>`
      SELECT pt.*, p.client_id, p.designer_id, p.project_manager_id
      FROM project_tasks pt
      JOIN projects p ON pt.project_id = p.id
      WHERE pt.id = ${id}
    `;

    if (!task) {
      throw APIError.notFound("Task not found");
    }

    // Check access permissions
    const userId = parseInt(auth.userID);
    const hasAccess = task.client_id === userId || 
                     task.designer_id === userId || 
                     task.project_manager_id === userId ||
                     task.assigned_to === userId ||
                     auth.permissions.includes('projects.view');

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this task");
    }

    // Get assignee info if assigned
    let assignee = null;
    if (task.assigned_to) {
      assignee = await db.queryRow`
        SELECT id, first_name, last_name, email
        FROM users 
        WHERE id = ${task.assigned_to}
      `;
    }

    // Get dependency tasks
    const dependencies: ProjectTask[] = [];
    if (task.dependencies?.length) {
      const depQuery = db.query<ProjectTask>`
        SELECT * FROM project_tasks 
        WHERE id = ANY(${task.dependencies})
        ORDER BY title
      `;

      for await (const dep of depQuery) {
        dependencies.push(dep);
      }
    }

    return { task, assignee, dependencies };
  }
);

// List tasks with filtering
export const listTasks = api<TaskListParams, { tasks: any[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/projects/tasks" },
  async (params) => {
    const auth = getAuthData()!;
    
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Role-based filtering
    const userId = parseInt(auth.userID);
    if (!auth.permissions.includes('projects.view')) {
      whereClause += ` AND (p.client_id = $${paramIndex} OR p.designer_id = $${paramIndex} OR p.project_manager_id = $${paramIndex} OR pt.assigned_to = $${paramIndex})`;
      queryParams.push(userId);
      paramIndex++;
    }

    // Project filter
    if (params.project_id) {
      whereClause += ` AND pt.project_id = $${paramIndex}`;
      queryParams.push(params.project_id);
      paramIndex++;
    }

    // Assigned to filter
    if (params.assigned_to) {
      whereClause += ` AND pt.assigned_to = $${paramIndex}`;
      queryParams.push(params.assigned_to);
      paramIndex++;
    }

    // Status filter
    if (params.status) {
      whereClause += ` AND pt.status = $${paramIndex}`;
      queryParams.push(params.status);
      paramIndex++;
    }

    // Priority filter
    if (params.priority) {
      whereClause += ` AND pt.priority = $${paramIndex}`;
      queryParams.push(params.priority);
      paramIndex++;
    }

    // Overdue filter
    if (params.overdue) {
      whereClause += ` AND pt.due_date < CURRENT_DATE AND pt.status NOT IN ('completed', 'cancelled')`;
    }

    try {
      // Get tasks
      const tasksQuery = `
        SELECT 
          pt.*,
          p.title as project_title,
          u.first_name || ' ' || u.last_name as assignee_name,
          creator.first_name || ' ' || creator.last_name as created_by_name
        FROM project_tasks pt
        JOIN projects p ON pt.project_id = p.id
        LEFT JOIN users u ON pt.assigned_to = u.id
        LEFT JOIN users creator ON pt.created_by = creator.id
        ${whereClause}
        ORDER BY 
          CASE pt.priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END,
          pt.due_date ASC NULLS LAST,
          pt.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const tasksResult = await db.query(tasksQuery, ...queryParams);
      const tasks: any[] = [];
      for await (const task of tasksResult) {
        tasks.push({
          id: task.id,
          project_id: task.project_id,
          project_title: task.project_title,
          title: task.title,
          description: task.description,
          assigned_to: task.assigned_to,
          assignee_name: task.assignee_name,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date,
          estimated_hours: task.estimated_hours,
          actual_hours: task.actual_hours,
          dependencies: task.dependencies,
          created_by: task.created_by,
          created_by_name: task.created_by_name,
          completed_at: task.completed_at,
          created_at: task.created_at,
          updated_at: task.updated_at
        });
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM project_tasks pt
        JOIN projects p ON pt.project_id = p.id
        ${whereClause}
      `;
      const countResult = await db.query(countQuery, ...queryParams.slice(0, -2));
      let total = 0;
      for await (const row of countResult) {
        total = parseInt(row.total);
        break;
      }

      return {
        tasks,
        total,
        page,
        limit
      };

    } catch (error) {
      console.error('List tasks error:', error);
      throw APIError.internal("Failed to fetch tasks");
    }
  }
);

// Update task
export const updateTask = api<{ id: number } & UpdateTaskRequest, ProjectTask>(
  { auth: true, expose: true, method: "PUT", path: "/projects/tasks/:id" },
  async ({ id, ...req }) => {
    const auth = getAuthData()!;
    
    // Get existing task
    const existingTask = await db.queryRow<ProjectTask>`
      SELECT pt.*, p.client_id, p.designer_id, p.project_manager_id
      FROM project_tasks pt
      JOIN projects p ON pt.project_id = p.id
      WHERE pt.id = ${id}
    `;

    if (!existingTask) {
      throw APIError.notFound("Task not found");
    }

    // Check permissions
    const userId = parseInt(auth.userID);
    const canEdit = existingTask.client_id === userId || 
                   existingTask.designer_id === userId || 
                   existingTask.project_manager_id === userId ||
                   existingTask.assigned_to === userId ||
                   existingTask.created_by === userId ||
                   auth.permissions.includes('projects.manage');

    if (!canEdit) {
      throw APIError.forbidden("Access denied to edit this task");
    }

    // Verify assigned user if provided
    if (req.assigned_to) {
      const assignedUser = await db.queryRow`
        SELECT id FROM users WHERE id = ${req.assigned_to} AND is_active = true
      `;
      if (!assignedUser) {
        throw APIError.badRequest("Invalid assigned user ID");
      }
    }

    // Verify dependencies if provided
    if (req.dependencies?.length) {
      for (const depId of req.dependencies) {
        if (depId === id) {
          throw APIError.badRequest("Task cannot depend on itself");
        }
        const depTask = await db.queryRow`
          SELECT id FROM project_tasks WHERE id = ${depId} AND project_id = ${existingTask.project_id}
        `;
        if (!depTask) {
          throw APIError.badRequest(`Invalid dependency task ID: ${depId}`);
        }
      }
    }

    try {
      // Handle status change to completed
      const completedAt = req.status === 'completed' && existingTask.status !== 'completed' ? new Date() : existingTask.completed_at;

      // Update task
      const task = await db.queryRow<ProjectTask>`
        UPDATE project_tasks SET
          title = COALESCE(${req.title}, title),
          description = COALESCE(${req.description}, description),
          assigned_to = COALESCE(${req.assigned_to}, assigned_to),
          status = COALESCE(${req.status}, status),
          priority = COALESCE(${req.priority}, priority),
          due_date = COALESCE(${req.due_date}, due_date),
          estimated_hours = COALESCE(${req.estimated_hours}, estimated_hours),
          actual_hours = COALESCE(${req.actual_hours}, actual_hours),
          dependencies = COALESCE(${req.dependencies}, dependencies),
          completed_at = ${completedAt},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'update', 'project_task', ${id}, ${JSON.stringify(existingTask)}, ${JSON.stringify(task)})
      `;

      return task;

    } catch (error) {
      console.error('Task update error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update task");
    }
  }
);

// Delete task
export const deleteTask = api<{ id: number }, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "DELETE", path: "/projects/tasks/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Get task
    const task = await db.queryRow<ProjectTask>`
      SELECT pt.*, p.client_id, p.designer_id, p.project_manager_id
      FROM project_tasks pt
      JOIN projects p ON pt.project_id = p.id
      WHERE pt.id = ${id}
    `;

    if (!task) {
      throw APIError.notFound("Task not found");
    }

    // Check permissions
    const userId = parseInt(auth.userID);
    const canDelete = task.created_by === userId || 
                     task.project_manager_id === userId ||
                     auth.permissions.includes('projects.manage');

    if (!canDelete) {
      throw APIError.forbidden("Access denied to delete this task");
    }

    // Check if task has dependencies
    const dependentTasks = await db.queryRow`
      SELECT COUNT(*) as count
      FROM project_tasks 
      WHERE ${id} = ANY(dependencies)
    `;

    if (parseInt(dependentTasks?.count || '0') > 0) {
      throw APIError.badRequest("Cannot delete task that other tasks depend on");
    }

    try {
      // Delete task
      await db.exec`DELETE FROM project_tasks WHERE id = ${id}`;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values)
        VALUES (${auth.userID}, 'delete', 'project_task', ${id}, ${JSON.stringify(task)})
      `;

      return {
        success: true,
        message: "Task deleted successfully"
      };

    } catch (error) {
      console.error('Task deletion error:', error);
      throw APIError.internal("Failed to delete task");
    }
  }
);

// Get task statistics for project
export const getTaskStatistics = api<{ project_id: number }, { 
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  by_priority: any[];
  by_assignee: any[];
}>(
  { auth: true, expose: true, method: "GET", path: "/projects/:project_id/tasks/statistics" },
  async ({ project_id }) => {
    const auth = getAuthData()!;
    
    // Verify project access
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
                     auth.permissions.includes('projects.view');

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this project");
    }

    try {
      // Get overall statistics
      const overallStats = await db.queryRow`
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
          COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) as overdue_tasks
        FROM project_tasks
        WHERE project_id = ${project_id}
      `;

      // Get statistics by priority
      const priorityQuery = db.query`
        SELECT 
          priority,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed
        FROM project_tasks
        WHERE project_id = ${project_id}
        GROUP BY priority
        ORDER BY 
          CASE priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END
      `;

      const byPriority: any[] = [];
      for await (const row of priorityQuery) {
        byPriority.push({
          priority: row.priority,
          total: parseInt(row.count || '0'),
          completed: parseInt(row.completed || '0')
        });
      }

      // Get statistics by assignee
      const assigneeQuery = db.query`
        SELECT 
          pt.assigned_to,
          u.first_name || ' ' || u.last_name as assignee_name,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE pt.status = 'completed') as completed
        FROM project_tasks pt
        LEFT JOIN users u ON pt.assigned_to = u.id
        WHERE pt.project_id = ${project_id}
        GROUP BY pt.assigned_to, u.first_name, u.last_name
        ORDER BY count DESC
      `;

      const byAssignee: any[] = [];
      for await (const row of assigneeQuery) {
        byAssignee.push({
          assigned_to: row.assigned_to,
          assignee_name: row.assignee_name || 'Unassigned',
          total: parseInt(row.count || '0'),
          completed: parseInt(row.completed || '0')
        });
      }

      const totalTasks = parseInt(overallStats?.total_tasks || '0');
      const completedTasks = parseInt(overallStats?.completed_tasks || '0');
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        in_progress_tasks: parseInt(overallStats?.in_progress_tasks || '0'),
        overdue_tasks: parseInt(overallStats?.overdue_tasks || '0'),
        completion_rate: completionRate,
        by_priority: byPriority,
        by_assignee: byAssignee
      };

    } catch (error) {
      console.error('Get task statistics error:', error);
      throw APIError.internal("Failed to fetch task statistics");
    }
  }
);
