import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface DashboardWidget {
  id: string;
  title: string;
  type: string;
  data: any;
  metadata?: {
    period?: string;
    trend?: number;
    target?: number;
  };
}

export interface SuperAdminDashboard {
  users: {
    total: number;
    active: number;
    new_this_month: number;
    by_role: { role: string; count: number }[];
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    total_value: number;
    by_status: { status: string; count: number }[];
  };
  leads: {
    total: number;
    this_month: number;
    conversion_rate: number;
    by_source: { source: string; count: number }[];
  };
  revenue: {
    total: number;
    this_month: number;
    pending: number;
    growth_rate: number;
  };
  system_health: {
    active_users_24h: number;
    database_size: string;
    response_time: number;
  };
}

export interface DesignerDashboard {
  projects: {
    assigned: number;
    in_progress: number;
    completed_this_month: number;
    upcoming_deadlines: any[];
  };
  leads: {
    assigned: number;
    new_today: number;
    high_priority: number;
  };
  tasks: {
    pending: number;
    in_progress: number;
    overdue: number;
    completed_this_week: number;
  };
  earnings: {
    this_month: number;
    pending: number;
    total: number;
  };
  client_satisfaction: {
    average_rating: number;
    recent_reviews: any[];
  };
}

export interface CustomerDashboard {
  project: {
    current_stage: string;
    progress_percentage: number;
    next_milestone: any;
    recent_updates: any[];
  };
  payments: {
    total_budget: number;
    paid_amount: number;
    pending_amount: number;
    next_payment_due: any;
  };
  communications: {
    unread_messages: number;
    recent_messages: any[];
  };
  gallery: {
    progress_photos: any[];
    design_renders: any[];
  };
}

export interface VendorDashboard {
  orders: {
    pending: number;
    in_progress: number;
    completed_this_month: number;
    revenue_this_month: number;
  };
  materials: {
    total_listed: number;
    out_of_stock: number;
    top_selling: any[];
  };
  performance: {
    rating: number;
    total_reviews: number;
    on_time_delivery: number;
  };
  payments: {
    pending: number;
    received_this_month: number;
  };
}

export interface ProjectManagerDashboard {
  projects: {
    managed: number;
    on_schedule: number;
    delayed: number;
    budget_utilization: number;
  };
  team: {
    active_designers: number;
    active_vendors: number;
    workload_distribution: any[];
  };
  operations: {
    pending_approvals: number;
    resource_conflicts: number;
    quality_score: number;
  };
  financial: {
    budget_variance: number;
    cost_savings: number;
    revenue_impact: number;
  };
}

export const getSuperAdminDashboard = api<void, SuperAdminDashboard>(
  { auth: true, expose: true, method: "GET", path: "/dashboard/super-admin" },
  async () => {
    const auth = getAuthData()!;

    if (!auth.roles.includes('super_admin')) {
      throw APIError.forbidden("Access denied to super admin dashboard");
    }

    // Users data
    const usersData = await db.queryAll`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active THEN 1 END) as active,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END) as new_this_month
      FROM users
    `;

    const usersByRole = await db.queryAll<{ role: string; count: number }>`
      SELECT r.display_name as role, COUNT(ur.user_id) as count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      GROUP BY r.id, r.display_name
      ORDER BY count DESC
    `;

    // Projects data
    const projectsData = await db.queryRow`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('planning', 'design', 'execution') THEN 1 END) as active,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COALESCE(SUM(budget), 0) as total_value
      FROM projects
    `;

    const projectsByStatus = await db.queryAll<{ status: string; count: number }>`
      SELECT status, COUNT(*) as count
      FROM projects
      GROUP BY status
      ORDER BY count DESC
    `;

    // Leads data
    const leadsData = await db.queryRow`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END) as this_month,
        ROUND(
          (COUNT(CASE WHEN converted_to_project IS NOT NULL THEN 1 END)::NUMERIC / 
           NULLIF(COUNT(*), 0)) * 100, 2
        ) as conversion_rate
      FROM leads
    `;

    const leadsBySource = await db.queryAll<{ source: string; count: number }>`
      SELECT source, COUNT(*) as count
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY source
      ORDER BY count DESC
    `;

    // Revenue data
    const revenueData = await db.queryRow`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as total,
        COALESCE(SUM(CASE WHEN status = 'completed' AND paid_date >= DATE_TRUNC('month', NOW()) THEN amount END), 0) as this_month,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount END), 0) as pending
      FROM payments
    `;

    // System health (mock data for now)
    const systemHealth = {
      active_users_24h: 45,
      database_size: "2.5 GB",
      response_time: 125
    };

    return {
      users: {
        total: usersData[0]?.total || 0,
        active: usersData[0]?.active || 0,
        new_this_month: usersData[0]?.new_this_month || 0,
        by_role: usersByRole
      },
      projects: {
        total: projectsData?.total || 0,
        active: projectsData?.active || 0,
        completed: projectsData?.completed || 0,
        total_value: projectsData?.total_value || 0,
        by_status: projectsByStatus
      },
      leads: {
        total: leadsData?.total || 0,
        this_month: leadsData?.this_month || 0,
        conversion_rate: leadsData?.conversion_rate || 0,
        by_source: leadsBySource
      },
      revenue: {
        total: revenueData?.total || 0,
        this_month: revenueData?.this_month || 0,
        pending: revenueData?.pending || 0,
        growth_rate: 12.5 // Mock growth rate
      },
      system_health: systemHealth
    };
  }
);

