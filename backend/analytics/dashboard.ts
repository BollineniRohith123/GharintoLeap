import { api, Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface DashboardParams {
  cityId?: Query<number>;
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
  timeframe?: Query<string>;
  city?: Query<string>;
}

export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalRevenue: number;
  revenue: number;
  avgProjectValue: number;
  totalCustomers?: number;
  topCities: Array<{
    name: string;
    projectCount: number;
    revenue: number;
  }>;
  projectsByStatus: Array<{
    status: string;
    count: number;
  }>;
  leadsBySource: Array<{
    source: string;
    count: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    projects: number;
    leads: number;
    revenue: number;
  }>;
  revenueChart?: any[];
  projectStatusChart?: any[];
  topDesigners?: any[];
  averageRating?: number;
  totalReviews?: number;
  ratingDistribution?: Record<number, number>;
}

// Retrieves dashboard analytics and metrics.
export const getDashboardMetrics = api<DashboardParams, DashboardMetrics>(
  { auth: true, expose: true, method: "GET", path: "/analytics/dashboard" },
  async (params) => {
    const auth = getAuthData()!;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Date filters
    if (params.dateFrom) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      queryParams.push(params.dateFrom);
    }
    if (params.dateTo) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      queryParams.push(params.dateTo);
    }

    // City filter
    if (params.cityId) {
      whereClause += ` AND city_id = $${paramIndex++}`;
      queryParams.push(params.cityId);
    }

    // Role-based filtering
    if (auth.roles.includes('project_manager')) {
      const manager = await db.queryRow<{ id: number }>`
        SELECT id FROM manager_profiles WHERE user_id = ${auth.userID}
      `;
      if (manager) {
        whereClause += ` AND project_manager_id = $${paramIndex++}`;
        queryParams.push(manager.id);
      }
    }

    // Get project metrics
    const projectMetrics = await db.rawQueryRow<{
      total_projects: number;
      active_projects: number;
      completed_projects: number;
      total_revenue: number;
      avg_project_value: number;
    }>(`
      SELECT 
        COUNT(*) as total_projects,
        COUNT(CASE WHEN status IN ('planning', 'in_progress') THEN 1 END) as active_projects,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
        COALESCE(SUM(actual_cost), 0) as total_revenue,
        COALESCE(AVG(actual_cost), 0) as avg_project_value
      FROM projects
      ${whereClause.replace('created_at', 'p.created_at')}
    `, ...queryParams);

    // Get lead metrics
    const leadMetrics = await db.rawQueryRow<{
      total_leads: number;
      converted_leads: number;
    }>(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN converted_project_id IS NOT NULL THEN 1 END) as converted_leads
      FROM leads l
      ${whereClause.replace('created_at', 'l.created_at').replace('city_id', 'l.city_id')}
    `, ...queryParams);

    const conversionRate = leadMetrics && leadMetrics.total_leads > 0 
      ? (leadMetrics.converted_leads / leadMetrics.total_leads) * 100 
      : 0;

    // Get top cities
    const topCities = await db.rawQueryAll<{
      name: string;
      project_count: number;
      revenue: number;
    }>(`
      SELECT 
        c.name,
        COUNT(p.id) as project_count,
        COALESCE(SUM(p.actual_cost), 0) as revenue
      FROM cities c
      LEFT JOIN projects p ON c.id = p.city_id
      ${whereClause.replace('created_at', 'p.created_at').replace('city_id', 'p.city_id')}
      GROUP BY c.id, c.name
      ORDER BY project_count DESC, revenue DESC
      LIMIT 5
    `, ...queryParams);

    // Get projects by status
    const projectsByStatus = await db.rawQueryAll<{
      status: string;
      count: number;
    }>(`
      SELECT status, COUNT(*) as count
      FROM projects p
      ${whereClause.replace('created_at', 'p.created_at').replace('city_id', 'p.city_id')}
      GROUP BY status
      ORDER BY count DESC
    `, ...queryParams);

    // Get leads by source
    const leadsBySource = await db.rawQueryAll<{
      source: string;
      count: number;
    }>(`
      SELECT COALESCE(source, 'Unknown') as source, COUNT(*) as count
      FROM leads l
      ${whereClause.replace('created_at', 'l.created_at').replace('city_id', 'l.city_id')}
      GROUP BY source
      ORDER BY count DESC
    `, ...queryParams);

    // Get monthly trends
    const monthlyTrends = await db.rawQueryAll<{
      month: string;
      projects: number;
      leads: number;
      revenue: number;
    }>(`
      WITH months AS (
        SELECT DATE_TRUNC('month', generate_series(
          COALESCE($${queryParams.length + 1}::date, NOW() - INTERVAL '12 months'),
          COALESCE($${queryParams.length + 2}::date, NOW()),
          '1 month'::interval
        )) as month
      )
      SELECT 
        TO_CHAR(m.month, 'YYYY-MM') as month,
        COALESCE(COUNT(p.id), 0) as projects,
        COALESCE(COUNT(l.id), 0) as leads,
        COALESCE(SUM(p.actual_cost), 0) as revenue
      FROM months m
      LEFT JOIN projects p ON DATE_TRUNC('month', p.created_at) = m.month
      LEFT JOIN leads l ON DATE_TRUNC('month', l.created_at) = m.month
      GROUP BY m.month
      ORDER BY m.month
    `, ...queryParams, params.dateFrom || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), params.dateTo || new Date().toISOString());

    return {
      totalProjects: projectMetrics?.total_projects || 0,
      activeProjects: projectMetrics?.active_projects || 0,
      completedProjects: projectMetrics?.completed_projects || 0,
      totalLeads: leadMetrics?.total_leads || 0,
      convertedLeads: leadMetrics?.converted_leads || 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalRevenue: projectMetrics?.total_revenue || 0,
      revenue: projectMetrics?.total_revenue || 0,
      avgProjectValue: projectMetrics?.avg_project_value || 0,
      topCities: topCities.map(city => ({
        name: city.name,
        projectCount: city.project_count,
        revenue: city.revenue
      })),
      projectsByStatus: projectsByStatus.map(status => ({
        status: status.status,
        count: status.count
      })),
      leadsBySource: leadsBySource.map(source => ({
        source: source.source,
        count: source.count
      })),
      monthlyTrends: monthlyTrends.map(trend => ({
        month: trend.month,
        projects: trend.projects,
        leads: trend.leads,
        revenue: trend.revenue
      }))
    };
  }
);
