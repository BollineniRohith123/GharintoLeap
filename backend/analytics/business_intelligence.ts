import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface BusinessMetrics {
  revenue: {
    total: number;
    monthly: number;
    growth_rate: number;
    forecast: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    completion_rate: number;
    average_duration: number;
  };
  customers: {
    total: number;
    active: number;
    new_this_month: number;
    retention_rate: number;
    lifetime_value: number;
  };
  performance: {
    profit_margin: number;
    cost_per_project: number;
    revenue_per_customer: number;
    project_success_rate: number;
  };
}

interface RevenueAnalytics {
  period: string;
  total_revenue: number;
  project_revenue: number;
  recurring_revenue: number;
  growth_rate: number;
  forecast: number;
}

interface CustomerAnalytics {
  segment: string;
  customer_count: number;
  total_revenue: number;
  average_project_value: number;
  retention_rate: number;
  satisfaction_score: number;
}

interface ProjectPerformance {
  project_type: string;
  total_projects: number;
  completed_projects: number;
  average_duration: number;
  average_budget: number;
  profit_margin: number;
  client_satisfaction: number;
}

interface AnalyticsParams {
  start_date?: Query<string>;
  end_date?: Query<string>;
  period?: Query<'daily' | 'weekly' | 'monthly' | 'yearly'>;
  segment?: Query<string>;
}

// Get business intelligence dashboard
export const getBusinessMetrics = api<AnalyticsParams, BusinessMetrics>(
  { auth: true, expose: true, method: "GET", path: "/analytics/business-metrics" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('analytics.view') && !auth.permissions.includes('business.admin')) {
      throw APIError.forbidden("Insufficient permissions to view business metrics");
    }

    const endDate = params.end_date || new Date().toISOString().split('T')[0];
    const startDate = params.start_date || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      // Revenue metrics
      const revenueData = await db.queryRow`
        SELECT 
          COALESCE(SUM(budget), 0) as total_revenue,
          COALESCE(SUM(budget) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) as monthly_revenue,
          COUNT(*) as total_projects
        FROM projects
        WHERE status = 'completed'
        AND created_at BETWEEN ${startDate} AND ${endDate}
      `;

      // Previous month revenue for growth calculation
      const prevMonthRevenue = await db.queryRow`
        SELECT COALESCE(SUM(budget), 0) as prev_revenue
        FROM projects
        WHERE status = 'completed'
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
        AND created_at < DATE_TRUNC('month', CURRENT_DATE)
      `;

      const currentRevenue = parseInt(revenueData?.monthly_revenue || '0');
      const previousRevenue = parseInt(prevMonthRevenue?.prev_revenue || '0');
      const growthRate = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Project metrics
      const projectData = await db.queryRow`
        SELECT 
          COUNT(*) as total_projects,
          COUNT(*) FILTER (WHERE status IN ('in_progress', 'planning')) as active_projects,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
          AVG(EXTRACT(days FROM (COALESCE(actual_end_date, estimated_end_date) - start_date))) as avg_duration
        FROM projects
        WHERE created_at BETWEEN ${startDate} AND ${endDate}
      `;

      // Customer metrics
      const customerData = await db.queryRow`
        SELECT 
          COUNT(DISTINCT u.id) as total_customers,
          COUNT(DISTINCT u.id) FILTER (WHERE u.last_login_at > NOW() - INTERVAL '30 days') as active_customers,
          COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= DATE_TRUNC('month', CURRENT_DATE)) as new_customers
        FROM users u
        JOIN projects p ON u.id = p.client_id
        WHERE u.created_at BETWEEN ${startDate} AND ${endDate}
      `;

      // Calculate derived metrics
      const totalProjects = parseInt(projectData?.total_projects || '0');
      const completedProjects = parseInt(projectData?.completed_projects || '0');
      const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;

      const totalCustomers = parseInt(customerData?.total_customers || '0');
      const totalRevenue = parseInt(revenueData?.total_revenue || '0');
      const lifetimeValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

      // Mock some advanced metrics
      const retentionRate = 85; // Mock value
      const profitMargin = 25; // Mock value
      const costPerProject = totalRevenue > 0 ? totalRevenue * 0.75 / totalProjects : 0;
      const revenuePerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

      return {
        revenue: {
          total: totalRevenue,
          monthly: currentRevenue,
          growth_rate: Math.round(growthRate * 100) / 100,
          forecast: Math.round(currentRevenue * 1.1) // Simple 10% growth forecast
        },
        projects: {
          total: totalProjects,
          active: parseInt(projectData?.active_projects || '0'),
          completed: completedProjects,
          completion_rate: Math.round(completionRate * 100) / 100,
          average_duration: Math.round(parseFloat(projectData?.avg_duration || '0'))
        },
        customers: {
          total: totalCustomers,
          active: parseInt(customerData?.active_customers || '0'),
          new_this_month: parseInt(customerData?.new_customers || '0'),
          retention_rate: retentionRate,
          lifetime_value: Math.round(lifetimeValue)
        },
        performance: {
          profit_margin: profitMargin,
          cost_per_project: Math.round(costPerProject),
          revenue_per_customer: Math.round(revenuePerCustomer),
          project_success_rate: Math.round(completionRate)
        }
      };

    } catch (error) {
      console.error('Get business metrics error:', error);
      throw APIError.internal("Failed to fetch business metrics");
    }
  }
);