export const getDesignerDashboard = api<void, DesignerDashboard>(
  { auth: true, expose: true, method: "GET", path: "/dashboard/designer" },
  async () => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    if (!auth.roles.includes('interior_designer')) {
      throw APIError.forbidden("Access denied to designer dashboard");
    }

    // Projects data
    const projectsData = await db.queryRow`
      SELECT 
        COUNT(*) as assigned,
        COUNT(CASE WHEN status IN ('planning', 'design', 'execution') THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'completed' AND updated_at >= DATE_TRUNC('month', NOW()) THEN 1 END) as completed_this_month
      FROM projects
      WHERE designer_id = ${userId}
    `;

    const upcomingDeadlines = await db.queryAll`
      SELECT id, title, end_date
      FROM projects
      WHERE designer_id = ${userId} 
        AND status IN ('planning', 'design', 'execution')
        AND end_date IS NOT NULL 
        AND end_date <= NOW() + INTERVAL '7 days'
      ORDER BY end_date ASC
      LIMIT 5
    `;

    // Leads data
    const leadsData = await db.queryRow`
      SELECT 
        COUNT(*) as assigned,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_today,
        COUNT(CASE WHEN score >= 70 THEN 1 END) as high_priority
      FROM leads
      WHERE assigned_to = ${userId} AND status NOT IN ('won', 'lost')
    `;

    // Tasks (workflows) data
    const tasksData = await db.queryRow`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'pending' AND created_at < NOW() - INTERVAL '7 days' THEN 1 END) as overdue,
        COUNT(CASE WHEN status = 'completed' AND completed_at >= DATE_TRUNC('week', NOW()) THEN 1 END) as completed_this_week
      FROM project_workflows
      WHERE assigned_to = ${userId}
    `;

    // Earnings data
    const earningsData = await db.queryRow`
      SELECT 
        COALESCE(SUM(CASE WHEN p.status = 'completed' AND p.paid_date >= DATE_TRUNC('month', NOW()) THEN p.amount * 0.1 END), 0) as this_month,
        COALESCE(SUM(CASE WHEN p.status = 'pending' THEN p.amount * 0.1 END), 0) as pending,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount * 0.1 END), 0) as total
      FROM payments p
      JOIN projects pr ON p.project_id = pr.id
      WHERE pr.designer_id = ${userId}
    `;

    // Client satisfaction (mock data)
    const clientSatisfaction = {
      average_rating: 4.7,
      recent_reviews: []
    };

    return {
      projects: {
        assigned: projectsData?.assigned || 0,
        in_progress: projectsData?.in_progress || 0,
        completed_this_month: projectsData?.completed_this_month || 0,
        upcoming_deadlines: upcomingDeadlines || []
      },
      leads: {
        assigned: leadsData?.assigned || 0,
        new_today: leadsData?.new_today || 0,
        high_priority: leadsData?.high_priority || 0
      },
      tasks: {
        pending: tasksData?.pending || 0,
        in_progress: tasksData?.in_progress || 0,
        overdue: tasksData?.overdue || 0,
        completed_this_week: tasksData?.completed_this_week || 0
      },
      earnings: {
        this_month: earningsData?.this_month || 0,
        pending: earningsData?.pending || 0,
        total: earningsData?.total || 0
      },
      client_satisfaction: clientSatisfaction
    };
  }
);

