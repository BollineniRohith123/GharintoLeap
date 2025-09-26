import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface ProjectTimeline {
  project_id: number;
  project_title: string;
  start_date: Date;
  estimated_end_date?: Date;
  actual_end_date?: Date;
  status: string;
  progress_percentage: number;
  milestones: Milestone[];
  tasks: TimelineTask[];
  change_orders: TimelineChangeOrder[];
}

interface Milestone {
  id: number;
  title: string;
  description?: string;
  due_date: Date;
  completed_at?: Date;
  status: 'pending' | 'completed' | 'overdue';
  dependencies: number[];
}

interface TimelineTask {
  id: number;
  title: string;
  assigned_to?: number;
  assignee_name?: string;
  status: string;
  priority: string;
  due_date?: Date;
  estimated_hours?: number;
  actual_hours?: number;
  dependencies: number[];
}

interface TimelineChangeOrder {
  id: number;
  title: string;
  cost_impact: number;
  time_impact_days: number;
  status: string;
  requested_at: Date;
  approved_at?: Date;
}

interface CreateMilestoneRequest {
  project_id: number;
  title: string;
  description?: string;
  due_date: string;
  dependencies?: number[];
}

interface UpdateMilestoneRequest {
  title?: string;
  description?: string;
  due_date?: string;
  dependencies?: number[];
}

interface TimelineParams {
  project_id: Query<number>;
  include_tasks?: Query<boolean>;
  include_change_orders?: Query<boolean>;
}

