import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface FinancialSummary {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  outstanding_invoices: number;
  pending_payments: number;
  total_quotations: number;
  accepted_quotations: number;
  conversion_rate: number;
}

interface RevenueReport {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  invoice_count: number;
  average_invoice_value: number;
}

interface ClientFinancialSummary {
  client_id: number;
  client_name: string;
  total_projects: number;
  total_revenue: number;
  outstanding_amount: number;
  last_payment_date?: Date;
  payment_status: 'good' | 'warning' | 'overdue';
}

interface VendorSpendingSummary {
  vendor_id: number;
  vendor_name: string;
  total_orders: number;
  total_spending: number;
  pending_orders: number;
  last_order_date?: Date;
}

interface ReportParams {
  start_date?: Query<string>;
  end_date?: Query<string>;
  period?: Query<'daily' | 'weekly' | 'monthly' | 'yearly'>;
  client_id?: Query<number>;
  project_id?: Query<number>;
}

// Get financial dashboard summary
export const getFinancialSummary = api<{}, FinancialSummary>(
  { auth: true, expose: true, method: "GET", path: "/finance/reports/summary" },
  async () => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.view') && !auth.permissions.includes('reports.view')) {
      throw APIError.forbidden("Insufficient permissions to view financial reports");
    }

    try {
      // Get revenue from completed projects
      const revenueData = await db.queryRow`
        SELECT 
          COALESCE(SUM(budget), 0) as total_revenue
        FROM projects 
        WHERE status IN ('completed', 'in_progress')
      `;

      // Get expenses from purchase orders
      const expenseData = await db.queryRow`
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_expenses
        FROM purchase_orders 
        WHERE status IN ('confirmed', 'completed')
      `;

      // Get outstanding invoices
      const outstandingData = await db.queryRow`
        SELECT 
          COALESCE(SUM(balance_amount), 0) as outstanding_invoices,
          COUNT(*) FILTER (WHERE balance_amount > 0) as pending_count
        FROM invoices 
        WHERE status NOT IN ('paid', 'cancelled')
      `;

      // Get pending payments
      const pendingPayments = await db.queryRow`
        SELECT 
          COALESCE(SUM(amount), 0) as pending_payments
        FROM payments 
        WHERE status = 'pending'
      `;

      // Get quotation statistics
      const quotationStats = await db.queryRow`
        SELECT 
          COUNT(*) as total_quotations,
          COUNT(*) FILTER (WHERE status = 'accepted') as accepted_quotations
        FROM quotations
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `;

      const total_revenue = parseInt(revenueData?.total_revenue || '0');
      const total_expenses = parseInt(expenseData?.total_expenses || '0');
      const net_profit = total_revenue - total_expenses;
      const outstanding_invoices = parseInt(outstandingData?.outstanding_invoices || '0');
      const pending_payments_amount = parseInt(pendingPayments?.pending_payments || '0');
      const total_quotations = parseInt(quotationStats?.total_quotations || '0');
      const accepted_quotations = parseInt(quotationStats?.accepted_quotations || '0');
      const conversion_rate = total_quotations > 0 ? (accepted_quotations / total_quotations) * 100 : 0;

      return {
        total_revenue,
        total_expenses,
        net_profit,
        outstanding_invoices,
        pending_payments: pending_payments_amount,
        total_quotations,
        accepted_quotations,
        conversion_rate: Math.round(conversion_rate * 100) / 100
      };

    } catch (error) {
      console.error('Financial summary error:', error);
      throw APIError.internal("Failed to fetch financial summary");
    }
  }
);