// Get revenue analytics
export const getRevenueAnalytics = api<AnalyticsParams, { analytics: RevenueAnalytics[]; summary: any }>(
  { auth: true, expose: true, method: "GET", path: "/analytics/revenue" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('analytics.view') && !auth.permissions.includes('finance.view')) {
      throw APIError.forbidden("Insufficient permissions to view revenue analytics");
    }

    const period = params.period || 'monthly';
    const endDate = params.end_date || new Date().toISOString().split('T')[0];
    const startDate = params.start_date || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      let dateFormat: string;
      let dateInterval: string;

      switch (period) {
        case 'daily':
          dateFormat = 'YYYY-MM-DD';
          dateInterval = '1 day';
          break;
        case 'weekly':
          dateFormat = 'YYYY-"W"WW';
          dateInterval = '1 week';
          break;
        case 'yearly':
          dateFormat = 'YYYY';
          dateInterval = '1 year';
          break;
        default: // monthly
          dateFormat = 'YYYY-MM';
          dateInterval = '1 month';
      }

      const revenueQuery = `
        WITH date_series AS (
          SELECT generate_series(
            DATE_TRUNC('${period === 'weekly' ? 'week' : period === 'yearly' ? 'year' : period === 'daily' ? 'day' : 'month'}', $1::date),
            DATE_TRUNC('${period === 'weekly' ? 'week' : period === 'yearly' ? 'year' : period === 'daily' ? 'day' : 'month'}', $2::date),
            INTERVAL '${dateInterval}'
          ) as period_start
        ),
        revenue_data AS (
          SELECT 
            DATE_TRUNC('${period === 'weekly' ? 'week' : period === 'yearly' ? 'year' : period === 'daily' ? 'day' : 'month'}', p.created_at) as period_start,
            SUM(p.budget) as total_revenue,
            SUM(p.budget) FILTER (WHERE p.status = 'completed') as project_revenue
          FROM projects p
          WHERE p.created_at >= $1 AND p.created_at <= $2
          GROUP BY DATE_TRUNC('${period === 'weekly' ? 'week' : period === 'yearly' ? 'year' : period === 'daily' ? 'day' : 'month'}', p.created_at)
        )
        SELECT 
          ds.period_start,
          TO_CHAR(ds.period_start, '${dateFormat}') as period,
          COALESCE(rd.total_revenue, 0) as total_revenue,
          COALESCE(rd.project_revenue, 0) as project_revenue,
          0 as recurring_revenue
        FROM date_series ds
        LEFT JOIN revenue_data rd ON ds.period_start = rd.period_start
        ORDER BY ds.period_start
      `;

      const revenueResult = await db.query(revenueQuery, startDate, endDate);
      const analytics: RevenueAnalytics[] = [];
      let totalRevenue = 0;

      for await (const row of revenueResult) {
        const revenue = parseInt(row.total_revenue || '0');
        totalRevenue += revenue;

        analytics.push({
          period: row.period,
          total_revenue: revenue,
          project_revenue: parseInt(row.project_revenue || '0'),
          recurring_revenue: parseInt(row.recurring_revenue || '0'),
          growth_rate: 0, // Calculate growth rate
          forecast: Math.round(revenue * 1.05) // Simple 5% growth forecast
        });
      }

      // Calculate growth rates
      for (let i = 1; i < analytics.length; i++) {
        const current = analytics[i].total_revenue;
        const previous = analytics[i - 1].total_revenue;
        analytics[i].growth_rate = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      }

      const summary = {
        total_revenue: totalRevenue,
        average_monthly_revenue: analytics.length > 0 ? totalRevenue / analytics.length : 0,
        highest_month: analytics.reduce((max, curr) => curr.total_revenue > max.total_revenue ? curr : max, analytics[0] || { total_revenue: 0 }),
        growth_trend: analytics.length > 1 ? analytics[analytics.length - 1].growth_rate : 0
      };

      return { analytics, summary };

    } catch (error) {
      console.error('Get revenue analytics error:', error);
      throw APIError.internal("Failed to fetch revenue analytics");
    }
  }
);