export const getCustomerDashboard = api<void, CustomerDashboard>(
  { auth: true, expose: true, method: "GET", path: "/dashboard/customer" },
  async () => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    if (!auth.roles.includes('customer')) {
      throw APIError.forbidden("Access denied to customer dashboard");
    }

    // Get current project
    const currentProject = await db.queryRow`
      SELECT id, title, status, progress_percentage
      FROM projects
      WHERE client_id = ${userId} AND status NOT IN ('completed', 'cancelled')
      ORDER BY created_at DESC
      LIMIT 1
    `;

    let projectData = {
      current_stage: 'No active project',
      progress_percentage: 0,
      next_milestone: null,
      recent_updates: []
    };

    if (currentProject) {
      // Get current workflow stage
      const currentStage = await db.queryRow`
        SELECT stage FROM project_workflows
        WHERE project_id = ${currentProject.id} AND status = 'in_progress'
        ORDER BY sort_order ASC
        LIMIT 1
      `;

      // Get next milestone
      const nextMilestone = await db.queryRow`
        SELECT stage, sort_order FROM project_workflows
        WHERE project_id = ${currentProject.id} AND status = 'pending'
        ORDER BY sort_order ASC
        LIMIT 1
      `;

      projectData = {
        current_stage: currentStage?.stage || 'Planning',
        progress_percentage: currentProject.progress_percentage || 0,
        next_milestone: nextMilestone,
        recent_updates: [] // Would fetch from project updates/messages
      };
    }

    // Payments data
    let paymentsData = {
      total_budget: 0,
      paid_amount: 0,
      pending_amount: 0,
      next_payment_due: null
    };

    if (currentProject) {
      const payments = await db.queryRow`
        SELECT 
          p.budget as total_budget,
          COALESCE(SUM(CASE WHEN pay.status = 'completed' THEN pay.amount END), 0) as paid_amount,
          COALESCE(SUM(CASE WHEN pay.status = 'pending' THEN pay.amount END), 0) as pending_amount
        FROM projects p
        LEFT JOIN payments pay ON p.id = pay.project_id
        WHERE p.id = ${currentProject.id}
        GROUP BY p.budget
      `;

      const nextPayment = await db.queryRow`
        SELECT amount, due_date, payment_type
        FROM payments
        WHERE project_id = ${currentProject.id} AND status = 'pending'
        ORDER BY due_date ASC
        LIMIT 1
      `;

      paymentsData = {
        total_budget: payments?.total_budget || 0,
        paid_amount: payments?.paid_amount || 0,
        pending_amount: payments?.pending_amount || 0,
        next_payment_due: nextPayment
      };
    }

    // Communications data
    const communicationsData = await db.queryRow`
      SELECT 
        COUNT(CASE WHEN NOT EXISTS (
          SELECT 1 FROM message_read_status mrs 
          WHERE mrs.message_id = m.id AND mrs.user_id = ${userId}
        ) THEN 1 END) as unread_messages
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE ${userId} = ANY(c.participants)
    `;

    return {
      project: projectData,
      payments: paymentsData,
      communications: {
        unread_messages: communicationsData?.unread_messages || 0,
        recent_messages: [] // Would fetch recent messages
      },
      gallery: {
        progress_photos: [], // Would fetch from file uploads
        design_renders: []
      }
    };
  }
);

export const getVendorDashboard = api<void, VendorDashboard>(
  { auth: true, expose: true, method: "GET", path: "/dashboard/vendor" },
  async () => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    if (!auth.roles.includes('vendor')) {
      throw APIError.forbidden("Access denied to vendor dashboard");
    }

    // Get vendor info
    const vendor = await db.queryRow<{ id: number }>`
      SELECT id FROM vendors WHERE user_id = ${userId}
    `;

    if (!vendor) {
      throw APIError.notFound("Vendor profile not found");
    }

    // Orders data (from BOM items)
    const ordersData = await db.queryRow`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'ordered' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'delivered' AND delivered_at >= DATE_TRUNC('month', NOW()) THEN 1 END) as completed_this_month,
        COALESCE(SUM(CASE WHEN status = 'delivered' AND delivered_at >= DATE_TRUNC('month', NOW()) THEN total_price END), 0) as revenue_this_month
      FROM bom_items
      WHERE material_id IN (SELECT id FROM materials WHERE vendor_id = ${vendor.id})
    `;

    // Materials data
    const materialsData = await db.queryRow`
      SELECT 
        COUNT(*) as total_listed,
        COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock
      FROM materials
      WHERE vendor_id = ${vendor.id} AND is_active = true
    `;

    const topSelling = await db.queryAll`
      SELECT m.name, COUNT(bi.id) as order_count
      FROM materials m
      LEFT JOIN bom_items bi ON m.id = bi.material_id AND bi.created_at >= DATE_TRUNC('month', NOW())
      WHERE m.vendor_id = ${vendor.id} AND m.is_active = true
      GROUP BY m.id, m.name
      ORDER BY order_count DESC
      LIMIT 5
    `;

    // Performance data
    const performanceData = await db.queryRow`
      SELECT 
        COALESCE(AVG(rating), 0) as rating,
        COUNT(*) as total_reviews
      FROM vendor_reviews
      WHERE vendor_id = ${vendor.id}
    `;

    const onTimeDelivery = 85; // Mock data - would calculate from delivery times

    // Payments data
    const paymentsData = await db.queryRow`
      SELECT 
        COALESCE(SUM(CASE WHEN t.status = 'pending' THEN t.amount END), 0) as pending,
        COALESCE(SUM(CASE WHEN t.status = 'completed' AND t.created_at >= DATE_TRUNC('month', NOW()) THEN t.amount END), 0) as received_this_month
      FROM transactions t
      JOIN wallets w ON t.wallet_id = w.id
      WHERE w.user_id = ${userId} AND t.type = 'credit'
    `;

    return {
      orders: {
        pending: ordersData?.pending || 0,
        in_progress: ordersData?.in_progress || 0,
        completed_this_month: ordersData?.completed_this_month || 0,
        revenue_this_month: ordersData?.revenue_this_month || 0
      },
      materials: {
        total_listed: materialsData?.total_listed || 0,
        out_of_stock: materialsData?.out_of_stock || 0,
        top_selling: topSelling || []
      },
      performance: {
        rating: performanceData?.rating || 0,
        total_reviews: performanceData?.total_reviews || 0,
        on_time_delivery: onTimeDelivery
      },
      payments: {
        pending: paymentsData?.pending || 0,
        received_this_month: paymentsData?.received_this_month || 0
      }
    };
  }
);

