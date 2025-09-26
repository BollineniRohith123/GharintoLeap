import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface CustomReport {
  id: number;
  name: string;
  description?: string;
  report_type: 'table' | 'chart' | 'dashboard';
  data_source: string;
  query: string;
  parameters: ReportParameter[];
  visualization_config?: any;
  is_public: boolean;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  required: boolean;
  default_value?: any;
  options?: string[];
  description?: string;
}

interface ReportExecution {
  id: number;
  report_id: number;
  parameters: Record<string, any>;
  status: 'running' | 'completed' | 'failed';
  result_data?: any;
  error_message?: string;
  execution_time_ms: number;
  executed_by: number;
  executed_at: Date;
}

interface CreateReportRequest {
  name: string;
  description?: string;
  report_type: 'table' | 'chart' | 'dashboard';
  data_source: string;
  query: string;
  parameters?: ReportParameter[];
  visualization_config?: any;
  is_public?: boolean;
}

interface ExecuteReportRequest {
  report_id: number;
  parameters?: Record<string, any>;
  format?: 'json' | 'csv' | 'pdf';
}

interface ReportListParams {
  page?: Query<number>;
  limit?: Query<number>;
  report_type?: Query<string>;
  created_by?: Query<number>;
  is_public?: Query<boolean>;
  search?: Query<string>;
}