// Get customer analytics
export const getCustomerAnalytics = api<AnalyticsParams, { analytics: CustomerAnalytics[]; summary: any }>(
  { auth: true, expose: true, method: "GET", path: "/analytics/customers" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('analytics.view') && !auth.permissions.includes('customers.view')) {
      throw APIError.forbidden("Insufficient permissions to view customer analytics");
    }

    try {
      // Customer segmentation analysis
      const segmentQuery = `
        SELECT 
          CASE 
            WHEN total_spent >= 500000 THEN 'Premium'
            WHEN total_spent >= 200000 THEN 'Gold'
            WHEN total_spent >= 50000 THEN 'Silver'
            ELSE 'Bronze'
          END as segment,
          COUNT(*) as customer_count,
          SUM(total_spent) as total_revenue,
          AVG(total_spent) as average_project_value
        FROM (
          SELECT 
            u.id,
            COALESCE(SUM(p.budget), 0) as total_spent
          FROM users u
          LEFT JOIN projects p ON u.id = p.client_id
          WHERE u.role = 'client'
          GROUP BY u.id
        ) customer_spending
        GROUP BY 
          CASE 
            WHEN total_spent >= 500000 THEN 'Premium'
            WHEN total_spent >= 200000 THEN 'Gold'
            WHEN total_spent >= 50000 THEN 'Silver'
            ELSE 'Bronze'
          END
        ORDER BY 
          CASE 
            WHEN segment = 'Premium' THEN 1
            WHEN segment = 'Gold' THEN 2
            WHEN segment = 'Silver' THEN 3
            ELSE 4
          END
      `;

      const segmentResult = await db.query(segmentQuery);
      const analytics: CustomerAnalytics[] = [];

      for await (const row of segmentResult) {
        analytics.push({
          segment: row.segment,
          customer_count: parseInt(row.customer_count || '0'),
          total_revenue: parseInt(row.total_revenue || '0'),
          average_project_value: Math.round(parseFloat(row.average_project_value || '0')),
          retention_rate: 85, // Mock retention rate
          satisfaction_score: 4.2 // Mock satisfaction score
        });
      }

      const summary = {
        total_customers: analytics.reduce((sum, seg) => sum + seg.customer_count, 0),
        total_revenue: analytics.reduce((sum, seg) => sum + seg.total_revenue, 0),
        highest_value_segment: analytics.reduce((max, curr) => curr.total_revenue > max.total_revenue ? curr : max, analytics[0] || { total_revenue: 0 }),
        average_satisfaction: analytics.reduce((sum, seg) => sum + seg.satisfaction_score, 0) / analytics.length
      };

      return { analytics, summary };

    } catch (error) {
      console.error('Get customer analytics error:', error);
      throw APIError.internal("Failed to fetch customer analytics");
    }
  }
);