// Get project timeline
export const getProjectTimeline = api<TimelineParams, ProjectTimeline>(
  { auth: true, expose: true, method: "GET", path: "/projects/timeline" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Verify project access
    const project = await db.queryRow`
      SELECT id, title, start_date, estimated_end_date, actual_end_date, status,
             client_id, designer_id, project_manager_id
      FROM projects 
      WHERE id = ${params.project_id}
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
      // Calculate progress percentage
      const progressData = await db.queryRow`
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks
        FROM project_tasks
        WHERE project_id = ${params.project_id}
      `;

      const totalTasks = parseInt(progressData?.total_tasks || '0');
      const completedTasks = parseInt(progressData?.completed_tasks || '0');
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Get milestones (for now, we'll create virtual milestones based on project phases)
      const milestones: Milestone[] = [
        {
          id: 1,
          title: "Project Kickoff",
          description: "Initial project setup and planning",
          due_date: project.start_date,
          completed_at: project.start_date,
          status: 'completed',
          dependencies: []
        },
        {
          id: 2,
          title: "Design Phase",
          description: "Complete design and get client approval",
          due_date: new Date(project.start_date.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
          completed_at: project.status === 'completed' ? new Date() : undefined,
          status: project.status === 'completed' ? 'completed' : 'pending',
          dependencies: [1]
        },
        {
          id: 3,
          title: "Implementation",
          description: "Execute the interior design work",
          due_date: project.estimated_end_date || new Date(),
          completed_at: project.actual_end_date,
          status: project.status === 'completed' ? 'completed' : 'pending',
          dependencies: [2]
        }
      ];

      // Get tasks if requested
      let tasks: TimelineTask[] = [];
      if (params.include_tasks) {
        const tasksQuery = db.query`
          SELECT 
            pt.*,
            u.first_name || ' ' || u.last_name as assignee_name
          FROM project_tasks pt
          LEFT JOIN users u ON pt.assigned_to = u.id
          WHERE pt.project_id = ${params.project_id}
          ORDER BY pt.due_date ASC NULLS LAST, pt.created_at
        `;

        for await (const task of tasksQuery) {
          tasks.push({
            id: task.id,
            title: task.title,
            assigned_to: task.assigned_to,
            assignee_name: task.assignee_name,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
            estimated_hours: task.estimated_hours,
            actual_hours: task.actual_hours,
            dependencies: task.dependencies || []
          });
        }
      }

      // Get change orders if requested
      let changeOrders: TimelineChangeOrder[] = [];
      if (params.include_change_orders) {
        const changeOrdersQuery = db.query`
          SELECT id, title, cost_impact, time_impact_days, status, requested_at, approved_at
          FROM change_orders
          WHERE project_id = ${params.project_id}
          ORDER BY requested_at DESC
        `;

        for await (const co of changeOrdersQuery) {
          changeOrders.push({
            id: co.id,
            title: co.title,
            cost_impact: co.cost_impact,
            time_impact_days: co.time_impact_days,
            status: co.status,
            requested_at: co.requested_at,
            approved_at: co.approved_at
          });
        }
      }

      return {
        project_id: project.id,
        project_title: project.title,
        start_date: project.start_date,
        estimated_end_date: project.estimated_end_date,
        actual_end_date: project.actual_end_date,
        status: project.status,
        progress_percentage: progressPercentage,
        milestones,
        tasks,
        change_orders: changeOrders
      };

    } catch (error) {
      console.error('Get project timeline error:', error);
      throw APIError.internal("Failed to fetch project timeline");
    }
  }
);

// Get critical path analysis
export const getCriticalPath = api<{ project_id: number }, { 
  critical_tasks: any[];
  total_duration: number;
  bottlenecks: any[];
  recommendations: string[];
}>(
  { auth: true, expose: true, method: "GET", path: "/projects/:project_id/critical-path" },
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
      // Get all tasks with dependencies
      const tasksQuery = db.query`
        SELECT 
          pt.*,
          u.first_name || ' ' || u.last_name as assignee_name
        FROM project_tasks pt
        LEFT JOIN users u ON pt.assigned_to = u.id
        WHERE pt.project_id = ${project_id}
        ORDER BY pt.created_at
      `;

      const allTasks: any[] = [];
      for await (const task of tasksQuery) {
        allTasks.push({
          id: task.id,
          title: task.title,
          assignee_name: task.assignee_name,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date,
          estimated_hours: task.estimated_hours || 8,
          actual_hours: task.actual_hours,
          dependencies: task.dependencies || []
        });
      }

      // Simple critical path calculation (in a real implementation, you'd use proper CPM algorithm)
      const criticalTasks = allTasks.filter(task => 
        task.priority === 'high' || task.priority === 'urgent' ||
        task.dependencies.length > 0 ||
        (task.due_date && new Date(task.due_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      );

      // Calculate total duration
      const totalDuration = allTasks.reduce((sum, task) => sum + task.estimated_hours, 0);

      // Identify bottlenecks
      const bottlenecks = allTasks.filter(task => 
        task.status === 'in_progress' && 
        task.due_date && 
        new Date(task.due_date) < new Date()
      ).map(task => ({
        task_id: task.id,
        title: task.title,
        assignee_name: task.assignee_name,
        days_overdue: Math.ceil((new Date().getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24))
      }));

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (bottlenecks.length > 0) {
        recommendations.push(`Address ${bottlenecks.length} overdue task(s) immediately`);
      }
      
      const urgentTasks = allTasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;
      if (urgentTasks > 0) {
        recommendations.push(`Focus on ${urgentTasks} urgent task(s)`);
      }
      
      const unassignedTasks = allTasks.filter(t => !t.assigned_to && t.status === 'pending').length;
      if (unassignedTasks > 0) {
        recommendations.push(`Assign ${unassignedTasks} unassigned task(s)`);
      }

      if (recommendations.length === 0) {
        recommendations.push("Project timeline is on track");
      }

      return {
        critical_tasks: criticalTasks,
        total_duration: totalDuration,
        bottlenecks,
        recommendations
      };

    } catch (error) {
      console.error('Get critical path error:', error);
      throw APIError.internal("Failed to analyze critical path");
    }
  }
);

// Get project timeline analytics
export const getTimelineAnalytics = api<{ project_id: number }, { 
  planned_vs_actual: any;
  task_completion_trend: any[];
  resource_utilization: any[];
  delay_analysis: any;
}>(
  { auth: true, expose: true, method: "GET", path: "/projects/:project_id/timeline-analytics" },
  async ({ project_id }) => {
    const auth = getAuthData()!;
    
    // Verify project access
    const project = await db.queryRow`
      SELECT id, start_date, estimated_end_date, actual_end_date, status,
             client_id, designer_id, project_manager_id 
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
      // Planned vs Actual analysis
      const plannedDuration = project.estimated_end_date ? 
        Math.ceil((project.estimated_end_date.getTime() - project.start_date.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      const actualDuration = project.actual_end_date ? 
        Math.ceil((project.actual_end_date.getTime() - project.start_date.getTime()) / (1000 * 60 * 60 * 24)) :
        Math.ceil((new Date().getTime() - project.start_date.getTime()) / (1000 * 60 * 60 * 24));

      const plannedVsActual = {
        planned_duration_days: plannedDuration,
        actual_duration_days: actualDuration,
        variance_days: actualDuration - plannedDuration,
        variance_percentage: plannedDuration > 0 ? Math.round(((actualDuration - plannedDuration) / plannedDuration) * 100) : 0
      };

      // Task completion trend (weekly)
      const trendQuery = db.query`
        SELECT 
          DATE_TRUNC('week', completed_at) as week,
          COUNT(*) as completed_tasks
        FROM project_tasks
        WHERE project_id = ${project_id} 
        AND completed_at IS NOT NULL
        AND completed_at >= ${project.start_date}
        GROUP BY DATE_TRUNC('week', completed_at)
        ORDER BY week
      `;

      const taskCompletionTrend: any[] = [];
      for await (const row of trendQuery) {
        taskCompletionTrend.push({
          week: row.week,
          completed_tasks: parseInt(row.completed_tasks || '0')
        });
      }

      // Resource utilization
      const utilizationQuery = db.query`
        SELECT 
          pt.assigned_to,
          u.first_name || ' ' || u.last_name as assignee_name,
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE pt.status = 'completed') as completed_tasks,
          COALESCE(SUM(pt.estimated_hours), 0) as estimated_hours,
          COALESCE(SUM(pt.actual_hours), 0) as actual_hours
        FROM project_tasks pt
        LEFT JOIN users u ON pt.assigned_to = u.id
        WHERE pt.project_id = ${project_id} AND pt.assigned_to IS NOT NULL
        GROUP BY pt.assigned_to, u.first_name, u.last_name
        ORDER BY total_tasks DESC
      `;

      const resourceUtilization: any[] = [];
      for await (const row of utilizationQuery) {
        const totalTasks = parseInt(row.total_tasks || '0');
        const completedTasks = parseInt(row.completed_tasks || '0');
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        resourceUtilization.push({
          assigned_to: row.assigned_to,
          assignee_name: row.assignee_name,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          completion_rate: completionRate,
          estimated_hours: parseFloat(row.estimated_hours || '0'),
          actual_hours: parseFloat(row.actual_hours || '0')
        });
      }

      // Delay analysis
      const delayData = await db.queryRow`
        SELECT 
          COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) as overdue_tasks,
          COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > due_date) as delayed_completions,
          AVG(EXTRACT(days FROM (completed_at - due_date))) FILTER (WHERE status = 'completed' AND completed_at > due_date) as avg_delay_days
        FROM project_tasks
        WHERE project_id = ${project_id} AND due_date IS NOT NULL
      `;

      const delayAnalysis = {
        overdue_tasks: parseInt(delayData?.overdue_tasks || '0'),
        delayed_completions: parseInt(delayData?.delayed_completions || '0'),
        average_delay_days: parseFloat(delayData?.avg_delay_days || '0')
      };

      return {
        planned_vs_actual: plannedVsActual,
        task_completion_trend: taskCompletionTrend,
        resource_utilization: resourceUtilization,
        delay_analysis: delayAnalysis
      };

    } catch (error) {
      console.error('Get timeline analytics error:', error);
      throw APIError.internal("Failed to fetch timeline analytics");
    }
  }
);

// Update project timeline
export const updateProjectTimeline = api<{ 
  project_id: number;
  estimated_end_date?: string;
  milestones?: { title: string; due_date: string; description?: string }[];
}, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "PUT", path: "/projects/:project_id/timeline" },
  async ({ project_id, estimated_end_date, milestones }) => {
    const auth = getAuthData()!;
    
    // Verify project access and permissions
    const project = await db.queryRow`
      SELECT id, client_id, designer_id, project_manager_id 
      FROM projects 
      WHERE id = ${project_id}
    `;

    if (!project) {
      throw APIError.notFound("Project not found");
    }

    const userId = parseInt(auth.userID);
    const canEdit = project.project_manager_id === userId ||
                   auth.permissions.includes('projects.manage');

    if (!canEdit) {
      throw APIError.forbidden("Insufficient permissions to update project timeline");
    }

    try {
      // Update project estimated end date if provided
      if (estimated_end_date) {
        await db.exec`
          UPDATE projects SET
            estimated_end_date = ${estimated_end_date},
            updated_at = NOW()
          WHERE id = ${project_id}
        `;
      }

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'update_timeline', 'project', ${project_id}, ${JSON.stringify({ estimated_end_date, milestones })})
      `;

      return {
        success: true,
        message: "Project timeline updated successfully"
      };

    } catch (error) {
      console.error('Update project timeline error:', error);
      throw APIError.internal("Failed to update project timeline");
    }
  }
);

// Generate timeline report
export const generateTimelineReport = api<{ project_id: number; format?: 'json' | 'csv' }, { 
  report_data: any;
  generated_at: string;
}>(
  { auth: true, expose: true, method: "GET", path: "/projects/:project_id/timeline-report" },
  async ({ project_id, format = 'json' }) => {
    const auth = getAuthData()!;
    
    // Verify project access
    const project = await db.queryRow`
      SELECT id, title, start_date, estimated_end_date, actual_end_date, status,
             client_id, designer_id, project_manager_id 
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
      // Get comprehensive timeline data
      const timeline = await getProjectTimeline.handler({
        project_id,
        include_tasks: true,
        include_change_orders: true
      });

      const analytics = await getTimelineAnalytics.handler({ project_id });
      const criticalPath = await getCriticalPath.handler({ project_id });

      const reportData = {
        project_info: {
          id: project.id,
          title: project.title,
          start_date: project.start_date,
          estimated_end_date: project.estimated_end_date,
          actual_end_date: project.actual_end_date,
          status: project.status
        },
        timeline_overview: {
          progress_percentage: timeline.progress_percentage,
          total_tasks: timeline.tasks.length,
          completed_tasks: timeline.tasks.filter(t => t.status === 'completed').length,
          overdue_tasks: timeline.tasks.filter(t => 
            t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
          ).length
        },
        milestones: timeline.milestones,
        critical_path: criticalPath,
        analytics: analytics,
        tasks: timeline.tasks,
        change_orders: timeline.change_orders
      };

      // Log report generation
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'generate_report', 'project_timeline', ${project_id}, '{"format": "${format}"}')
      `;

      return {
        report_data: reportData,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Generate timeline report error:', error);
      throw APIError.internal("Failed to generate timeline report");
    }
  }
);