// Create custom report
export const createCustomReport = api<CreateReportRequest, CustomReport>(
  { auth: true, expose: true, method: "POST", path: "/analytics/reports" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('reports.create') && !auth.permissions.includes('analytics.manage')) {
      throw APIError.forbidden("Insufficient permissions to create custom reports");
    }

    // Validate required fields
    if (!req.name || !req.data_source || !req.query) {
      throw APIError.badRequest("Name, data source, and query are required");
    }

    // Validate query safety (basic SQL injection prevention)
    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE'];
    const upperQuery = req.query.toUpperCase();
    for (const keyword of dangerousKeywords) {
      if (upperQuery.includes(keyword)) {
        throw APIError.badRequest(`Query contains dangerous keyword: ${keyword}`);
      }
    }

    try {
      // Mock report creation
      const report: CustomReport = {
        id: Math.floor(Math.random() * 1000000),
        name: req.name,
        description: req.description,
        report_type: req.report_type,
        data_source: req.data_source,
        query: req.query,
        parameters: req.parameters || [],
        visualization_config: req.visualization_config,
        is_public: req.is_public || false,
        created_by: parseInt(auth.userID),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Log report creation
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'create', 'custom_report', ${report.id}, ${JSON.stringify(report)})
      `;

      return report;

    } catch (error) {
      console.error('Create custom report error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create custom report");
    }
  }
);

// Get custom report by ID
export const getCustomReport = api<{ id: number }, CustomReport>(
  { auth: true, expose: true, method: "GET", path: "/analytics/reports/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Mock report data
    const report: CustomReport = {
      id: id,
      name: "Monthly Revenue Report",
      description: "Detailed monthly revenue breakdown by project type and client segment",
      report_type: "chart",
      data_source: "projects",
      query: `
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          project_type,
          SUM(budget) as revenue,
          COUNT(*) as project_count
        FROM projects 
        WHERE status = 'completed'
        AND created_at >= $start_date
        AND created_at <= $end_date
        GROUP BY DATE_TRUNC('month', created_at), project_type
        ORDER BY month, project_type
      `,
      parameters: [
        {
          name: "start_date",
          type: "date",
          required: true,
          default_value: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: "Report start date"
        },
        {
          name: "end_date",
          type: "date",
          required: true,
          default_value: new Date().toISOString().split('T')[0],
          description: "Report end date"
        },
        {
          name: "project_type",
          type: "select",
          required: false,
          options: ["residential", "commercial", "hospitality", "retail"],
          description: "Filter by project type (optional)"
        }
      ],
      visualization_config: {
        chart_type: "line",
        x_axis: "month",
        y_axis: "revenue",
        group_by: "project_type",
        colors: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"]
      },
      is_public: false,
      created_by: 1,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    };

    // Check permissions
    const userId = parseInt(auth.userID);
    const canView = report.created_by === userId || 
                   report.is_public ||
                   auth.permissions.includes('reports.view');

    if (!canView) {
      throw APIError.forbidden("Access denied to this report");
    }

    return report;
  }
);

// List custom reports
export const listCustomReports = api<ReportListParams, { reports: any[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/analytics/reports" },
  async (params) => {
    const auth = getAuthData()!;
    
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const userId = parseInt(auth.userID);

    // Mock reports data
    const mockReports = [
      {
        id: 1,
        name: "Monthly Revenue Report",
        description: "Detailed monthly revenue breakdown",
        report_type: "chart",
        data_source: "projects",
        is_public: false,
        created_by: 1,
        created_by_name: "Admin User",
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        last_executed: new Date(Date.now() - 2 * 60 * 60 * 1000),
        execution_count: 15
      },
      {
        id: 2,
        name: "Client Satisfaction Analysis",
        description: "Customer satisfaction trends and feedback analysis",
        report_type: "dashboard",
        data_source: "testimonials",
        is_public: true,
        created_by: 2,
        created_by_name: "John Designer",
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        last_executed: new Date(Date.now() - 24 * 60 * 60 * 1000),
        execution_count: 8
      },
      {
        id: 3,
        name: "Project Performance Metrics",
        description: "Comprehensive project performance and timeline analysis",
        report_type: "table",
        data_source: "projects",
        is_public: false,
        created_by: userId,
        created_by_name: "Current User",
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        last_executed: new Date(Date.now() - 6 * 60 * 60 * 1000),
        execution_count: 22
      }
    ];

    // Filter reports based on permissions
    let filteredReports = mockReports.filter(report => 
      report.created_by === userId || 
      report.is_public ||
      auth.permissions.includes('reports.view')
    );

    // Apply filters
    if (params.report_type) {
      filteredReports = filteredReports.filter(report => report.report_type === params.report_type);
    }

    if (params.created_by) {
      filteredReports = filteredReports.filter(report => report.created_by === params.created_by);
    }

    if (params.is_public !== undefined) {
      filteredReports = filteredReports.filter(report => report.is_public === params.is_public);
    }

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredReports = filteredReports.filter(report => 
        report.name.toLowerCase().includes(searchLower) ||
        (report.description && report.description.toLowerCase().includes(searchLower))
      );
    }

    const startIndex = (page - 1) * limit;
    const paginatedReports = filteredReports.slice(startIndex, startIndex + limit);

    return {
      reports: paginatedReports,
      total: filteredReports.length,
      page,
      limit
    };
  }
);

// Execute custom report
export const executeCustomReport = api<ExecuteReportRequest, { 
  execution_id: number;
  status: string;
  data?: any;
  execution_time_ms: number;
}>(
  { auth: true, expose: true, method: "POST", path: "/analytics/reports/execute" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('reports.execute') && !auth.permissions.includes('analytics.view')) {
      throw APIError.forbidden("Insufficient permissions to execute reports");
    }

    const startTime = Date.now();

    try {
      // Get report details (mock)
      const report = await getCustomReport.handler({ id: req.report_id });

      // Validate parameters
      for (const param of report.parameters) {
        if (param.required && !req.parameters?.[param.name]) {
          throw APIError.badRequest(`Required parameter '${param.name}' is missing`);
        }
      }

      // Mock report execution
      const executionId = Math.floor(Math.random() * 1000000);
      
      // Simulate query execution with mock data
      const mockData = [
        {
          month: "2024-01",
          project_type: "residential",
          revenue: 450000,
          project_count: 3
        },
        {
          month: "2024-01",
          project_type: "commercial",
          revenue: 750000,
          project_count: 2
        },
        {
          month: "2024-02",
          project_type: "residential",
          revenue: 520000,
          project_count: 4
        },
        {
          month: "2024-02",
          project_type: "commercial",
          revenue: 680000,
          project_count: 2
        }
      ];

      const executionTime = Date.now() - startTime;

      // Log report execution
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'execute_report', 'custom_report', ${req.report_id}, ${JSON.stringify({
          execution_id: executionId,
          parameters: req.parameters,
          format: req.format,
          execution_time_ms: executionTime
        })})
      `;

      return {
        execution_id: executionId,
        status: "completed",
        data: mockData,
        execution_time_ms: executionTime
      };

    } catch (error) {
      console.error('Execute custom report error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to execute report");
    }
  }
);