// Get project performance analytics
export const getProjectPerformance = api<AnalyticsParams, { performance: ProjectPerformance[]; summary: any }>(
  { auth: true, expose: true, method: "GET", path: "/analytics/project-performance" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('analytics.view') && !auth.permissions.includes('projects.view')) {
      throw APIError.forbidden("Insufficient permissions to view project performance analytics");
    }

    try {
      // Project performance by type
      const performanceQuery = `
        SELECT 
          COALESCE(p.project_type, 'General') as project_type,
          COUNT(*) as total_projects,
          COUNT(*) FILTER (WHERE p.status = 'completed') as completed_projects,
          AVG(EXTRACT(days FROM (COALESCE(p.actual_end_date, p.estimated_end_date) - p.start_date))) as average_duration,
          AVG(p.budget) as average_budget
        FROM projects p
        GROUP BY COALESCE(p.project_type, 'General')
        ORDER BY total_projects DESC
      `;

      const performanceResult = await db.query(performanceQuery);
      const performance: ProjectPerformance[] = [];

      for await (const row of performanceResult) {
        const totalProjects = parseInt(row.total_projects || '0');
        const completedProjects = parseInt(row.completed_projects || '0');

        performance.push({
          project_type: row.project_type,
          total_projects: totalProjects,
          completed_projects: completedProjects,
          average_duration: Math.round(parseFloat(row.average_duration || '0')),
          average_budget: Math.round(parseFloat(row.average_budget || '0')),
          profit_margin: 25, // Mock profit margin
          client_satisfaction: 4.3 // Mock client satisfaction
        });
      }

      const summary = {
        total_projects: performance.reduce((sum, perf) => sum + perf.total_projects, 0),
        overall_completion_rate: performance.reduce((sum, perf) => sum + perf.completed_projects, 0) / performance.reduce((sum, perf) => sum + perf.total_projects, 0) * 100,
        most_popular_type: performance.reduce((max, curr) => curr.total_projects > max.total_projects ? curr : max, performance[0] || { total_projects: 0 }),
        average_project_duration: performance.reduce((sum, perf) => sum + perf.average_duration, 0) / performance.length
      };

      return { performance, summary };

    } catch (error) {
      console.error('Get project performance error:', error);
      throw APIError.internal("Failed to fetch project performance analytics");
    }
  }
);

// Generate comprehensive business report
export const generateBusinessReport = api<AnalyticsParams & { format?: Query<'json' | 'csv'> }, { 
  report: any;
  generated_at: string;
  format: string;
}>(
  { auth: true, expose: true, method: "GET", path: "/analytics/business-report" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('analytics.export') && !auth.permissions.includes('business.admin')) {
      throw APIError.forbidden("Insufficient permissions to generate business reports");
    }

    try {
      // Get all analytics data
      const businessMetrics = await getBusinessMetrics.handler(params);
      const revenueAnalytics = await getRevenueAnalytics.handler(params);
      const customerAnalytics = await getCustomerAnalytics.handler(params);
      const projectPerformance = await getProjectPerformance.handler(params);

      const report = {
        report_info: {
          title: "Comprehensive Business Report",
          period: `${params.start_date || 'Last Year'} to ${params.end_date || 'Today'}`,
          generated_by: auth.userID,
          generated_at: new Date().toISOString()
        },
        executive_summary: {
          total_revenue: businessMetrics.revenue.total,
          total_projects: businessMetrics.projects.total,
          total_customers: businessMetrics.customers.total,
          profit_margin: businessMetrics.performance.profit_margin,
          growth_rate: businessMetrics.revenue.growth_rate
        },
        business_metrics: businessMetrics,
        revenue_analytics: revenueAnalytics,
        customer_analytics: customerAnalytics,
        project_performance: projectPerformance
      };

      // Log report generation
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'generate_report', 'business_report', 0, ${JSON.stringify({ format: params.format || 'json', period: params.period })})
      `;

      return {
        report,
        generated_at: new Date().toISOString(),
        format: params.format || 'json'
      };

    } catch (error) {
      console.error('Generate business report error:', error);
      throw APIError.internal("Failed to generate business report");
    }
  }
);