// Get revenue report by period
export const getRevenueReport = api<ReportParams, { reports: RevenueReport[]; total_revenue: number; total_profit: number }>(
  { auth: true, expose: true, method: "GET", path: "/finance/reports/revenue" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.view') && !auth.permissions.includes('reports.view')) {
      throw APIError.forbidden("Insufficient permissions to view revenue reports");
    }

    const period = params.period || 'monthly';
    const endDate = params.end_date || new Date().toISOString().split('T')[0];
    const startDate = params.start_date || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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

      // Generate revenue report
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
            DATE_TRUNC('${period === 'weekly' ? 'week' : period === 'yearly' ? 'year' : period === 'daily' ? 'day' : 'month'}', i.created_at) as period_start,
            SUM(i.total_amount) as revenue,
            COUNT(i.id) as invoice_count,
            AVG(i.total_amount) as avg_invoice_value
          FROM invoices i
          WHERE i.created_at >= $1 AND i.created_at <= $2
          AND i.status NOT IN ('cancelled')
          GROUP BY DATE_TRUNC('${period === 'weekly' ? 'week' : period === 'yearly' ? 'year' : period === 'daily' ? 'day' : 'month'}', i.created_at)
        ),
        expense_data AS (
          SELECT 
            DATE_TRUNC('${period === 'weekly' ? 'week' : period === 'yearly' ? 'year' : period === 'daily' ? 'day' : 'month'}', po.created_at) as period_start,
            SUM(po.total_amount) as expenses
          FROM purchase_orders po
          WHERE po.created_at >= $1 AND po.created_at <= $2
          AND po.status NOT IN ('cancelled')
          GROUP BY DATE_TRUNC('${period === 'weekly' ? 'week' : period === 'yearly' ? 'year' : period === 'daily' ? 'day' : 'month'}', po.created_at)
        )
        SELECT 
          ds.period_start,
          TO_CHAR(ds.period_start, '${dateFormat}') as period,
          COALESCE(rd.revenue, 0) as revenue,
          COALESCE(ed.expenses, 0) as expenses,
          COALESCE(rd.revenue, 0) - COALESCE(ed.expenses, 0) as profit,
          COALESCE(rd.invoice_count, 0) as invoice_count,
          COALESCE(rd.avg_invoice_value, 0) as average_invoice_value
        FROM date_series ds
        LEFT JOIN revenue_data rd ON ds.period_start = rd.period_start
        LEFT JOIN expense_data ed ON ds.period_start = ed.period_start
        ORDER BY ds.period_start
      `;

      const reportResult = await db.query(revenueQuery, startDate, endDate);
      const reports: RevenueReport[] = [];
      let total_revenue = 0;
      let total_profit = 0;

      for await (const row of reportResult) {
        const report: RevenueReport = {
          period: row.period,
          revenue: parseInt(row.revenue || '0'),
          expenses: parseInt(row.expenses || '0'),
          profit: parseInt(row.profit || '0'),
          invoice_count: parseInt(row.invoice_count || '0'),
          average_invoice_value: parseFloat(row.average_invoice_value || '0')
        };
        reports.push(report);
        total_revenue += report.revenue;
        total_profit += report.profit;
      }

      return {
        reports,
        total_revenue,
        total_profit
      };

    } catch (error) {
      console.error('Revenue report error:', error);
      throw APIError.internal("Failed to generate revenue report");
    }
  }
);

// Get client financial summary
export const getClientFinancialReport = api<ReportParams, { clients: ClientFinancialSummary[] }>(
  { auth: true, expose: true, method: "GET", path: "/finance/reports/clients" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.view') && !auth.permissions.includes('reports.view')) {
      throw APIError.forbidden("Insufficient permissions to view client financial reports");
    }

    try {
      let whereClause = "WHERE 1=1";
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (params.start_date) {
        whereClause += ` AND p.created_at >= $${paramIndex}`;
        queryParams.push(params.start_date);
        paramIndex++;
      }

      if (params.end_date) {
        whereClause += ` AND p.created_at <= $${paramIndex}`;
        queryParams.push(params.end_date);
        paramIndex++;
      }

      if (params.client_id) {
        whereClause += ` AND u.id = $${paramIndex}`;
        queryParams.push(params.client_id);
        paramIndex++;
      }

      const clientQuery = `
        SELECT 
          u.id as client_id,
          u.first_name || ' ' || u.last_name as client_name,
          COUNT(DISTINCT p.id) as total_projects,
          COALESCE(SUM(p.budget), 0) as total_revenue,
          COALESCE(SUM(i.balance_amount), 0) as outstanding_amount,
          MAX(py.created_at) as last_payment_date,
          CASE 
            WHEN COALESCE(SUM(i.balance_amount), 0) = 0 THEN 'good'
            WHEN MAX(i.due_date) < CURRENT_DATE AND COALESCE(SUM(i.balance_amount), 0) > 0 THEN 'overdue'
            ELSE 'warning'
          END as payment_status
        FROM users u
        LEFT JOIN projects p ON u.id = p.client_id
        LEFT JOIN invoices i ON p.id = i.project_id AND i.balance_amount > 0
        LEFT JOIN payments py ON p.id = py.project_id AND py.status = 'completed'
        ${whereClause}
        GROUP BY u.id, u.first_name, u.last_name
        HAVING COUNT(DISTINCT p.id) > 0
        ORDER BY total_revenue DESC
      `;

      const clientResult = await db.query(clientQuery, ...queryParams);
      const clients: ClientFinancialSummary[] = [];

      for await (const row of clientResult) {
        clients.push({
          client_id: row.client_id,
          client_name: row.client_name,
          total_projects: parseInt(row.total_projects || '0'),
          total_revenue: parseInt(row.total_revenue || '0'),
          outstanding_amount: parseInt(row.outstanding_amount || '0'),
          last_payment_date: row.last_payment_date,
          payment_status: row.payment_status
        });
      }

      return { clients };

    } catch (error) {
      console.error('Client financial report error:', error);
      throw APIError.internal("Failed to generate client financial report");
    }
  }
);

// Get vendor spending report
export const getVendorSpendingReport = api<ReportParams, { vendors: VendorSpendingSummary[] }>(
  { auth: true, expose: true, method: "GET", path: "/finance/reports/vendors" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.view') && !auth.permissions.includes('reports.view')) {
      throw APIError.forbidden("Insufficient permissions to view vendor spending reports");
    }

    try {
      let whereClause = "WHERE 1=1";
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (params.start_date) {
        whereClause += ` AND po.created_at >= $${paramIndex}`;
        queryParams.push(params.start_date);
        paramIndex++;
      }

      if (params.end_date) {
        whereClause += ` AND po.created_at <= $${paramIndex}`;
        queryParams.push(params.end_date);
        paramIndex++;
      }

      const vendorQuery = `
        SELECT 
          v.id as vendor_id,
          v.company_name as vendor_name,
          COUNT(po.id) as total_orders,
          COALESCE(SUM(po.total_amount), 0) as total_spending,
          COUNT(po.id) FILTER (WHERE po.status IN ('draft', 'sent', 'confirmed')) as pending_orders,
          MAX(po.created_at) as last_order_date
        FROM vendors v
        LEFT JOIN purchase_orders po ON v.id = po.vendor_id
        ${whereClause}
        GROUP BY v.id, v.company_name
        HAVING COUNT(po.id) > 0
        ORDER BY total_spending DESC
      `;

      const vendorResult = await db.query(vendorQuery, ...queryParams);
      const vendors: VendorSpendingSummary[] = [];

      for await (const row of vendorResult) {
        vendors.push({
          vendor_id: row.vendor_id,
          vendor_name: row.vendor_name,
          total_orders: parseInt(row.total_orders || '0'),
          total_spending: parseInt(row.total_spending || '0'),
          pending_orders: parseInt(row.pending_orders || '0'),
          last_order_date: row.last_order_date
        });
      }

      return { vendors };

    } catch (error) {
      console.error('Vendor spending report error:', error);
      throw APIError.internal("Failed to generate vendor spending report");
    }
  }
);

// Get overdue invoices report
export const getOverdueInvoicesReport = api<{}, { invoices: any[]; total_overdue_amount: number }>(
  { auth: true, expose: true, method: "GET", path: "/finance/reports/overdue-invoices" },
  async () => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.view') && !auth.permissions.includes('reports.view')) {
      throw APIError.forbidden("Insufficient permissions to view overdue invoices report");
    }

    try {
      const overdueQuery = `
        SELECT 
          i.id,
          i.invoice_number,
          i.title,
          i.total_amount,
          i.balance_amount,
          i.due_date,
          i.created_at,
          u.first_name || ' ' || u.last_name as client_name,
          u.email as client_email,
          p.title as project_title,
          CURRENT_DATE - i.due_date as days_overdue
        FROM invoices i
        JOIN users u ON i.client_id = u.id
        LEFT JOIN projects p ON i.project_id = p.id
        WHERE i.due_date < CURRENT_DATE 
        AND i.balance_amount > 0
        AND i.status NOT IN ('paid', 'cancelled')
        ORDER BY i.due_date ASC
      `;

      const overdueResult = await db.query(overdueQuery);
      const invoices: any[] = [];
      let total_overdue_amount = 0;

      for await (const row of overdueResult) {
        const invoice = {
          id: row.id,
          invoice_number: row.invoice_number,
          title: row.title,
          total_amount: parseInt(row.total_amount || '0'),
          balance_amount: parseInt(row.balance_amount || '0'),
          due_date: row.due_date,
          created_at: row.created_at,
          client_name: row.client_name,
          client_email: row.client_email,
          project_title: row.project_title,
          days_overdue: parseInt(row.days_overdue || '0')
        };
        invoices.push(invoice);
        total_overdue_amount += invoice.balance_amount;
      }

      return {
        invoices,
        total_overdue_amount
      };

    } catch (error) {
      console.error('Overdue invoices report error:', error);
      throw APIError.internal("Failed to generate overdue invoices report");
    }
  }
);

// Export financial data (CSV format)
export const exportFinancialData = api<{ 
  type: 'invoices' | 'quotations' | 'purchase_orders' | 'payments';
  start_date?: string;
  end_date?: string;
  format?: 'csv' | 'json';
}, { data: string; filename: string; content_type: string }>(
  { auth: true, expose: true, method: "GET", path: "/finance/reports/export" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.export') && !auth.permissions.includes('reports.export')) {
      throw APIError.forbidden("Insufficient permissions to export financial data");
    }

    const format = params.format || 'csv';
    const endDate = params.end_date || new Date().toISOString().split('T')[0];
    const startDate = params.start_date || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    try {
      let query: string;
      let filename: string;

      switch (params.type) {
        case 'invoices':
          query = `
            SELECT 
              i.invoice_number,
              i.title,
              i.total_amount,
              i.paid_amount,
              i.balance_amount,
              i.status,
              i.due_date,
              i.created_at,
              u.first_name || ' ' || u.last_name as client_name,
              p.title as project_title
            FROM invoices i
            JOIN users u ON i.client_id = u.id
            LEFT JOIN projects p ON i.project_id = p.id
            WHERE i.created_at >= $1 AND i.created_at <= $2
            ORDER BY i.created_at DESC
          `;
          filename = `invoices_${startDate}_to_${endDate}`;
          break;

        case 'quotations':
          query = `
            SELECT 
              q.quotation_number,
              q.title,
              q.total_amount,
              q.status,
              q.valid_until,
              q.created_at,
              u.first_name || ' ' || u.last_name as client_name,
              p.title as project_title
            FROM quotations q
            JOIN users u ON q.client_id = u.id
            LEFT JOIN projects p ON q.project_id = p.id
            WHERE q.created_at >= $1 AND q.created_at <= $2
            ORDER BY q.created_at DESC
          `;
          filename = `quotations_${startDate}_to_${endDate}`;
          break;

        case 'purchase_orders':
          query = `
            SELECT 
              po.po_number,
              po.title,
              po.total_amount,
              po.status,
              po.expected_delivery_date,
              po.created_at,
              v.company_name as vendor_name,
              p.title as project_title
            FROM purchase_orders po
            JOIN vendors v ON po.vendor_id = v.id
            LEFT JOIN projects p ON po.project_id = p.id
            WHERE po.created_at >= $1 AND po.created_at <= $2
            ORDER BY po.created_at DESC
          `;
          filename = `purchase_orders_${startDate}_to_${endDate}`;
          break;

        case 'payments':
          query = `
            SELECT 
              py.amount,
              py.payment_type,
              py.status,
              py.payment_method,
              py.transaction_id,
              py.created_at,
              p.title as project_title
            FROM payments py
            LEFT JOIN projects p ON py.project_id = p.id
            WHERE py.created_at >= $1 AND py.created_at <= $2
            ORDER BY py.created_at DESC
          `;
          filename = `payments_${startDate}_to_${endDate}`;
          break;

        default:
          throw APIError.badRequest("Invalid export type");
      }

      const result = await db.query(query, startDate, endDate);
      const rows: any[] = [];
      
      for await (const row of result) {
        rows.push(row);
      }

      if (format === 'json') {
        return {
          data: JSON.stringify(rows, null, 2),
          filename: `${filename}.json`,
          content_type: 'application/json'
        };
      } else {
        // Convert to CSV
        if (rows.length === 0) {
          return {
            data: '',
            filename: `${filename}.csv`,
            content_type: 'text/csv'
          };
        }

        const headers = Object.keys(rows[0]);
        const csvData = [
          headers.join(','),
          ...rows.map(row => 
            headers.map(header => 
              typeof row[header] === 'string' && row[header].includes(',') 
                ? `"${row[header]}"` 
                : row[header] || ''
            ).join(',')
          )
        ].join('\n');

        return {
          data: csvData,
          filename: `${filename}.csv`,
          content_type: 'text/csv'
        };
      }

    } catch (error) {
      console.error('Export financial data error:', error);
      throw APIError.internal("Failed to export financial data");
    }
  }
);
