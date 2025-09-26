import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

export interface Quotation {
  id: number;
  project_id?: number;
  client_id: number;
  quotation_number: string;
  title: string;
  description?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  valid_until?: Date;
  terms_and_conditions?: string;
  notes?: string;
  created_by: number;
  sent_at?: Date;
  accepted_at?: Date;
  rejected_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface QuotationItem {
  id: number;
  quotation_id: number;
  item_type: 'material' | 'service' | 'labor';
  item_id?: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  sort_order: number;
}

interface CreateQuotationRequest {
  project_id?: number;
  client_id: number;
  title: string;
  description?: string;
  valid_until?: string;
  terms_and_conditions?: string;
  notes?: string;
  items: {
    item_type: 'material' | 'service' | 'labor';
    item_id?: number;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
  }[];
}

interface UpdateQuotationRequest {
  title?: string;
  description?: string;
  valid_until?: string;
  terms_and_conditions?: string;
  notes?: string;
  items?: {
    id?: number;
    item_type: 'material' | 'service' | 'labor';
    item_id?: number;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
  }[];
}

interface QuotationListParams {
  page?: Query<number>;
  limit?: Query<number>;
  status?: Query<string>;
  client_id?: Query<number>;
  project_id?: Query<number>;
}

// Generate unique quotation number
async function generateQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const lastQuotation = await db.queryRow`
    SELECT quotation_number 
    FROM quotations 
    WHERE quotation_number LIKE ${'QT' + year + month + '%'}
    ORDER BY quotation_number DESC 
    LIMIT 1
  `;

  let sequence = 1;
  if (lastQuotation) {
    const lastSequence = parseInt(lastQuotation.quotation_number.slice(-4));
    sequence = lastSequence + 1;
  }

  return `QT${year}${month}${String(sequence).padStart(4, '0')}`;
}

// Calculate quotation totals
function calculateTotals(items: any[], taxRate: number = 18) {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const tax_amount = Math.round(subtotal * taxRate / 100);
  const total_amount = subtotal + tax_amount;
  
  return { subtotal, tax_amount, total_amount };
}

