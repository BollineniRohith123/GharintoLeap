import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

export interface TaxRate {
  id: number;
  name: string;
  rate: number;
  type: 'gst' | 'vat' | 'service_tax';
  is_active: boolean;
  effective_from: Date;
  effective_to?: Date;
  created_at: Date;
}

interface CreateTaxRateRequest {
  name: string;
  rate: number;
  type: 'gst' | 'vat' | 'service_tax';
  effective_from: string;
  effective_to?: string;
}

interface UpdateTaxRateRequest {
  name?: string;
  rate?: number;
  effective_from?: string;
  effective_to?: string;
  is_active?: boolean;
}

interface TaxListParams {
  page?: Query<number>;
  limit?: Query<number>;
  type?: Query<string>;
  is_active?: Query<boolean>;
}

interface TaxCalculationRequest {
  amount: number;
  tax_type?: string;
  effective_date?: string;
}

interface TaxCalculationResponse {
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  total_amount: number;
  tax_details: {
    name: string;
    rate: number;
    amount: number;
  }[];
}

// Create new tax rate
export const createTaxRate = api<CreateTaxRateRequest, TaxRate>(
  { auth: true, expose: true, method: "POST", path: "/finance/tax-rates" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions - only admins can manage tax rates
    if (!auth.permissions.includes('finance.admin') && !auth.permissions.includes('tax.manage')) {
      throw APIError.forbidden("Insufficient permissions to create tax rates");
    }

    // Validate required fields
    if (!req.name || req.rate < 0 || !req.effective_from) {
      throw APIError.badRequest("Name, valid rate, and effective date are required");
    }

    if (req.rate > 100) {
      throw APIError.badRequest("Tax rate cannot exceed 100%");
    }

    try {
      // Check for duplicate tax rate names
      const existingTaxRate = await db.queryRow`
        SELECT id FROM tax_rates 
        WHERE name = ${req.name} AND is_active = true
      `;

      if (existingTaxRate) {
        throw APIError.alreadyExists("Tax rate with this name already exists");
      }

      // Create tax rate
      const taxRate = await db.queryRow<TaxRate>`
        INSERT INTO tax_rates (
          name, rate, type, effective_from, effective_to, is_active
        ) VALUES (
          ${req.name}, ${req.rate}, ${req.type}, ${req.effective_from}, ${req.effective_to || null}, true
        )
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'create', 'tax_rate', ${taxRate.id}, ${JSON.stringify(taxRate)})
      `;

      return taxRate;

    } catch (error) {
      console.error('Tax rate creation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create tax rate");
    }
  }
);

// Get tax rate by ID
export const getTaxRate = api<{ id: number }, TaxRate>(
  { auth: true, expose: true, method: "GET", path: "/finance/tax-rates/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.view') && !auth.permissions.includes('tax.view')) {
      throw APIError.forbidden("Insufficient permissions to view tax rates");
    }

    const taxRate = await db.queryRow<TaxRate>`
      SELECT * FROM tax_rates WHERE id = ${id}
    `;

    if (!taxRate) {
      throw APIError.notFound("Tax rate not found");
    }

    return taxRate;
  }
);

// List tax rates with filtering
export const listTaxRates = api<TaxListParams, { taxRates: TaxRate[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/finance/tax-rates" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.view') && !auth.permissions.includes('tax.view')) {
      throw APIError.forbidden("Insufficient permissions to view tax rates");
    }

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Type filter
    if (params.type) {
      whereClause += ` AND type = $${paramIndex}`;
      queryParams.push(params.type);
      paramIndex++;
    }

    // Active filter
    if (params.is_active !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      queryParams.push(params.is_active);
      paramIndex++;
    }

    try {
      // Get tax rates
      const taxRatesQuery = `
        SELECT * FROM tax_rates
        ${whereClause}
        ORDER BY effective_from DESC, name
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const taxRatesResult = await db.query(taxRatesQuery, ...queryParams);
      const taxRates: TaxRate[] = [];
      for await (const taxRate of taxRatesResult) {
        taxRates.push(taxRate);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM tax_rates ${whereClause}`;
      const countResult = await db.query(countQuery, ...queryParams.slice(0, -2));
      let total = 0;
      for await (const row of countResult) {
        total = parseInt(row.total);
        break;
      }

      return {
        taxRates,
        total,
        page,
        limit
      };

    } catch (error) {
      console.error('List tax rates error:', error);
      throw APIError.internal("Failed to fetch tax rates");
    }
  }
);