export const getProjectManagerDashboard = api<void, ProjectManagerDashboard>(
  { auth: true, expose: true, method: "GET", path: "/dashboard/project-manager" },
  async () => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    if (!auth.roles.includes('project_manager')) {
      throw APIError.forbidden("Access denied to project manager dashboard");
    }

    // Projects data
    const projectsData = await db.queryRow`
      SELECT 
        COUNT(*) as managed,
        COUNT(CASE WHEN end_date IS NULL OR end_date >= NOW() THEN 1 END) as on_schedule,
        COUNT(CASE WHEN end_date IS NOT NULL AND end_date < NOW() AND status != 'completed' THEN 1 END) as delayed,
        ROUND(AVG(actual_cost::NUMERIC / NULLIF(budget, 0)) * 100, 2) as budget_utilization
      FROM projects
      WHERE project_manager_id = ${userId}
    `;

    // Team data
    const teamData = await db.queryRow`
      SELECT 
        COUNT(DISTINCT p.designer_id) as active_designers,
        COUNT(DISTINCT v.id) as active_vendors
      FROM projects p
      LEFT JOIN bom_items bi ON p.id = bi.project_id
      LEFT JOIN materials m ON bi.material_id = m.id
      LEFT JOIN vendors v ON m.vendor_id = v.id
      WHERE p.project_manager_id = ${userId} AND p.status IN ('planning', 'design', 'execution')
    `;

    // Operations data
    const operationsData = await db.queryRow`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_approvals
      FROM project_workflows
      WHERE project_id IN (
        SELECT id FROM projects WHERE project_manager_id = ${userId}
      )
    `;

    const resourceConflicts = 2; // Mock data
    const qualityScore = 92; // Mock data

    // Financial data
    const financialData = await db.queryRow`
      SELECT 
        ROUND(AVG((budget - COALESCE(actual_cost, 0))::NUMERIC / NULLIF(budget, 0)) * 100, 2) as budget_variance,
        COALESCE(SUM(budget - COALESCE(actual_cost, 0)), 0) as cost_savings,
        COALESCE(SUM(budget), 0) as revenue_impact
      FROM projects
      WHERE project_manager_id = ${userId}
    `;

    return {
      projects: {
        managed: projectsData?.managed || 0,
        on_schedule: projectsData?.on_schedule || 0,
        delayed: projectsData?.delayed || 0,
        budget_utilization: projectsData?.budget_utilization || 0
      },
      team: {
        active_designers: teamData?.active_designers || 0,
        active_vendors: teamData?.active_vendors || 0,
        workload_distribution: [] // Would calculate workload distribution
      },
      operations: {
        pending_approvals: operationsData?.pending_approvals || 0,
        resource_conflicts: resourceConflicts,
        quality_score: qualityScore
      },
      financial: {
        budget_variance: financialData?.budget_variance || 0,
        cost_savings: financialData?.cost_savings || 0,
        revenue_impact: financialData?.revenue_impact || 0
      }
    };
  }
);