// Create new quotation
export const createQuotation = api<CreateQuotationRequest, { quotation: Quotation; items: QuotationItem[] }>(
  { auth: true, expose: true, method: "POST", path: "/finance/quotations" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.manage') && !auth.permissions.includes('quotations.create')) {
      throw APIError.forbidden("Insufficient permissions to create quotations");
    }

    // Validate required fields
    if (!req.title || !req.client_id || !req.items?.length) {
      throw APIError.badRequest("Title, client ID, and items are required");
    }

    // Verify client exists
    const client = await db.queryRow`
      SELECT id FROM users WHERE id = ${req.client_id} AND is_active = true
    `;
    if (!client) {
      throw APIError.badRequest("Invalid client ID");
    }

    // Verify project if provided
    if (req.project_id) {
      const project = await db.queryRow`
        SELECT id FROM projects WHERE id = ${req.project_id}
      `;
      if (!project) {
        throw APIError.badRequest("Invalid project ID");
      }
    }

    try {
      // Generate quotation number
      const quotationNumber = await generateQuotationNumber();
      
      // Calculate totals
      const { subtotal, tax_amount, total_amount } = calculateTotals(req.items);

      // Create quotation
      const quotation = await db.queryRow<Quotation>`
        INSERT INTO quotations (
          project_id, client_id, quotation_number, title, description,
          subtotal, tax_amount, total_amount, valid_until, terms_and_conditions,
          notes, created_by
        ) VALUES (
          ${req.project_id || null}, ${req.client_id}, ${quotationNumber}, ${req.title}, ${req.description || null},
          ${subtotal}, ${tax_amount}, ${total_amount}, ${req.valid_until || null}, ${req.terms_and_conditions || null},
          ${req.notes || null}, ${auth.userID}
        )
        RETURNING *
      `;

      // Create quotation items
      const items: QuotationItem[] = [];
      for (let i = 0; i < req.items.length; i++) {
        const item = req.items[i];
        const total_price = item.quantity * item.unit_price;
        
        const quotationItem = await db.queryRow<QuotationItem>`
          INSERT INTO quotation_items (
            quotation_id, item_type, item_id, description, quantity,
            unit, unit_price, total_price, sort_order
          ) VALUES (
            ${quotation.id}, ${item.item_type}, ${item.item_id || null}, ${item.description}, ${item.quantity},
            ${item.unit}, ${item.unit_price}, ${total_price}, ${i + 1}
          )
          RETURNING *
        `;
        
        items.push(quotationItem);
      }

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'create', 'quotation', ${quotation.id}, ${JSON.stringify(quotation)})
      `;

      return { quotation, items };

    } catch (error) {
      console.error('Quotation creation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create quotation");
    }
  }
);

// Get quotation by ID
export const getQuotation = api<{ id: number }, { quotation: Quotation; items: QuotationItem[] }>(
  { auth: true, expose: true, method: "GET", path: "/finance/quotations/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Get quotation
    const quotation = await db.queryRow<Quotation>`
      SELECT * FROM quotations WHERE id = ${id}
    `;

    if (!quotation) {
      throw APIError.notFound("Quotation not found");
    }

    // Check access permissions
    const userId = parseInt(auth.userID);
    const hasAccess = quotation.client_id === userId || 
                     quotation.created_by === userId ||
                     auth.permissions.includes('finance.view');

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this quotation");
    }

    // Get quotation items
    const itemsQuery = db.query<QuotationItem>`
      SELECT * FROM quotation_items 
      WHERE quotation_id = ${id} 
      ORDER BY sort_order
    `;

    const items: QuotationItem[] = [];
    for await (const item of itemsQuery) {
      items.push(item);
    }

    return { quotation, items };
  }
);

// List quotations with filtering
export const listQuotations = api<QuotationListParams, { quotations: Quotation[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/finance/quotations" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.view') && !auth.permissions.includes('quotations.view')) {
      throw APIError.forbidden("Insufficient permissions to view quotations");
    }

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Role-based filtering
    const userId = parseInt(auth.userID);
    if (!auth.permissions.includes('finance.view')) {
      whereClause += ` AND (client_id = $${paramIndex} OR created_by = $${paramIndex})`;
      queryParams.push(userId);
      paramIndex++;
    }

    // Status filter
    if (params.status) {
      whereClause += ` AND status = $${paramIndex}`;
      queryParams.push(params.status);
      paramIndex++;
    }

    // Client filter
    if (params.client_id) {
      whereClause += ` AND client_id = $${paramIndex}`;
      queryParams.push(params.client_id);
      paramIndex++;
    }

    // Project filter
    if (params.project_id) {
      whereClause += ` AND project_id = $${paramIndex}`;
      queryParams.push(params.project_id);
      paramIndex++;
    }

    try {
      // Get quotations
      const quotationsQuery = `
        SELECT q.*, 
               u.first_name || ' ' || u.last_name as client_name,
               p.title as project_title
        FROM quotations q
        LEFT JOIN users u ON q.client_id = u.id
        LEFT JOIN projects p ON q.project_id = p.id
        ${whereClause}
        ORDER BY q.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const quotationsResult = await db.query(quotationsQuery, ...queryParams);
      const quotations: Quotation[] = [];
      for await (const quotation of quotationsResult) {
        quotations.push(quotation);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM quotations q ${whereClause}`;
      const countResult = await db.query(countQuery, ...queryParams.slice(0, -2));
      let total = 0;
      for await (const row of countResult) {
        total = parseInt(row.total);
        break;
      }

      return {
        quotations,
        total,
        page,
        limit
      };

    } catch (error) {
      console.error('List quotations error:', error);
      throw APIError.internal("Failed to fetch quotations");
    }
  }
);

// Update quotation
export const updateQuotation = api<{ id: number } & UpdateQuotationRequest, { quotation: Quotation; items: QuotationItem[] }>(
  { auth: true, expose: true, method: "PUT", path: "/finance/quotations/:id" },
  async ({ id, ...req }) => {
    const auth = getAuthData()!;
    
    // Get existing quotation
    const existingQuotation = await db.queryRow<Quotation>`
      SELECT * FROM quotations WHERE id = ${id}
    `;

    if (!existingQuotation) {
      throw APIError.notFound("Quotation not found");
    }

    // Check permissions
    const userId = parseInt(auth.userID);
    const canEdit = existingQuotation.created_by === userId || 
                   auth.permissions.includes('finance.manage');

    if (!canEdit) {
      throw APIError.forbidden("Access denied to edit this quotation");
    }

    // Can't edit accepted/rejected quotations
    if (['accepted', 'rejected'].includes(existingQuotation.status)) {
      throw APIError.badRequest("Cannot edit accepted or rejected quotations");
    }

    try {
      let subtotal = existingQuotation.subtotal;
      let tax_amount = existingQuotation.tax_amount;
      let total_amount = existingQuotation.total_amount;

      // Update items if provided
      if (req.items) {
        // Delete existing items
        await db.exec`DELETE FROM quotation_items WHERE quotation_id = ${id}`;
        
        // Calculate new totals
        const totals = calculateTotals(req.items);
        subtotal = totals.subtotal;
        tax_amount = totals.tax_amount;
        total_amount = totals.total_amount;

        // Create new items
        for (let i = 0; i < req.items.length; i++) {
          const item = req.items[i];
          const item_total_price = item.quantity * item.unit_price;
          
          await db.exec`
            INSERT INTO quotation_items (
              quotation_id, item_type, item_id, description, quantity,
              unit, unit_price, total_price, sort_order
            ) VALUES (
              ${id}, ${item.item_type}, ${item.item_id || null}, ${item.description}, ${item.quantity},
              ${item.unit}, ${item.unit_price}, ${item_total_price}, ${i + 1}
            )
          `;
        }
      }

      // Update quotation
      const quotation = await db.queryRow<Quotation>`
        UPDATE quotations SET
          title = COALESCE(${req.title}, title),
          description = COALESCE(${req.description}, description),
          valid_until = COALESCE(${req.valid_until}, valid_until),
          terms_and_conditions = COALESCE(${req.terms_and_conditions}, terms_and_conditions),
          notes = COALESCE(${req.notes}, notes),
          subtotal = ${subtotal},
          tax_amount = ${tax_amount},
          total_amount = ${total_amount},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Get updated items
      const itemsQuery = db.query<QuotationItem>`
        SELECT * FROM quotation_items 
        WHERE quotation_id = ${id} 
        ORDER BY sort_order
      `;

      const items: QuotationItem[] = [];
      for await (const item of itemsQuery) {
        items.push(item);
      }

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'update', 'quotation', ${id}, ${JSON.stringify(existingQuotation)}, ${JSON.stringify(quotation)})
      `;

      return { quotation, items };

    } catch (error) {
      console.error('Quotation update error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update quotation");
    }
  }
);

// Send quotation to client
export const sendQuotation = api<{ id: number }, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "POST", path: "/finance/quotations/:id/send" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Get quotation
    const quotation = await db.queryRow<Quotation>`
      SELECT * FROM quotations WHERE id = ${id}
    `;

    if (!quotation) {
      throw APIError.notFound("Quotation not found");
    }

    // Check permissions
    const userId = parseInt(auth.userID);
    const canSend = quotation.created_by === userId || 
                   auth.permissions.includes('finance.manage');

    if (!canSend) {
      throw APIError.forbidden("Access denied to send this quotation");
    }

    if (quotation.status !== 'draft') {
      throw APIError.badRequest("Only draft quotations can be sent");
    }

    try {
      // Update quotation status
      await db.exec`
        UPDATE quotations SET
          status = 'sent',
          sent_at = NOW(),
          updated_at = NOW()
        WHERE id = ${id}
      `;

      // TODO: Send email notification to client
      // This would integrate with email service

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'send', 'quotation', ${id}, '{"status": "sent"}')
      `;

      return {
        success: true,
        message: "Quotation sent successfully"
      };

    } catch (error) {
      console.error('Send quotation error:', error);
      throw APIError.internal("Failed to send quotation");
    }
  }
);

