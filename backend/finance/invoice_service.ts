import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

export interface Invoice {
  id: number;
  project_id?: number;
  quotation_id?: number;
  client_id: number;
  invoice_number: string;
  title: string;
  description?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  due_date: Date;
  payment_terms?: string;
  notes?: string;
  created_by: number;
  sent_at?: Date;
  paid_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  item_type: 'material' | 'service' | 'labor';
  item_id?: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  sort_order: number;
}

interface CreateInvoiceRequest {
  project_id?: number;
  quotation_id?: number;
  client_id: number;
  title: string;
  description?: string;
  due_date: string;
  payment_terms?: string;
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

interface UpdateInvoiceRequest {
  title?: string;
  description?: string;
  due_date?: string;
  payment_terms?: string;
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

interface InvoiceListParams {
  page?: Query<number>;
  limit?: Query<number>;
  status?: Query<string>;
  client_id?: Query<number>;
  project_id?: Query<number>;
  overdue?: Query<boolean>;
}

interface RecordPaymentRequest {
  amount: number;
  payment_method: string;
  transaction_id?: string;
  notes?: string;
}

// Generate unique invoice number
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const lastInvoice = await db.queryRow`
    SELECT invoice_number 
    FROM invoices 
    WHERE invoice_number LIKE ${'INV' + year + month + '%'}
    ORDER BY invoice_number DESC 
    LIMIT 1
  `;

  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoice_number.slice(-4));
    sequence = lastSequence + 1;
  }

  return `INV${year}${month}${String(sequence).padStart(4, '0')}`;
}

// Calculate invoice totals
function calculateTotals(items: any[], taxRate: number = 18, discountAmount: number = 0) {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const tax_amount = Math.round(subtotal * taxRate / 100);
  const total_amount = subtotal + tax_amount - discountAmount;
  
  return { subtotal, tax_amount, total_amount };
}