// Update custom report
export const updateCustomReport = api<{ id: number } & Partial<CreateReportRequest>, CustomReport>(
  { auth: true, expose: true, method: "PUT", path: "/analytics/reports/:id" },
  async ({ id, ...req }) => {
    const auth = getAuthData()!;
    
    // Get existing report
    const existingReport = await getCustomReport.handler({ id });

    // Check permissions
    const userId = parseInt(auth.userID);
    const canEdit = existingReport.created_by === userId || 
                   auth.permissions.includes('reports.manage');

    if (!canEdit) {
      throw APIError.forbidden("Access denied to edit this report");
    }

    // Validate query safety if provided
    if (req.query) {
      const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE'];
      const upperQuery = req.query.toUpperCase();
      for (const keyword of dangerousKeywords) {
        if (upperQuery.includes(keyword)) {
          throw APIError.badRequest(`Query contains dangerous keyword: ${keyword}`);
        }
      }
    }

    try {
      // Mock report update
      const updatedReport: CustomReport = {
        ...existingReport,
        name: req.name || existingReport.name,
        description: req.description !== undefined ? req.description : existingReport.description,
        report_type: req.report_type || existingReport.report_type,
        data_source: req.data_source || existingReport.data_source,
        query: req.query || existingReport.query,
        parameters: req.parameters || existingReport.parameters,
        visualization_config: req.visualization_config || existingReport.visualization_config,
        is_public: req.is_public !== undefined ? req.is_public : existingReport.is_public,
        updated_at: new Date()
      };

      // Log report update
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'update', 'custom_report', ${id}, ${JSON.stringify(existingReport)}, ${JSON.stringify(updatedReport)})
      `;

      return updatedReport;

    } catch (error) {
      console.error('Update custom report error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update report");
    }
  }
);

// Delete custom report
export const deleteCustomReport = api<{ id: number }, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "DELETE", path: "/analytics/reports/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Get report
    const report = await getCustomReport.handler({ id });

    // Check permissions
    const userId = parseInt(auth.userID);
    const canDelete = report.created_by === userId || 
                     auth.permissions.includes('reports.manage');

    if (!canDelete) {
      throw APIError.forbidden("Access denied to delete this report");
    }

    try {
      // Log report deletion
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values)
        VALUES (${auth.userID}, 'delete', 'custom_report', ${id}, ${JSON.stringify(report)})
      `;

      return {
        success: true,
        message: "Custom report deleted successfully"
      };

    } catch (error) {
      console.error('Delete custom report error:', error);
      throw APIError.internal("Failed to delete report");
    }
  }
);

// Get report execution history
export const getReportExecutionHistory = api<{ 
  report_id?: Query<number>;
  executed_by?: Query<number>;
  limit?: Query<number>;
}, { executions: any[]; total: number }>(
  { auth: true, expose: true, method: "GET", path: "/analytics/reports/executions" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('reports.view') && !auth.permissions.includes('analytics.view')) {
      throw APIError.forbidden("Insufficient permissions to view report execution history");
    }

    const limit = Math.min(params.limit || 50, 200);

    // Mock execution history
    const mockExecutions = [
      {
        id: 1,
        report_id: 1,
        report_name: "Monthly Revenue Report",
        parameters: { start_date: "2024-01-01", end_date: "2024-02-29" },
        status: "completed",
        execution_time_ms: 1250,
        executed_by: 1,
        executed_by_name: "Admin User",
        executed_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 2,
        report_id: 2,
        report_name: "Client Satisfaction Analysis",
        parameters: {},
        status: "completed",
        execution_time_ms: 850,
        executed_by: 2,
        executed_by_name: "John Designer",
        executed_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        id: 3,
        report_id: 1,
        report_name: "Monthly Revenue Report",
        parameters: { start_date: "2024-02-01", end_date: "2024-03-31" },
        status: "failed",
        execution_time_ms: 0,
        executed_by: 1,
        executed_by_name: "Admin User",
        executed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        error_message: "Database connection timeout"
      }
    ];

    // Apply filters
    let filteredExecutions = mockExecutions;

    if (params.report_id) {
      filteredExecutions = filteredExecutions.filter(exec => exec.report_id === params.report_id);
    }

    if (params.executed_by) {
      filteredExecutions = filteredExecutions.filter(exec => exec.executed_by === params.executed_by);
    }

    // Sort by execution time (newest first) and limit
    filteredExecutions.sort((a, b) => b.executed_at.getTime() - a.executed_at.getTime());
    filteredExecutions = filteredExecutions.slice(0, limit);

    return {
      executions: filteredExecutions,
      total: mockExecutions.length
    };
  }
);

// Get available data sources
export const getDataSources = api<{}, { data_sources: any[] }>(
  { auth: true, expose: true, method: "GET", path: "/analytics/reports/data-sources" },
  async () => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('reports.create') && !auth.permissions.includes('analytics.view')) {
      throw APIError.forbidden("Insufficient permissions to view data sources");
    }

    const dataSources = [
      {
        name: "projects",
        description: "Project data including budgets, timelines, and status",
        tables: ["projects", "project_tasks", "change_orders"],
        available_fields: ["id", "title", "budget", "status", "start_date", "end_date", "client_id", "designer_id"]
      },
      {
        name: "users",
        description: "User and client information",
        tables: ["users", "user_roles", "roles"],
        available_fields: ["id", "first_name", "last_name", "email", "role", "created_at", "last_login_at"]
      },
      {
        name: "finance",
        description: "Financial data including invoices, payments, and quotations",
        tables: ["invoices", "payments", "quotations"],
        available_fields: ["id", "amount", "status", "due_date", "created_at", "client_id"]
      },
      {
        name: "testimonials",
        description: "Customer testimonials and ratings",
        tables: ["testimonials"],
        available_fields: ["id", "client_name", "rating", "testimonial_text", "is_approved", "created_at"]
      }
    ];

    return { data_sources: dataSources };
  }
);