// Accept/Reject quotation (client action)
export const updateQuotationStatus = api<{ id: number; status: 'accepted' | 'rejected'; notes?: string }, { quotation: Quotation }>(
  { auth: true, expose: true, method: "POST", path: "/finance/quotations/:id/status" },
  async ({ id, status, notes }) => {
    const auth = getAuthData()!;
    
    // Get quotation
    const quotation = await db.queryRow<Quotation>`
      SELECT * FROM quotations WHERE id = ${id}
    `;

    if (!quotation) {
      throw APIError.notFound("Quotation not found");
    }

    // Check if user is the client
    const userId = parseInt(auth.userID);
    if (quotation.client_id !== userId) {
      throw APIError.forbidden("Only the client can accept or reject quotations");
    }

    if (quotation.status !== 'sent') {
      throw APIError.badRequest("Only sent quotations can be accepted or rejected");
    }

    try {
      const statusField = status === 'accepted' ? 'accepted_at' : 'rejected_at';
      
      const updatedQuotation = await db.queryRow<Quotation>`
        UPDATE quotations SET
          status = ${status},
          ${statusField} = NOW(),
          notes = COALESCE(${notes}, notes),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, ${status}, 'quotation', ${id}, ${JSON.stringify({ status, notes })})
      `;

      return { quotation: updatedQuotation };

    } catch (error) {
      console.error('Update quotation status error:', error);
      throw APIError.internal("Failed to update quotation status");
    }
  }
);