// Create new invoice
export const createInvoice = api<CreateInvoiceRequest, { invoice: Invoice; items: InvoiceItem[] }>(
  { auth: true, expose: true, method: "POST", path: "/finance/invoices" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.manage') && !auth.permissions.includes('invoices.create')) {
      throw APIError.forbidden("Insufficient permissions to create invoices");
    }

    // Validate required fields
    if (!req.title || !req.client_id || !req.due_date || !req.items?.length) {
      throw APIError.badRequest("Title, client ID, due date, and items are required");
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

    // Verify quotation if provided
    if (req.quotation_id) {
      const quotation = await db.queryRow`
        SELECT id FROM quotations WHERE id = ${req.quotation_id}
      `;
      if (!quotation) {
        throw APIError.badRequest("Invalid quotation ID");
      }
    }

    try {
      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber();
      
      // Calculate totals
      const { subtotal, tax_amount, total_amount } = calculateTotals(req.items);

      // Create invoice
      const invoice = await db.queryRow<Invoice>`
        INSERT INTO invoices (
          project_id, quotation_id, client_id, invoice_number, title, description,
          subtotal, tax_amount, total_amount, balance_amount, due_date, payment_terms,
          notes, created_by
        ) VALUES (
          ${req.project_id || null}, ${req.quotation_id || null}, ${req.client_id}, ${invoiceNumber}, ${req.title}, ${req.description || null},
          ${subtotal}, ${tax_amount}, ${total_amount}, ${total_amount}, ${req.due_date}, ${req.payment_terms || null},
          ${req.notes || null}, ${auth.userID}
        )
        RETURNING *
      `;

      // Create invoice items
      const items: InvoiceItem[] = [];
      for (let i = 0; i < req.items.length; i++) {
        const item = req.items[i];
        const total_price = item.quantity * item.unit_price;
        
        const invoiceItem = await db.queryRow<InvoiceItem>`
          INSERT INTO invoice_items (
            invoice_id, item_type, item_id, description, quantity,
            unit, unit_price, total_price, sort_order
          ) VALUES (
            ${invoice.id}, ${item.item_type}, ${item.item_id || null}, ${item.description}, ${item.quantity},
            ${item.unit}, ${item.unit_price}, ${total_price}, ${i + 1}
          )
          RETURNING *
        `;
        
        items.push(invoiceItem);
      }

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'create', 'invoice', ${invoice.id}, ${JSON.stringify(invoice)})
      `;

      return { invoice, items };

    } catch (error) {
      console.error('Invoice creation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create invoice");
    }
  }
);

// Get invoice by ID
export const getInvoice = api<{ id: number }, { invoice: Invoice; items: InvoiceItem[] }>(
  { auth: true, expose: true, method: "GET", path: "/finance/invoices/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Get invoice
    const invoice = await db.queryRow<Invoice>`
      SELECT * FROM invoices WHERE id = ${id}
    `;

    if (!invoice) {
      throw APIError.notFound("Invoice not found");
    }

    // Check access permissions
    const userId = parseInt(auth.userID);
    const hasAccess = invoice.client_id === userId || 
                     invoice.created_by === userId ||
                     auth.permissions.includes('finance.view');

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this invoice");
    }

    // Get invoice items
    const itemsQuery = db.query<InvoiceItem>`
      SELECT * FROM invoice_items 
      WHERE invoice_id = ${id} 
      ORDER BY sort_order
    `;

    const items: InvoiceItem[] = [];
    for await (const item of itemsQuery) {
      items.push(item);
    }

    return { invoice, items };
  }
);

// List invoices with filtering
export const listInvoices = api<InvoiceListParams, { invoices: Invoice[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/finance/invoices" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('finance.view') && !auth.permissions.includes('invoices.view')) {
      throw APIError.forbidden("Insufficient permissions to view invoices");
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

    // Overdue filter
    if (params.overdue) {
      whereClause += ` AND due_date < CURRENT_DATE AND status NOT IN ('paid', 'cancelled')`;
    }

    try {
      // Get invoices
      const invoicesQuery = `
        SELECT i.*, 
               u.first_name || ' ' || u.last_name as client_name,
               p.title as project_title
        FROM invoices i
        LEFT JOIN users u ON i.client_id = u.id
        LEFT JOIN projects p ON i.project_id = p.id
        ${whereClause}
        ORDER BY i.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const invoicesResult = await db.query(invoicesQuery, ...queryParams);
      const invoices: Invoice[] = [];
      for await (const invoice of invoicesResult) {
        invoices.push(invoice);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM invoices i ${whereClause}`;
      const countResult = await db.query(countQuery, ...queryParams.slice(0, -2));
      let total = 0;
      for await (const row of countResult) {
        total = parseInt(row.total);
        break;
      }

      return {
        invoices,
        total,
        page,
        limit
      };

    } catch (error) {
      console.error('List invoices error:', error);
      throw APIError.internal("Failed to fetch invoices");
    }
  }
);

// Update invoice
export const updateInvoice = api<{ id: number } & UpdateInvoiceRequest, { invoice: Invoice; items: InvoiceItem[] }>(
  { auth: true, expose: true, method: "PUT", path: "/finance/invoices/:id" },
  async ({ id, ...req }) => {
    const auth = getAuthData()!;
    
    // Get existing invoice
    const existingInvoice = await db.queryRow<Invoice>`
      SELECT * FROM invoices WHERE id = ${id}
    `;

    if (!existingInvoice) {
      throw APIError.notFound("Invoice not found");
    }

    // Check permissions
    const userId = parseInt(auth.userID);
    const canEdit = existingInvoice.created_by === userId || 
                   auth.permissions.includes('finance.manage');

    if (!canEdit) {
      throw APIError.forbidden("Access denied to edit this invoice");
    }

    // Can't edit paid/cancelled invoices
    if (['paid', 'cancelled'].includes(existingInvoice.status)) {
      throw APIError.badRequest("Cannot edit paid or cancelled invoices");
    }

    try {
      let subtotal = existingInvoice.subtotal;
      let tax_amount = existingInvoice.tax_amount;
      let total_amount = existingInvoice.total_amount;
      let balance_amount = existingInvoice.balance_amount;

      // Update items if provided
      if (req.items) {
        // Delete existing items
        await db.exec`DELETE FROM invoice_items WHERE invoice_id = ${id}`;
        
        // Calculate new totals
        const totals = calculateTotals(req.items, 18, existingInvoice.discount_amount);
        subtotal = totals.subtotal;
        tax_amount = totals.tax_amount;
        total_amount = totals.total_amount;
        balance_amount = total_amount - existingInvoice.paid_amount;

        // Create new items
        for (let i = 0; i < req.items.length; i++) {
          const item = req.items[i];
          const item_total_price = item.quantity * item.unit_price;
          
          await db.exec`
            INSERT INTO invoice_items (
              invoice_id, item_type, item_id, description, quantity,
              unit, unit_price, total_price, sort_order
            ) VALUES (
              ${id}, ${item.item_type}, ${item.item_id || null}, ${item.description}, ${item.quantity},
              ${item.unit}, ${item.unit_price}, ${item_total_price}, ${i + 1}
            )
          `;
        }
      }

      // Update invoice
      const invoice = await db.queryRow<Invoice>`
        UPDATE invoices SET
          title = COALESCE(${req.title}, title),
          description = COALESCE(${req.description}, description),
          due_date = COALESCE(${req.due_date}, due_date),
          payment_terms = COALESCE(${req.payment_terms}, payment_terms),
          notes = COALESCE(${req.notes}, notes),
          subtotal = ${subtotal},
          tax_amount = ${tax_amount},
          total_amount = ${total_amount},
          balance_amount = ${balance_amount},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Get updated items
      const itemsQuery = db.query<InvoiceItem>`
        SELECT * FROM invoice_items 
        WHERE invoice_id = ${id} 
        ORDER BY sort_order
      `;

      const items: InvoiceItem[] = [];
      for await (const item of itemsQuery) {
        items.push(item);
      }

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'update', 'invoice', ${id}, ${JSON.stringify(existingInvoice)}, ${JSON.stringify(invoice)})
      `;

      return { invoice, items };

    } catch (error) {
      console.error('Invoice update error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update invoice");
    }
  }
);

// Send invoice to client
export const sendInvoice = api<{ id: number }, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "POST", path: "/finance/invoices/:id/send" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Get invoice
    const invoice = await db.queryRow<Invoice>`
      SELECT * FROM invoices WHERE id = ${id}
    `;

    if (!invoice) {
      throw APIError.notFound("Invoice not found");
    }

    // Check permissions
    const userId = parseInt(auth.userID);
    const canSend = invoice.created_by === userId || 
                   auth.permissions.includes('finance.manage');

    if (!canSend) {
      throw APIError.forbidden("Access denied to send this invoice");
    }

    if (invoice.status !== 'draft') {
      throw APIError.badRequest("Only draft invoices can be sent");
    }

    try {
      // Update invoice status
      await db.exec`
        UPDATE invoices SET
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
        VALUES (${auth.userID}, 'send', 'invoice', ${id}, '{"status": "sent"}')
      `;

      return {
        success: true,
        message: "Invoice sent successfully"
      };

    } catch (error) {
      console.error('Send invoice error:', error);
      throw APIError.internal("Failed to send invoice");
    }
  }
);

// Record payment for invoice
export const recordPayment = api<{ id: number } & RecordPaymentRequest, { invoice: Invoice; success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/finance/invoices/:id/payment" },
  async ({ id, amount, payment_method, transaction_id, notes }) => {
    const auth = getAuthData()!;
    
    // Get invoice
    const invoice = await db.queryRow<Invoice>`
      SELECT * FROM invoices WHERE id = ${id}
    `;

    if (!invoice) {
      throw APIError.notFound("Invoice not found");
    }

    // Check permissions
    if (!auth.permissions.includes('finance.manage')) {
      throw APIError.forbidden("Insufficient permissions to record payments");
    }

    if (amount <= 0 || amount > invoice.balance_amount) {
      throw APIError.badRequest("Invalid payment amount");
    }

    try {
      const newPaidAmount = invoice.paid_amount + amount;
      const newBalanceAmount = invoice.total_amount - newPaidAmount;
      const newStatus = newBalanceAmount === 0 ? 'paid' : 'partially_paid';

      // Update invoice
      const updatedInvoice = await db.queryRow<Invoice>`
        UPDATE invoices SET
          paid_amount = ${newPaidAmount},
          balance_amount = ${newBalanceAmount},
          status = ${newStatus},
          paid_at = CASE WHEN ${newStatus} = 'paid' THEN NOW() ELSE paid_at END,
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Create payment record
      await db.exec`
        INSERT INTO payments (
          project_id, amount, payment_type, status, payment_method, 
          transaction_id, notes
        ) VALUES (
          ${invoice.project_id}, ${amount}, 'invoice_payment', 'completed', ${payment_method},
          ${transaction_id || null}, ${notes || null}
        )
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'payment', 'invoice', ${id}, ${JSON.stringify({ amount, payment_method, transaction_id })})
      `;

      return {
        invoice: updatedInvoice,
        success: true
      };

    } catch (error) {
      console.error('Record payment error:', error);
      throw APIError.internal("Failed to record payment");
    }
  }
);
