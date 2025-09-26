import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

export interface PurchaseOrder {
  id: number;
  project_id?: number;
  vendor_id: number;
  po_number: string;
  title: string;
  description?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'completed' | 'cancelled';
  expected_delivery_date?: Date;
  actual_delivery_date?: Date;
  terms_and_conditions?: string;
  notes?: string;
  created_by: number;
  sent_at?: Date;
  confirmed_at?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  material_id?: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  received_quantity: number;
  sort_order: number;
}

interface CreatePurchaseOrderRequest {
  project_id?: number;
  vendor_id: number;
  title: string;
  description?: string;
  expected_delivery_date?: string;
  terms_and_conditions?: string;
  notes?: string;
  items: {
    material_id?: number;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
  }[];
}

interface UpdatePurchaseOrderRequest {
  title?: string;
  description?: string;
  expected_delivery_date?: string;
  terms_and_conditions?: string;
  notes?: string;
  items?: {
    id?: number;
    material_id?: number;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
  }[];
}

interface PurchaseOrderListParams {
  page?: Query<number>;
  limit?: Query<number>;
  status?: Query<string>;
  vendor_id?: Query<number>;
  project_id?: Query<number>;
}

interface ReceiveItemsRequest {
  items: {
    item_id: number;
    received_quantity: number;
  }[];
  notes?: string;
}

// Generate unique PO number
async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const lastPO = await db.queryRow`
    SELECT po_number 
    FROM purchase_orders 
    WHERE po_number LIKE ${'PO' + year + month + '%'}
    ORDER BY po_number DESC 
    LIMIT 1
  `;

  let sequence = 1;
  if (lastPO) {
    const lastSequence = parseInt(lastPO.po_number.slice(-4));
    sequence = lastSequence + 1;
  }

  return `PO${year}${month}${String(sequence).padStart(4, '0')}`;
}

// Calculate PO totals
function calculateTotals(items: any[], taxRate: number = 18) {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const tax_amount = Math.round(subtotal * taxRate / 100);
  const total_amount = subtotal + tax_amount;
  
  return { subtotal, tax_amount, total_amount };
}