// Update tax rate
export const updateTaxRate = api<{ id: number } & UpdateTaxRateRequest, TaxRate>(
  { auth: true, expose: true, method: "PUT", path: "/finance/tax-rates/:id" },
  async ({ id, ...req }) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.admin') && !auth.permissions.includes('tax.manage')) {
      throw APIError.forbidden("Insufficient permissions to update tax rates");
    }

    // Get existing tax rate
    const existingTaxRate = await db.queryRow<TaxRate>`
      SELECT * FROM tax_rates WHERE id = ${id}
    `;

    if (!existingTaxRate) {
      throw APIError.notFound("Tax rate not found");
    }

    // Validate rate if provided
    if (req.rate !== undefined && (req.rate < 0 || req.rate > 100)) {
      throw APIError.badRequest("Tax rate must be between 0 and 100");
    }

    try {
      // Check for duplicate names if name is being updated
      if (req.name && req.name !== existingTaxRate.name) {
        const duplicateTaxRate = await db.queryRow`
          SELECT id FROM tax_rates 
          WHERE name = ${req.name} AND is_active = true AND id != ${id}
        `;

        if (duplicateTaxRate) {
          throw APIError.alreadyExists("Tax rate with this name already exists");
        }
      }

      // Update tax rate
      const taxRate = await db.queryRow<TaxRate>`
        UPDATE tax_rates SET
          name = COALESCE(${req.name}, name),
          rate = COALESCE(${req.rate}, rate),
          effective_from = COALESCE(${req.effective_from}, effective_from),
          effective_to = COALESCE(${req.effective_to}, effective_to),
          is_active = COALESCE(${req.is_active}, is_active)
        WHERE id = ${id}
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'update', 'tax_rate', ${id}, ${JSON.stringify(existingTaxRate)}, ${JSON.stringify(taxRate)})
      `;

      return taxRate;

    } catch (error) {
      console.error('Tax rate update error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update tax rate");
    }
  }
);

// Calculate tax for given amount
export const calculateTax = api<TaxCalculationRequest, TaxCalculationResponse>(
  { auth: true, expose: true, method: "POST", path: "/finance/calculate-tax" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.view') && !auth.permissions.includes('tax.calculate')) {
      throw APIError.forbidden("Insufficient permissions to calculate tax");
    }

    if (req.amount <= 0) {
      throw APIError.badRequest("Amount must be greater than 0");
    }

    try {
      const effectiveDate = req.effective_date || new Date().toISOString().split('T')[0];
      
      // Get applicable tax rates
      let taxQuery = `
        SELECT * FROM tax_rates 
        WHERE is_active = true 
        AND effective_from <= $1
        AND (effective_to IS NULL OR effective_to >= $1)
      `;
      
      const queryParams = [effectiveDate];
      
      if (req.tax_type) {
        taxQuery += ` AND type = $2`;
        queryParams.push(req.tax_type);
      }
      
      taxQuery += ` ORDER BY rate DESC`;

      const taxRatesResult = await db.query(taxQuery, ...queryParams);
      const taxRates: TaxRate[] = [];
      for await (const taxRate of taxRatesResult) {
        taxRates.push(taxRate);
      }

      if (taxRates.length === 0) {
        // No applicable tax rates found, return zero tax
        return {
          subtotal: req.amount,
          tax_amount: 0,
          tax_rate: 0,
          total_amount: req.amount,
          tax_details: []
        };
      }

      // Use the highest applicable tax rate (typically GST in India)
      const applicableTaxRate = taxRates[0];
      const tax_amount = Math.round(req.amount * applicableTaxRate.rate / 100);
      const total_amount = req.amount + tax_amount;

      return {
        subtotal: req.amount,
        tax_amount,
        tax_rate: applicableTaxRate.rate,
        total_amount,
        tax_details: [{
          name: applicableTaxRate.name,
          rate: applicableTaxRate.rate,
          amount: tax_amount
        }]
      };

    } catch (error) {
      console.error('Tax calculation error:', error);
      throw APIError.internal("Failed to calculate tax");
    }
  }
);

// Get current active tax rates
export const getActiveTaxRates = api<{}, { taxRates: TaxRate[] }>(
  { auth: true, expose: true, method: "GET", path: "/finance/tax-rates/active" },
  async () => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.view') && !auth.permissions.includes('tax.view')) {
      throw APIError.forbidden("Insufficient permissions to view tax rates");
    }

    try {
      const currentDate = new Date().toISOString().split('T')[0];
      
      const taxRatesQuery = db.query<TaxRate>`
        SELECT * FROM tax_rates 
        WHERE is_active = true 
        AND effective_from <= ${currentDate}
        AND (effective_to IS NULL OR effective_to >= ${currentDate})
        ORDER BY type, rate DESC
      `;

      const taxRates: TaxRate[] = [];
      for await (const taxRate of taxRatesQuery) {
        taxRates.push(taxRate);
      }

      return { taxRates };

    } catch (error) {
      console.error('Get active tax rates error:', error);
      throw APIError.internal("Failed to fetch active tax rates");
    }
  }
);

// Deactivate tax rate (soft delete)
export const deactivateTaxRate = api<{ id: number }, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "DELETE", path: "/finance/tax-rates/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.admin') && !auth.permissions.includes('tax.manage')) {
      throw APIError.forbidden("Insufficient permissions to deactivate tax rates");
    }

    const taxRate = await db.queryRow<TaxRate>`
      SELECT * FROM tax_rates WHERE id = ${id}
    `;

    if (!taxRate) {
      throw APIError.notFound("Tax rate not found");
    }

    try {
      // Deactivate instead of deleting to maintain data integrity
      await db.exec`
        UPDATE tax_rates SET
          is_active = false,
          effective_to = CURRENT_DATE
        WHERE id = ${id}
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'deactivate', 'tax_rate', ${id}, ${JSON.stringify(taxRate)}, '{"is_active": false}')
      `;

      return {
        success: true,
        message: "Tax rate deactivated successfully"
      };

    } catch (error) {
      console.error('Deactivate tax rate error:', error);
      throw APIError.internal("Failed to deactivate tax rate");
    }
  }
);
