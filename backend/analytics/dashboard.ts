import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface DashboardParams {
  city?: Query<string>;
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
}

interface DashboardStats {
  totalLeads: number;
  totalProjects: number;
  totalRevenue: number;
  activeProjects: number;
  conversionRate: number;
  leadsThisMonth: number;
  projectsThisMonth: number;
  revenueThisMonth: number;
  topCities: Array<{
    city: string;
    leads: number;
    projects: number;
    revenue: number;
  }>;
  leadsBySource: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
  projectsByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    leads: number;
    projects: number;
    revenue: number;
  }>;
}

// Gets dashboard analytics and metrics
export const getDashboard = api<DashboardParams, DashboardStats>(
  { auth: true, expose: true, method: "GET", path: "/analytics/dashboard" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('analytics.view')) {
      throw new Error("Insufficient permissions");
    }

    let cityFilter = "";
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.city) {
      cityFilter = ` AND city = $${paramIndex}`;
      queryParams.push(params.city);
      paramIndex++;
    }

    // Get date range
    const dateFrom = params.dateFrom || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = params.dateTo || new Date().toISOString().split('T')[0];

    // Total metrics
    const totalStats = await db.rawQueryRow(`
      SELECT 
        (SELECT COUNT(*) FROM leads WHERE created_at::date >= $${paramIndex} AND created_at::date <= $${paramIndex + 1} ${cityFilter}) as total_leads,
        (SELECT COUNT(*) FROM projects WHERE created_at::date >= $${paramIndex} AND created_at::date <= $${paramIndex + 1} ${cityFilter}) as total_projects,
        (SELECT COALESCE(SUM(budget), 0) FROM projects WHERE created_at::date >= $${paramIndex} AND created_at::date <= $${paramIndex + 1} ${cityFilter}) as total_revenue,
        (SELECT COUNT(*) FROM projects WHERE status IN ('planning', 'in_progress', 'review') ${cityFilter}) as active_projects
    `, dateFrom, dateTo, ...queryParams);

    // This month metrics
    const thisMonthStats = await db.rawQueryRow(`
      SELECT 
        (SELECT COUNT(*) FROM leads WHERE created_at >= date_trunc('month', CURRENT_DATE) ${cityFilter}) as leads_this_month,
        (SELECT COUNT(*) FROM projects WHERE created_at >= date_trunc('month', CURRENT_DATE) ${cityFilter}) as projects_this_month,
        (SELECT COALESCE(SUM(budget), 0) FROM projects WHERE created_at >= date_trunc('month', CURRENT_DATE) ${cityFilter}) as revenue_this_month
    `, ...queryParams);

    // Conversion rate
    const conversionStats = await db.rawQueryRow(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads
      FROM leads 
      WHERE created_at::date >= $${paramIndex} AND created_at::date <= $${paramIndex + 1} ${cityFilter}
    `, dateFrom, dateTo, ...queryParams);

    const conversionRate = conversionStats?.total_leads > 0 
      ? (conversionStats.converted_leads / conversionStats.total_leads) * 100 
      : 0;

    // Top cities
    const topCities = await db.rawQueryAll(`
      SELECT 
        city,
        COUNT(l.id) as leads,
        COUNT(p.id) as projects,
        COALESCE(SUM(p.budget), 0) as revenue
      FROM (
        SELECT DISTINCT city FROM leads WHERE city IS NOT NULL 
        UNION 
        SELECT DISTINCT city FROM projects WHERE city IS NOT NULL
      ) cities
      LEFT JOIN leads l ON cities.city = l.city AND l.created_at::date >= $1 AND l.created_at::date <= $2
      LEFT JOIN projects p ON cities.city = p.city AND p.created_at::date >= $1 AND p.created_at::date <= $2
      GROUP BY city
      ORDER BY revenue DESC, projects DESC, leads DESC
      LIMIT 10
    `, dateFrom, dateTo);

    // Leads by source
    const leadsBySource = await db.rawQueryAll(`
      SELECT 
        source,
        COUNT(*) as count,
        (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM leads WHERE created_at::date >= $${paramIndex} AND created_at::date <= $${paramIndex + 1} ${cityFilter})) as percentage
      FROM leads
      WHERE created_at::date >= $${paramIndex} AND created_at::date <= $${paramIndex + 1} ${cityFilter}
      GROUP BY source
      ORDER BY count DESC
    `, dateFrom, dateTo, ...queryParams);

    // Projects by status
    const projectsByStatus = await db.rawQueryAll(`
      SELECT 
        status,
        COUNT(*) as count,
        (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM projects WHERE created_at::date >= $${paramIndex} AND created_at::date <= $${paramIndex + 1} ${cityFilter})) as percentage
      FROM projects
      WHERE created_at::date >= $${paramIndex} AND created_at::date <= $${paramIndex + 1} ${cityFilter}
      GROUP BY status
      ORDER BY count DESC
    `, dateFrom, dateTo, ...queryParams);

    // Monthly trends (last 12 months)
    const monthlyTrends = await db.rawQueryAll(`
      SELECT 
        to_char(month, 'YYYY-MM') as month,
        COUNT(l.id) as leads,
        COUNT(p.id) as projects,
        COALESCE(SUM(p.budget), 0) as revenue
      FROM generate_series(
        date_trunc('month', CURRENT_DATE - interval '11 months'),
        date_trunc('month', CURRENT_DATE),
        '1 month'::interval
      ) month
      LEFT JOIN leads l ON date_trunc('month', l.created_at) = month ${cityFilter.replace('AND city', 'AND l.city')}
      LEFT JOIN projects p ON date_trunc('month', p.created_at) = month ${cityFilter.replace('AND city', 'AND p.city')}
      GROUP BY month
      ORDER BY month
    `, ...queryParams);

    return {
      totalLeads: totalStats?.total_leads || 0,
      totalProjects: totalStats?.total_projects || 0,
      totalRevenue: totalStats?.total_revenue || 0,
      activeProjects: totalStats?.active_projects || 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
      leadsThisMonth: thisMonthStats?.leads_this_month || 0,
      projectsThisMonth: thisMonthStats?.projects_this_month || 0,
      revenueThisMonth: thisMonthStats?.revenue_this_month || 0,
      topCities: topCities.map(city => ({
        city: city.city,
        leads: city.leads,
        projects: city.projects,
        revenue: city.revenue
      })),
      leadsBySource: leadsBySource.map(item => ({
        source: item.source,
        count: item.count,
        percentage: Math.round(item.percentage * 100) / 100
      })),
      projectsByStatus: projectsByStatus.map(item => ({
        status: item.status,
        count: item.count,
        percentage: Math.round(item.percentage * 100) / 100
      })),
      monthlyTrends: monthlyTrends.map(trend => ({
        month: trend.month,
        leads: trend.leads,
        projects: trend.projects,
        revenue: trend.revenue
      }))
    };
  }
);