// Create new purchase order
export const createPurchaseOrder = api<CreatePurchaseOrderRequest, { purchaseOrder: PurchaseOrder; items: PurchaseOrderItem[] }>(
  { auth: true, expose: true, method: "POST", path: "/finance/purchase-orders" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('procurement.manage') && !auth.permissions.includes('purchase_orders.create')) {
      throw APIError.forbidden("Insufficient permissions to create purchase orders");
    }

    // Validate required fields
    if (!req.title || !req.vendor_id || !req.items?.length) {
      throw APIError.badRequest("Title, vendor ID, and items are required");
    }

    // Verify vendor exists
    const vendor = await db.queryRow`
      SELECT id FROM vendors WHERE id = ${req.vendor_id} AND is_verified = true
    `;
    if (!vendor) {
      throw APIError.badRequest("Invalid or unverified vendor ID");
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
      // Generate PO number
      const poNumber = await generatePONumber();
      
      // Calculate totals
      const { subtotal, tax_amount, total_amount } = calculateTotals(req.items);

      // Create purchase order
      const purchaseOrder = await db.queryRow<PurchaseOrder>`
        INSERT INTO purchase_orders (
          project_id, vendor_id, po_number, title, description,
          subtotal, tax_amount, total_amount, expected_delivery_date, 
          terms_and_conditions, notes, created_by
        ) VALUES (
          ${req.project_id || null}, ${req.vendor_id}, ${poNumber}, ${req.title}, ${req.description || null},
          ${subtotal}, ${tax_amount}, ${total_amount}, ${req.expected_delivery_date || null},
          ${req.terms_and_conditions || null}, ${req.notes || null}, ${auth.userID}
        )
        RETURNING *
      `;

      // Create purchase order items
      const items: PurchaseOrderItem[] = [];
      for (let i = 0; i < req.items.length; i++) {
        const item = req.items[i];
        const total_price = item.quantity * item.unit_price;
        
        const poItem = await db.queryRow<PurchaseOrderItem>`
          INSERT INTO purchase_order_items (
            purchase_order_id, material_id, description, quantity,
            unit, unit_price, total_price, sort_order
          ) VALUES (
            ${purchaseOrder.id}, ${item.material_id || null}, ${item.description}, ${item.quantity},
            ${item.unit}, ${item.unit_price}, ${total_price}, ${i + 1}
          )
          RETURNING *
        `;
        
        items.push(poItem);
      }

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'create', 'purchase_order', ${purchaseOrder.id}, ${JSON.stringify(purchaseOrder)})
      `;

      return { purchaseOrder, items };

    } catch (error) {
      console.error('Purchase order creation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create purchase order");
    }
  }
);

// Get purchase order by ID
export const getPurchaseOrder = api<{ id: number }, { purchaseOrder: PurchaseOrder; items: PurchaseOrderItem[] }>(
  { auth: true, expose: true, method: "GET", path: "/finance/purchase-orders/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Get purchase order
    const purchaseOrder = await db.queryRow<PurchaseOrder>`
      SELECT * FROM purchase_orders WHERE id = ${id}
    `;

    if (!purchaseOrder) {
      throw APIError.notFound("Purchase order not found");
    }

    // Check access permissions
    const userId = parseInt(auth.userID);
    const hasAccess = purchaseOrder.created_by === userId ||
                     auth.permissions.includes('procurement.view');

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this purchase order");
    }

    // Get purchase order items
    const itemsQuery = db.query<PurchaseOrderItem>`
      SELECT poi.*, m.name as material_name
      FROM purchase_order_items poi
      LEFT JOIN materials m ON poi.material_id = m.id
      WHERE poi.purchase_order_id = ${id} 
      ORDER BY poi.sort_order
    `;

    const items: PurchaseOrderItem[] = [];
    for await (const item of itemsQuery) {
      items.push(item);
    }

    return { purchaseOrder, items };
  }
);

// List purchase orders with filtering
export const listPurchaseOrders = api<PurchaseOrderListParams, { purchaseOrders: PurchaseOrder[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/finance/purchase-orders" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('procurement.view') && !auth.permissions.includes('purchase_orders.view')) {
      throw APIError.forbidden("Insufficient permissions to view purchase orders");
    }

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Role-based filtering
    const userId = parseInt(auth.userID);
    if (!auth.permissions.includes('procurement.view')) {
      whereClause += ` AND created_by = $${paramIndex}`;
      queryParams.push(userId);
      paramIndex++;
    }

    // Status filter
    if (params.status) {
      whereClause += ` AND status = $${paramIndex}`;
      queryParams.push(params.status);
      paramIndex++;
    }

    // Vendor filter
    if (params.vendor_id) {
      whereClause += ` AND vendor_id = $${paramIndex}`;
      queryParams.push(params.vendor_id);
      paramIndex++;
    }

    // Project filter
    if (params.project_id) {
      whereClause += ` AND project_id = $${paramIndex}`;
      queryParams.push(params.project_id);
      paramIndex++;
    }

    try {
      // Get purchase orders
      const poQuery = `
        SELECT po.*, 
               v.company_name as vendor_name,
               p.title as project_title
        FROM purchase_orders po
        LEFT JOIN vendors v ON po.vendor_id = v.id
        LEFT JOIN projects p ON po.project_id = p.id
        ${whereClause}
        ORDER BY po.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const poResult = await db.query(poQuery, ...queryParams);
      const purchaseOrders: PurchaseOrder[] = [];
      for await (const po of poResult) {
        purchaseOrders.push(po);
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM purchase_orders po ${whereClause}`;
      const countResult = await db.query(countQuery, ...queryParams.slice(0, -2));
      let total = 0;
      for await (const row of countResult) {
        total = parseInt(row.total);
        break;
      }

      return {
        purchaseOrders,
        total,
        page,
        limit
      };

    } catch (error) {
      console.error('List purchase orders error:', error);
      throw APIError.internal("Failed to fetch purchase orders");
    }
  }
);

// Update purchase order
export const updatePurchaseOrder = api<{ id: number } & UpdatePurchaseOrderRequest, { purchaseOrder: PurchaseOrder; items: PurchaseOrderItem[] }>(
  { auth: true, expose: true, method: "PUT", path: "/finance/purchase-orders/:id" },
  async ({ id, ...req }) => {
    const auth = getAuthData()!;
    
    // Get existing purchase order
    const existingPO = await db.queryRow<PurchaseOrder>`
      SELECT * FROM purchase_orders WHERE id = ${id}
    `;

    if (!existingPO) {
      throw APIError.notFound("Purchase order not found");
    }

    // Check permissions
    const userId = parseInt(auth.userID);
    const canEdit = existingPO.created_by === userId || 
                   auth.permissions.includes('procurement.manage');

    if (!canEdit) {
      throw APIError.forbidden("Access denied to edit this purchase order");
    }

    // Can't edit confirmed/completed/cancelled POs
    if (['confirmed', 'completed', 'cancelled'].includes(existingPO.status)) {
      throw APIError.badRequest("Cannot edit confirmed, completed, or cancelled purchase orders");
    }

    try {
      let subtotal = existingPO.subtotal;
      let tax_amount = existingPO.tax_amount;
      let total_amount = existingPO.total_amount;

      // Update items if provided
      if (req.items) {
        // Delete existing items
        await db.exec`DELETE FROM purchase_order_items WHERE purchase_order_id = ${id}`;
        
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
            INSERT INTO purchase_order_items (
              purchase_order_id, material_id, description, quantity,
              unit, unit_price, total_price, sort_order
            ) VALUES (
              ${id}, ${item.material_id || null}, ${item.description}, ${item.quantity},
              ${item.unit}, ${item.unit_price}, ${item_total_price}, ${i + 1}
            )
          `;
        }
      }

      // Update purchase order
      const purchaseOrder = await db.queryRow<PurchaseOrder>`
        UPDATE purchase_orders SET
          title = COALESCE(${req.title}, title),
          description = COALESCE(${req.description}, description),
          expected_delivery_date = COALESCE(${req.expected_delivery_date}, expected_delivery_date),
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
      const itemsQuery = db.query<PurchaseOrderItem>`
        SELECT * FROM purchase_order_items 
        WHERE purchase_order_id = ${id} 
        ORDER BY sort_order
      `;

      const items: PurchaseOrderItem[] = [];
      for await (const item of itemsQuery) {
        items.push(item);
      }

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'update', 'purchase_order', ${id}, ${JSON.stringify(existingPO)}, ${JSON.stringify(purchaseOrder)})
      `;

      return { purchaseOrder, items };

    } catch (error) {
      console.error('Purchase order update error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update purchase order");
    }
  }
);

// Send purchase order to vendor
export const sendPurchaseOrder = api<{ id: number }, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "POST", path: "/finance/purchase-orders/:id/send" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Get purchase order
    const purchaseOrder = await db.queryRow<PurchaseOrder>`
      SELECT * FROM purchase_orders WHERE id = ${id}
    `;

    if (!purchaseOrder) {
      throw APIError.notFound("Purchase order not found");
    }

    // Check permissions
    const userId = parseInt(auth.userID);
    const canSend = purchaseOrder.created_by === userId || 
                   auth.permissions.includes('procurement.manage');

    if (!canSend) {
      throw APIError.forbidden("Access denied to send this purchase order");
    }

    if (purchaseOrder.status !== 'draft') {
      throw APIError.badRequest("Only draft purchase orders can be sent");
    }

    try {
      // Update purchase order status
      await db.exec`
        UPDATE purchase_orders SET
          status = 'sent',
          sent_at = NOW(),
          updated_at = NOW()
        WHERE id = ${id}
      `;

      // TODO: Send email notification to vendor
      // This would integrate with email service

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'send', 'purchase_order', ${id}, '{"status": "sent"}')
      `;

      return {
        success: true,
        message: "Purchase order sent successfully"
      };

    } catch (error) {
      console.error('Send purchase order error:', error);
      throw APIError.internal("Failed to send purchase order");
    }
  }
);

// Confirm purchase order (vendor action)
export const confirmPurchaseOrder = api<{ id: number; notes?: string }, { purchaseOrder: PurchaseOrder }>(
  { auth: true, expose: true, method: "POST", path: "/finance/purchase-orders/:id/confirm" },
  async ({ id, notes }) => {
    const auth = getAuthData()!;
    
    // Get purchase order
    const purchaseOrder = await db.queryRow<PurchaseOrder>`
      SELECT po.*, v.user_id as vendor_user_id
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      WHERE po.id = ${id}
    `;

    if (!purchaseOrder) {
      throw APIError.notFound("Purchase order not found");
    }

    // Check if user is the vendor or has procurement permissions
    const userId = parseInt(auth.userID);
    const canConfirm = purchaseOrder.vendor_user_id === userId || 
                      auth.permissions.includes('procurement.manage');

    if (!canConfirm) {
      throw APIError.forbidden("Access denied to confirm this purchase order");
    }

    if (purchaseOrder.status !== 'sent') {
      throw APIError.badRequest("Only sent purchase orders can be confirmed");
    }

    try {
      const updatedPO = await db.queryRow<PurchaseOrder>`
        UPDATE purchase_orders SET
          status = 'confirmed',
          confirmed_at = NOW(),
          notes = COALESCE(${notes}, notes),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'confirm', 'purchase_order', ${id}, ${JSON.stringify({ status: 'confirmed', notes })})
      `;

      return { purchaseOrder: updatedPO };

    } catch (error) {
      console.error('Confirm purchase order error:', error);
      throw APIError.internal("Failed to confirm purchase order");
    }
  }
);

// Receive items for purchase order
export const receiveItems = api<{ id: number } & ReceiveItemsRequest, { purchaseOrder: PurchaseOrder; success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/finance/purchase-orders/:id/receive" },
  async ({ id, items, notes }) => {
    const auth = getAuthData()!;
    
    // Get purchase order
    const purchaseOrder = await db.queryRow<PurchaseOrder>`
      SELECT * FROM purchase_orders WHERE id = ${id}
    `;

    if (!purchaseOrder) {
      throw APIError.notFound("Purchase order not found");
    }

    // Check permissions
    if (!auth.permissions.includes('procurement.manage') && !auth.permissions.includes('inventory.manage')) {
      throw APIError.forbidden("Insufficient permissions to receive items");
    }

    if (purchaseOrder.status !== 'confirmed' && purchaseOrder.status !== 'partially_received') {
      throw APIError.badRequest("Can only receive items for confirmed purchase orders");
    }

    try {
      // Update received quantities
      for (const item of items) {
        await db.exec`
          UPDATE purchase_order_items SET
            received_quantity = received_quantity + ${item.received_quantity}
          WHERE id = ${item.item_id} AND purchase_order_id = ${id}
        `;
      }

      // Check if all items are fully received
      const itemsStatus = await db.queryRow`
        SELECT 
          COUNT(*) as total_items,
          COUNT(*) FILTER (WHERE received_quantity >= quantity) as completed_items
        FROM purchase_order_items
        WHERE purchase_order_id = ${id}
      `;

      const newStatus = itemsStatus.total_items === itemsStatus.completed_items ? 'completed' : 'partially_received';
      
      // Update purchase order status
      const updatedPO = await db.queryRow<PurchaseOrder>`
        UPDATE purchase_orders SET
          status = ${newStatus},
          actual_delivery_date = CASE WHEN ${newStatus} = 'completed' THEN CURRENT_DATE ELSE actual_delivery_date END,
          completed_at = CASE WHEN ${newStatus} = 'completed' THEN NOW() ELSE completed_at END,
          notes = COALESCE(${notes}, notes),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'receive_items', 'purchase_order', ${id}, ${JSON.stringify({ items, status: newStatus })})
      `;

      return {
        purchaseOrder: updatedPO,
        success: true
      };

    } catch (error) {
      console.error('Receive items error:', error);
      throw APIError.internal("Failed to receive items");
    }
  }
);
