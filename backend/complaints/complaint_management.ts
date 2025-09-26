import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface CreateComplaintRequest {
  title: string;
  description: string;
  category: 'service' | 'product' | 'billing' | 'technical' | 'delivery' | 'quality' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  projectId?: number;
  orderId?: number;
  attachments?: string[];
}

interface UpdateComplaintRequest {
  complaintId: number;
  status?: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: number;
  resolution?: string;
  internalNotes?: string;
  estimatedResolutionDate?: string;
}

interface ComplaintResponse {
  complaintId: number;
  userId: number;
  text: string;
  isInternal: boolean;
  attachments?: string[];
}

interface ComplaintListParams {
  page?: Query<number>;
  limit?: Query<number>;
  status?: Query<string>;
  category?: Query<string>;
  priority?: Query<string>;
  assignedTo?: Query<number>;
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
}

interface ComplaintDetails {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: {
    id: number;
    name: string;
    email: string;
  };
  customer: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  project?: {
    id: number;
    title: string;
    status: string;
  };
  order?: {
    id: number;
    title: string;
    amount: number;
  };
  resolution?: string;
  estimatedResolutionDate?: string;
  actualResolutionDate?: string;
  createdAt: string;
  updatedAt: string;
  responses: ComplaintResponse[];
  attachments: string[];
  timeline: Array<{
    action: string;
    performedBy: string;
    timestamp: string;
    details?: string;
  }>;
}

// Customer: Create new complaint
export const createComplaint = api<CreateComplaintRequest, { complaintId: number; ticketNumber: string }>(
  { auth: true, expose: true, method: "POST", path: "/complaints" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Validate input
    if (!req.title || !req.description || !req.category || !req.priority) {
      throw APIError.invalidArgument("Title, description, category, and priority are required");
    }

    if (req.title.length < 10 || req.title.length > 200) {
      throw APIError.invalidArgument("Title must be between 10 and 200 characters");
    }

    if (req.description.length < 20) {
      throw APIError.invalidArgument("Description must be at least 20 characters");
    }

    try {
      const result = await db.tx(async (tx) => {
        // Generate ticket number
        const ticketNumber = `CMP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        // Create complaint
        const complaint = await tx.queryRow`
          INSERT INTO complaints (
            user_id, title, description, category, priority, status, 
            project_id, order_id, attachments, ticket_number
          ) VALUES (
            ${auth.userID}, ${req.title}, ${req.description}, ${req.category}, ${req.priority}, 'open',
            ${req.projectId}, ${req.orderId}, ${req.attachments || []}, ${ticketNumber}
          ) RETURNING *
        `;

        // Auto-assign based on category and availability
        await autoAssignComplaint(tx, complaint.id, req.category);

        // Create initial timeline entry
        await tx.exec`
          INSERT INTO complaint_timeline (
            complaint_id, action, performed_by, details
          ) VALUES (
            ${complaint.id}, 'created', ${auth.userID}, 
            'Complaint created with category: ${req.category}, priority: ${req.priority}'
          )
        `;

        // Create notification for support team
        const supportTeam = await tx.queryAll`
          SELECT u.id FROM users u
          JOIN user_roles ur ON u.id = ur.user_id
          JOIN roles r ON ur.role_id = r.id
          WHERE r.name IN ('super_admin', 'support_agent') AND u.is_active = true
        `;

        for (const agent of supportTeam) {
          await tx.exec`
            INSERT INTO notifications (
              user_id, title, content, type, reference_type, reference_id
            ) VALUES (
              ${agent.id},
              'New Complaint Received',
              'New ${req.priority} priority complaint: ${req.title}',
              'new_complaint',
              'complaint',
              ${complaint.id}
            )
          `;
        }

        return { complaintId: complaint.id, ticketNumber };
      });

      // Log analytics event
      await db.exec`
        INSERT INTO analytics_events (
          event_type, user_id, entity_type, entity_id, properties
        ) VALUES (
          'complaint_created', ${auth.userID}, 'complaint', ${result.complaintId},
          ${JSON.stringify({ category: req.category, priority: req.priority })}
        )
      `;

      return result;

    } catch (error) {
      console.error('Complaint creation error:', error);
      throw APIError.internal("Failed to create complaint", error as Error);
    }
  }
);

// Get complaint details
export const getComplaint = api<{ complaintId: number }, ComplaintDetails>(
  { auth: true, expose: true, method: "GET", path: "/complaints/:complaintId" },
  async ({ complaintId }) => {
    const auth = getAuthData()!;
    
    // Get complaint with related data
    const complaint = await db.queryRow`
      SELECT 
        c.*,
        u.first_name as customer_first_name, u.last_name as customer_last_name, 
        u.email as customer_email, u.phone as customer_phone,
        assigned.first_name as assigned_first_name, assigned.last_name as assigned_last_name,
        assigned.email as assigned_email,
        p.title as project_title, p.status as project_status,
        o.title as order_title, o.amount as order_amount
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users assigned ON c.assigned_to = assigned.id
      LEFT JOIN projects p ON c.project_id = p.id
      LEFT JOIN orders o ON c.order_id = o.id
      WHERE c.id = ${complaintId}
    `;

    if (!complaint) {
      throw APIError.notFound("Complaint not found");
    }

    // Check access permissions
    const hasAccess = complaint.user_id === parseInt(auth.userID) ||
                     complaint.assigned_to === parseInt(auth.userID) ||
                     auth.permissions.includes('complaints.view');

    if (!hasAccess) {
      throw APIError.permissionDenied("Access denied to this complaint");
    }

    // Get responses
    const responses = await db.queryAll`
      SELECT 
        cr.*,
        u.first_name, u.last_name, u.email
      FROM complaint_responses cr
      JOIN users u ON cr.user_id = u.id
      WHERE cr.complaint_id = ${complaintId}
      ORDER BY cr.created_at ASC
    `;

    // Get timeline
    const timeline = await db.queryAll`
      SELECT 
        ct.*,
        u.first_name, u.last_name
      FROM complaint_timeline ct
      JOIN users u ON ct.performed_by = u.id
      WHERE ct.complaint_id = ${complaintId}
      ORDER BY ct.created_at ASC
    `;

    return {
      id: complaint.id,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      priority: complaint.priority,
      status: complaint.status,
      assignedTo: complaint.assigned_to ? {
        id: complaint.assigned_to,
        name: `${complaint.assigned_first_name} ${complaint.assigned_last_name}`,
        email: complaint.assigned_email
      } : undefined,
      customer: {
        id: complaint.user_id,
        name: `${complaint.customer_first_name} ${complaint.customer_last_name}`,
        email: complaint.customer_email,
        phone: complaint.customer_phone
      },
      project: complaint.project_id ? {
        id: complaint.project_id,
        title: complaint.project_title,
        status: complaint.project_status
      } : undefined,
      order: complaint.order_id ? {
        id: complaint.order_id,
        title: complaint.order_title,
        amount: complaint.order_amount
      } : undefined,
      resolution: complaint.resolution,
      estimatedResolutionDate: complaint.estimated_resolution_date,
      actualResolutionDate: complaint.actual_resolution_date,
      createdAt: complaint.created_at,
      updatedAt: complaint.updated_at,
      responses: responses.map(r => ({
        complaintId: r.id,
        userId: r.user_id,
        text: r.response_text,
        isInternal: r.is_internal,
        attachments: r.attachments
      })),
      attachments: complaint.attachments || [],
      timeline: timeline.map(t => ({
        action: t.action,
        performedBy: `${t.first_name} ${t.last_name}`,
        timestamp: t.created_at,
        details: t.details
      }))
    };
  }
);

// Admin/Support: Update complaint
export const updateComplaint = api<UpdateComplaintRequest, { success: boolean }>(
  { auth: true, expose: true, method: "PUT", path: "/complaints/update" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('complaints.manage')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    try {
      await db.tx(async (tx) => {
        // Get current complaint data
        const currentComplaint = await tx.queryRow`
          SELECT * FROM complaints WHERE id = ${req.complaintId}
        `;

        if (!currentComplaint) {
          throw APIError.notFound("Complaint not found");
        }

        // Build update query
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        if (req.status !== undefined) {
          updateFields.push(`status = $${paramIndex++}`);
          updateValues.push(req.status);
        }
        if (req.priority !== undefined) {
          updateFields.push(`priority = $${paramIndex++}`);
          updateValues.push(req.priority);
        }
        if (req.assignedTo !== undefined) {
          updateFields.push(`assigned_to = $${paramIndex++}`);
          updateValues.push(req.assignedTo);
        }
        if (req.resolution !== undefined) {
          updateFields.push(`resolution = $${paramIndex++}`);
          updateValues.push(req.resolution);
        }
        if (req.estimatedResolutionDate !== undefined) {
          updateFields.push(`estimated_resolution_date = $${paramIndex++}`);
          updateValues.push(req.estimatedResolutionDate);
        }

        // Set actual resolution date if status is resolved/closed
        if (req.status === 'resolved' || req.status === 'closed') {
          updateFields.push(`actual_resolution_date = NOW()`);
        }

        updateFields.push(`updated_at = NOW()`);

        if (updateFields.length > 1) {
          await tx.rawQuery(`
            UPDATE complaints 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
          `, ...updateValues, req.complaintId);
        }

        // Log timeline entries for significant changes
        if (req.status && req.status !== currentComplaint.status) {
          await tx.exec`
            INSERT INTO complaint_timeline (
              complaint_id, action, performed_by, details
            ) VALUES (
              ${req.complaintId}, 'status_changed', ${auth.userID},
              'Status changed from ${currentComplaint.status} to ${req.status}'
            )
          `;
        }

        if (req.assignedTo && req.assignedTo !== currentComplaint.assigned_to) {
          await tx.exec`
            INSERT INTO complaint_timeline (
              complaint_id, action, performed_by, details
            ) VALUES (
              ${req.complaintId}, 'assigned', ${auth.userID},
              'Complaint assigned to user ID: ${req.assignedTo}'
            )
          `;

          // Notify assigned agent
          await tx.exec`
            INSERT INTO notifications (
              user_id, title, content, type, reference_type, reference_id
            ) VALUES (
              ${req.assignedTo},
              'Complaint Assigned',
              'A ${currentComplaint.priority} priority complaint has been assigned to you',
              'complaint_assignment',
              'complaint',
              ${req.complaintId}
            )
          `;
        }

        if (req.resolution) {
          await tx.exec`
            INSERT INTO complaint_timeline (
              complaint_id, action, performed_by, details
            ) VALUES (
              ${req.complaintId}, 'resolution_added', ${auth.userID},
              'Resolution provided'
            )
          `;

          // Notify customer about resolution
          await tx.exec`
            INSERT INTO notifications (
              user_id, title, content, type, reference_type, reference_id
            ) VALUES (
              ${currentComplaint.user_id},
              'Complaint Resolution',
              'Your complaint has been resolved. Please check the details.',
              'complaint_resolved',
              'complaint',
              ${req.complaintId}
            )
          `;
        }

        // Add internal notes if provided
        if (req.internalNotes) {
          await tx.exec`
            INSERT INTO complaint_responses (
              complaint_id, user_id, response_text, is_internal
            ) VALUES (
              ${req.complaintId}, ${auth.userID}, ${req.internalNotes}, true
            )
          `;
        }
      });

      return { success: true };

    } catch (error) {
      console.error('Complaint update error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update complaint");
    }
  }
);

// List complaints with filtering
export const listComplaints = api<ComplaintListParams, { complaints: ComplaintDetails[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/complaints" },
  async (params) => {
    const auth = getAuthData()!;
    
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Role-based filtering
    if (!auth.permissions.includes('complaints.view')) {
      whereClause += ` AND c.user_id = $${paramIndex++}`;
      queryParams.push(auth.userID);
    }

    if (params.status) {
      whereClause += ` AND c.status = $${paramIndex++}`;
      queryParams.push(params.status);
    }

    if (params.category) {
      whereClause += ` AND c.category = $${paramIndex++}`;
      queryParams.push(params.category);
    }

    if (params.priority) {
      whereClause += ` AND c.priority = $${paramIndex++}`;
      queryParams.push(params.priority);
    }

    if (params.assignedTo) {
      whereClause += ` AND c.assigned_to = $${paramIndex++}`;
      queryParams.push(params.assignedTo);
    }

    if (params.dateFrom) {
      whereClause += ` AND c.created_at >= $${paramIndex++}`;
      queryParams.push(params.dateFrom);
    }

    if (params.dateTo) {
      whereClause += ` AND c.created_at <= $${paramIndex++}`;
      queryParams.push(params.dateTo);
    }

    const complaints = await db.rawQueryAll(`
      SELECT 
        c.*,
        u.first_name as customer_first_name, u.last_name as customer_last_name,
        u.email as customer_email, u.phone as customer_phone,
        assigned.first_name as assigned_first_name, assigned.last_name as assigned_last_name,
        p.title as project_title, p.status as project_status
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users assigned ON c.assigned_to = assigned.id
      LEFT JOIN projects p ON c.project_id = p.id
      ${whereClause}
      ORDER BY 
        CASE c.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, ...queryParams, limit, offset);

    const totalResult = await db.rawQueryRow(`
      SELECT COUNT(*) as total
      FROM complaints c
      ${whereClause}
    `, ...queryParams);

    const complaintDetails = await Promise.all(
      complaints.map(async (complaint) => {
        // Get response count
        const responseCount = await db.queryRow`
          SELECT COUNT(*) as count
          FROM complaint_responses
          WHERE complaint_id = ${complaint.id} AND is_internal = false
        `;

        return {
          id: complaint.id,
          title: complaint.title,
          description: complaint.description,
          category: complaint.category,
          priority: complaint.priority,
          status: complaint.status,
          assignedTo: complaint.assigned_to ? {
            id: complaint.assigned_to,
            name: `${complaint.assigned_first_name} ${complaint.assigned_last_name}`,
            email: complaint.assigned_email
          } : undefined,
          customer: {
            id: complaint.user_id,
            name: `${complaint.customer_first_name} ${complaint.customer_last_name}`,
            email: complaint.customer_email,
            phone: complaint.customer_phone
          },
          project: complaint.project_id ? {
            id: complaint.project_id,
            title: complaint.project_title,
            status: complaint.project_status
          } : undefined,
          resolution: complaint.resolution,
          estimatedResolutionDate: complaint.estimated_resolution_date,
          actualResolutionDate: complaint.actual_resolution_date,
          createdAt: complaint.created_at,
          updatedAt: complaint.updated_at,
          responses: [], // Will be loaded on detail view
          attachments: complaint.attachments || [],
          timeline: [], // Will be loaded on detail view
          responseCount: parseInt(responseCount?.count || '0')
        };
      })
    );

    return {
      complaints: complaintDetails,
      total: totalResult?.total || 0,
      page,
      limit
    };
  }
);

// Add response to complaint
export const addComplaintResponse = api(
  { auth: true, expose: true, method: "POST", path: "/complaints/:complaintId/responses" },
  async (req: { complaintId: number; text: string; isInternal?: boolean; attachments?: string[] }) => {
    const auth = getAuthData()!;
    
    if (!req.text || req.text.trim().length < 10) {
      throw APIError.invalidArgument("Response text must be at least 10 characters");
    }

    // Check access to complaint
    const complaint = await db.queryRow`
      SELECT user_id, assigned_to, status FROM complaints WHERE id = ${req.complaintId}
    `;

    if (!complaint) {
      throw APIError.notFound("Complaint not found");
    }

    const canRespond = complaint.user_id === parseInt(auth.userID) ||
                      complaint.assigned_to === parseInt(auth.userID) ||
                      auth.permissions.includes('complaints.manage');

    if (!canRespond) {
      throw APIError.permissionDenied("Access denied to respond to this complaint");
    }

    // Only support agents can add internal responses
    const isInternal = req.isInternal && auth.permissions.includes('complaints.manage');

    try {
      const response = await db.queryRow`
        INSERT INTO complaint_responses (
          complaint_id, user_id, response_text, is_internal, attachments
        ) VALUES (
          ${req.complaintId}, ${auth.userID}, ${req.text}, ${isInternal}, ${req.attachments || []}
        ) RETURNING *
      `;

      // Update complaint status if customer responded to closed complaint
      if (complaint.status === 'closed' && complaint.user_id === parseInt(auth.userID)) {
        await db.exec`
          UPDATE complaints SET status = 'open', updated_at = NOW()
          WHERE id = ${req.complaintId}
        `;
      }

      // Add timeline entry
      await db.exec`
        INSERT INTO complaint_timeline (
          complaint_id, action, performed_by, details
        ) VALUES (
          ${req.complaintId}, 'response_added', ${auth.userID},
          '${isInternal ? 'Internal' : 'Public'} response added'
        )
      `;

      // Notify relevant parties (except the responder)
      if (!isInternal) {
        const notifyUsers: number[] = [];
        
        if (complaint.user_id !== parseInt(auth.userID)) {
          notifyUsers.push(complaint.user_id);
        }
        
        if (complaint.assigned_to && complaint.assigned_to !== parseInt(auth.userID)) {
          notifyUsers.push(complaint.assigned_to);
        }

        for (const userId of notifyUsers) {
          await db.exec`
            INSERT INTO notifications (
              user_id, title, content, type, reference_type, reference_id
            ) VALUES (
              ${userId},
              'New Complaint Response',
              'A new response has been added to your complaint',
              'complaint_response',
              'complaint',
              ${req.complaintId}
            )
          `;
        }
      }

      return {
        success: true,
        responseId: response.id
      };

    } catch (error) {
      console.error('Add complaint response error:', error);
      throw APIError.internal("Failed to add response", error as Error);
    }
  }
);

// SLA Management and Escalation
export const checkSLACompliance = api<void, { overdueCases: any[]; escalationRequired: any[] }>(
  { auth: true, expose: true, method: "GET", path: "/complaints/sla-check" },
  async () => {
    const auth = getAuthData()!;

    // Check permissions
    if (!auth.permissions.includes('complaints.manage')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    // Define SLA timeframes (in hours)
    const slaTimeframes = {
      'urgent': 4,
      'high': 24,
      'medium': 72,
      'low': 168
    };

    const overdueCases = await db.queryAll`
      SELECT
        c.*,
        u.first_name as customer_first_name, u.last_name as customer_last_name,
        assigned.first_name as assigned_first_name, assigned.last_name as assigned_last_name,
        EXTRACT(EPOCH FROM (NOW() - c.created_at))/3600 as hours_open
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users assigned ON c.assigned_to = assigned.id
      WHERE c.status IN ('open', 'in_progress', 'waiting_response')
      AND (
        (c.priority = 'urgent' AND c.created_at < NOW() - INTERVAL '4 hours') OR
        (c.priority = 'high' AND c.created_at < NOW() - INTERVAL '24 hours') OR
        (c.priority = 'medium' AND c.created_at < NOW() - INTERVAL '72 hours') OR
        (c.priority = 'low' AND c.created_at < NOW() - INTERVAL '168 hours')
      )
      ORDER BY c.priority, c.created_at
    `;

    // Find cases requiring escalation (overdue by 50% of SLA)
    const escalationRequired = await db.queryAll`
      SELECT
        c.*,
        u.first_name as customer_first_name, u.last_name as customer_last_name,
        assigned.first_name as assigned_first_name, assigned.last_name as assigned_last_name,
        EXTRACT(EPOCH FROM (NOW() - c.created_at))/3600 as hours_open
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users assigned ON c.assigned_to = assigned.id
      WHERE c.status IN ('open', 'in_progress', 'waiting_response')
      AND (
        (c.priority = 'urgent' AND c.created_at < NOW() - INTERVAL '6 hours') OR
        (c.priority = 'high' AND c.created_at < NOW() - INTERVAL '36 hours') OR
        (c.priority = 'medium' AND c.created_at < NOW() - INTERVAL '108 hours') OR
        (c.priority = 'low' AND c.created_at < NOW() - INTERVAL '252 hours')
      )
      ORDER BY c.priority, c.created_at
    `;

    return {
      overdueCases: overdueCases.map(c => ({
        id: c.id,
        title: c.title,
        priority: c.priority,
        status: c.status,
        customer: `${c.customer_first_name} ${c.customer_last_name}`,
        assignedTo: c.assigned_first_name ? `${c.assigned_first_name} ${c.assigned_last_name}` : 'Unassigned',
        hoursOpen: Math.round(c.hours_open),
        slaTarget: slaTimeframes[c.priority as keyof typeof slaTimeframes],
        createdAt: c.created_at
      })),
      escalationRequired: escalationRequired.map(c => ({
        id: c.id,
        title: c.title,
        priority: c.priority,
        status: c.status,
        customer: `${c.customer_first_name} ${c.customer_last_name}`,
        assignedTo: c.assigned_first_name ? `${c.assigned_first_name} ${c.assigned_last_name}` : 'Unassigned',
        hoursOpen: Math.round(c.hours_open),
        slaTarget: slaTimeframes[c.priority as keyof typeof slaTimeframes],
        createdAt: c.created_at
      }))
    };
  }
);

// Escalate complaint to higher level
export const escalateComplaint = api<{ complaintId: number; escalationReason: string; escalateTo?: number }, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/complaints/:complaintId/escalate" },
  async (req) => {
    const auth = getAuthData()!;

    // Check permissions
    if (!auth.permissions.includes('complaints.manage')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    try {
      await db.tx(async (tx) => {
        // Get complaint details
        const complaint = await tx.queryRow`
          SELECT * FROM complaints WHERE id = ${req.complaintId}
        `;

        if (!complaint) {
          throw APIError.notFound("Complaint not found");
        }

        // Find escalation target (supervisor or admin)
        let escalationTarget = req.escalateTo;
        if (!escalationTarget) {
          const supervisor = await tx.queryRow`
            SELECT u.id FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('super_admin', 'admin') AND u.is_active = true
            ORDER BY u.created_at ASC
            LIMIT 1
          `;
          escalationTarget = supervisor?.id;
        }

        if (!escalationTarget) {
          throw APIError.internal("No escalation target available");
        }

        // Update complaint priority and assignment
        await tx.exec`
          UPDATE complaints
          SET assigned_to = ${escalationTarget},
              priority = CASE
                WHEN priority = 'low' THEN 'medium'
                WHEN priority = 'medium' THEN 'high'
                WHEN priority = 'high' THEN 'urgent'
                ELSE priority
              END,
              updated_at = NOW()
          WHERE id = ${req.complaintId}
        `;

        // Add timeline entry
        await tx.exec`
          INSERT INTO complaint_timeline (
            complaint_id, action, performed_by, details
          ) VALUES (
            ${req.complaintId}, 'escalated', ${auth.userID},
            'Escalated to higher level. Reason: ${req.escalationReason}'
          )
        `;

        // Notify escalation target
        await tx.exec`
          INSERT INTO notifications (
            user_id, title, content, type, reference_type, reference_id
          ) VALUES (
            ${escalationTarget},
            'Complaint Escalated to You',
            'Complaint "${complaint.title}" has been escalated to you. Reason: ${req.escalationReason}',
            'complaint_escalation',
            'complaint',
            ${req.complaintId}
          )
        `;

        // Notify customer about escalation
        await tx.exec`
          INSERT INTO notifications (
            user_id, title, content, type, reference_type, reference_id
          ) VALUES (
            ${complaint.user_id},
            'Your Complaint Has Been Escalated',
            'Your complaint "${complaint.title}" has been escalated to our senior team for faster resolution.',
            'complaint_escalation',
            'complaint',
            ${req.complaintId}
          )
        `;
      });

      return { success: true };

    } catch (error) {
      console.error('Complaint escalation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to escalate complaint");
    }
  }
);

// Customer Satisfaction Survey
export const submitSatisfactionSurvey = api<{
  complaintId: number;
  rating: number; // 1-5 scale
  feedback: string;
  wouldRecommend: boolean;
  resolutionTime: 'very_fast' | 'fast' | 'acceptable' | 'slow' | 'very_slow';
  agentRating: number; // 1-5 scale
}, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/complaints/:complaintId/satisfaction" },
  async (req) => {
    const auth = getAuthData()!;

    // Validate rating
    if (req.rating < 1 || req.rating > 5 || req.agentRating < 1 || req.agentRating > 5) {
      throw APIError.invalidArgument("Ratings must be between 1 and 5");
    }

    // Check if complaint belongs to user
    const complaint = await db.queryRow`
      SELECT user_id, status FROM complaints WHERE id = ${req.complaintId}
    `;

    if (!complaint) {
      throw APIError.notFound("Complaint not found");
    }

    if (complaint.user_id !== parseInt(auth.userID)) {
      throw APIError.permissionDenied("Can only rate your own complaints");
    }

    if (complaint.status !== 'resolved' && complaint.status !== 'closed') {
      throw APIError.badRequest("Can only rate resolved or closed complaints");
    }

    try {
      await db.tx(async (tx) => {
        // Check if survey already exists
        const existingSurvey = await tx.queryRow`
          SELECT id FROM satisfaction_surveys WHERE complaint_id = ${req.complaintId}
        `;

        if (existingSurvey) {
          // Update existing survey
          await tx.exec`
            UPDATE satisfaction_surveys
            SET rating = ${req.rating},
                feedback = ${req.feedback},
                would_recommend = ${req.wouldRecommend},
                resolution_time = ${req.resolutionTime},
                agent_rating = ${req.agentRating},
                updated_at = NOW()
            WHERE complaint_id = ${req.complaintId}
          `;
        } else {
          // Create new survey
          await tx.exec`
            INSERT INTO satisfaction_surveys (
              complaint_id, user_id, rating, feedback, would_recommend,
              resolution_time, agent_rating
            ) VALUES (
              ${req.complaintId}, ${auth.userID}, ${req.rating}, ${req.feedback},
              ${req.wouldRecommend}, ${req.resolutionTime}, ${req.agentRating}
            )
          `;
        }

        // Add timeline entry
        await tx.exec`
          INSERT INTO complaint_timeline (
            complaint_id, action, performed_by, details
          ) VALUES (
            ${req.complaintId}, 'satisfaction_survey', ${auth.userID},
            'Customer satisfaction survey submitted. Rating: ${req.rating}/5'
          )
        `;

        // Update complaint with survey completion
        await tx.exec`
          UPDATE complaints
          SET customer_satisfaction_rating = ${req.rating}, updated_at = NOW()
          WHERE id = ${req.complaintId}
        `;
      });

      return { success: true };

    } catch (error) {
      console.error('Satisfaction survey error:', error);
      throw APIError.internal("Failed to submit satisfaction survey");
    }
  }
);

// Auto-assign complaint based on category and agent availability
async function autoAssignComplaint(tx: any, complaintId: number, category: string) {
  // Enhanced auto-assignment with category specialization
  const availableAgent = await tx.queryRow`
    SELECT
      u.id,
      COUNT(c.id) as active_complaints,
      CASE
        WHEN ep.skills @> ARRAY[${category}] THEN 1
        ELSE 0
      END as category_specialist
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    LEFT JOIN employee_profiles ep ON u.id = ep.user_id
    LEFT JOIN complaints c ON u.id = c.assigned_to AND c.status IN ('open', 'in_progress', 'waiting_response')
    WHERE r.name IN ('support_agent', 'super_admin')
      AND u.is_active = true
    GROUP BY u.id, ep.skills
    ORDER BY category_specialist DESC, active_complaints ASC, u.created_at ASC
    LIMIT 1
  `;

  if (availableAgent) {
    await tx.exec`
      UPDATE complaints
      SET assigned_to = ${availableAgent.id},
          assigned_at = NOW(),
          updated_at = NOW()
      WHERE id = ${complaintId}
    `;

    await tx.exec`
      INSERT INTO complaint_timeline (
        complaint_id, action, performed_by, details
      ) VALUES (
        ${complaintId}, 'auto_assigned', ${availableAgent.id},
        'Auto-assigned based on availability and category specialization: ${category}'
      )
    `;

    // Notify assigned agent
    await tx.exec`
      INSERT INTO notifications (
        user_id, title, content, type, reference_type, reference_id
      ) VALUES (
        ${availableAgent.id},
        'New Complaint Assigned',
        'A new ${category} complaint has been assigned to you.',
        'complaint_assigned',
        'complaint',
        ${complaintId}
      )
    `;
  }
}

// Complaint Analytics and Reporting
export const getComplaintAnalytics = api<{
  dateFrom?: Query<string>;
  dateTo?: Query<string>;
  category?: Query<string>;
  priority?: Query<string>;
}, {
  summary: {
    totalComplaints: number;
    resolvedComplaints: number;
    averageResolutionTime: number;
    customerSatisfactionAvg: number;
    slaCompliance: number;
  };
  categoryBreakdown: Array<{ category: string; count: number; avgResolutionTime: number }>;
  priorityBreakdown: Array<{ priority: string; count: number; avgResolutionTime: number }>;
  agentPerformance: Array<{ agentName: string; assignedCount: number; resolvedCount: number; avgRating: number }>;
  trends: Array<{ date: string; created: number; resolved: number }>;
}>(
  { auth: true, expose: true, method: "GET", path: "/complaints/analytics" },
  async (params) => {
    const auth = getAuthData()!;

    // Check permissions
    if (!auth.permissions.includes('complaints.view')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    const dateFrom = params.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateTo = params.dateTo || new Date().toISOString().split('T')[0];

    let whereClause = "WHERE c.created_at >= $1 AND c.created_at <= $2";
    const queryParams: any[] = [dateFrom, dateTo + ' 23:59:59'];
    let paramIndex = 3;

    if (params.category) {
      whereClause += ` AND c.category = $${paramIndex++}`;
      queryParams.push(params.category);
    }

    if (params.priority) {
      whereClause += ` AND c.priority = $${paramIndex++}`;
      queryParams.push(params.priority);
    }

    // Summary statistics
    const summary = await db.rawQueryRow(`
      SELECT
        COUNT(*) as total_complaints,
        COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved_complaints,
        AVG(CASE
          WHEN actual_resolution_date IS NOT NULL
          THEN EXTRACT(EPOCH FROM (actual_resolution_date - created_at))/3600
        END) as avg_resolution_hours,
        AVG(customer_satisfaction_rating) as avg_satisfaction,
        COUNT(CASE
          WHEN (
            (priority = 'urgent' AND actual_resolution_date <= created_at + INTERVAL '4 hours') OR
            (priority = 'high' AND actual_resolution_date <= created_at + INTERVAL '24 hours') OR
            (priority = 'medium' AND actual_resolution_date <= created_at + INTERVAL '72 hours') OR
            (priority = 'low' AND actual_resolution_date <= created_at + INTERVAL '168 hours')
          ) THEN 1
        END) * 100.0 / NULLIF(COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END), 0) as sla_compliance
      FROM complaints c
      ${whereClause}
    `, ...queryParams);

    // Category breakdown
    const categoryBreakdown = await db.rawQueryAll(`
      SELECT
        category,
        COUNT(*) as count,
        AVG(CASE
          WHEN actual_resolution_date IS NOT NULL
          THEN EXTRACT(EPOCH FROM (actual_resolution_date - created_at))/3600
        END) as avg_resolution_hours
      FROM complaints c
      ${whereClause}
      GROUP BY category
      ORDER BY count DESC
    `, ...queryParams);

    // Priority breakdown
    const priorityBreakdown = await db.rawQueryAll(`
      SELECT
        priority,
        COUNT(*) as count,
        AVG(CASE
          WHEN actual_resolution_date IS NOT NULL
          THEN EXTRACT(EPOCH FROM (actual_resolution_date - created_at))/3600
        END) as avg_resolution_hours
      FROM complaints c
      ${whereClause}
      GROUP BY priority
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END
    `, ...queryParams);

    // Agent performance
    const agentPerformance = await db.rawQueryAll(`
      SELECT
        u.first_name || ' ' || u.last_name as agent_name,
        COUNT(*) as assigned_count,
        COUNT(CASE WHEN c.status IN ('resolved', 'closed') THEN 1 END) as resolved_count,
        AVG(ss.agent_rating) as avg_rating
      FROM complaints c
      JOIN users u ON c.assigned_to = u.id
      LEFT JOIN satisfaction_surveys ss ON c.id = ss.complaint_id
      ${whereClause} AND c.assigned_to IS NOT NULL
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY resolved_count DESC
    `, ...queryParams);

    // Daily trends
    const trends = await db.rawQueryAll(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as created,
        COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved
      FROM complaints c
      ${whereClause}
      GROUP BY DATE(created_at)
      ORDER BY date
    `, ...queryParams);

    return {
      summary: {
        totalComplaints: parseInt(summary?.total_complaints || '0'),
        resolvedComplaints: parseInt(summary?.resolved_complaints || '0'),
        averageResolutionTime: Math.round(summary?.avg_resolution_hours || 0),
        customerSatisfactionAvg: Math.round((summary?.avg_satisfaction || 0) * 100) / 100,
        slaCompliance: Math.round((summary?.sla_compliance || 0) * 100) / 100
      },
      categoryBreakdown: categoryBreakdown.map(cb => ({
        category: cb.category,
        count: parseInt(cb.count),
        avgResolutionTime: Math.round(cb.avg_resolution_hours || 0)
      })),
      priorityBreakdown: priorityBreakdown.map(pb => ({
        priority: pb.priority,
        count: parseInt(pb.count),
        avgResolutionTime: Math.round(pb.avg_resolution_hours || 0)
      })),
      agentPerformance: agentPerformance.map(ap => ({
        agentName: ap.agent_name,
        assignedCount: parseInt(ap.assigned_count),
        resolvedCount: parseInt(ap.resolved_count),
        avgRating: Math.round((ap.avg_rating || 0) * 100) / 100
      })),
      trends: trends.map(t => ({
        date: t.date,
        created: parseInt(t.created),
        resolved: parseInt(t.resolved)
      }))
    };
  }
);

// Bulk operations for complaints
export const bulkUpdateComplaints = api<{
  complaintIds: number[];
  updates: {
    status?: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assignedTo?: number;
  };
}, { success: boolean; updatedCount: number }>(
  { auth: true, expose: true, method: "PUT", path: "/complaints/bulk-update" },
  async (req) => {
    const auth = getAuthData()!;

    // Check permissions
    if (!auth.permissions.includes('complaints.manage')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    if (!req.complaintIds.length) {
      throw APIError.invalidArgument("No complaints specified for update");
    }

    try {
      const result = await db.tx(async (tx) => {
        let updatedCount = 0;

        for (const complaintId of req.complaintIds) {
          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let paramIndex = 1;

          if (req.updates.status) {
            updateFields.push(`status = $${paramIndex++}`);
            updateValues.push(req.updates.status);
          }

          if (req.updates.priority) {
            updateFields.push(`priority = $${paramIndex++}`);
            updateValues.push(req.updates.priority);
          }

          if (req.updates.assignedTo !== undefined) {
            updateFields.push(`assigned_to = $${paramIndex++}`);
            updateValues.push(req.updates.assignedTo);
          }

          if (updateFields.length > 0) {
            updateFields.push(`updated_at = NOW()`);

            await tx.rawQuery(`
              UPDATE complaints
              SET ${updateFields.join(', ')}
              WHERE id = $${paramIndex}
            `, ...updateValues, complaintId);

            // Add timeline entry
            await tx.exec`
              INSERT INTO complaint_timeline (
                complaint_id, action, performed_by, details
              ) VALUES (
                ${complaintId}, 'bulk_updated', ${auth.userID},
                'Bulk update applied: ${JSON.stringify(req.updates)}'
              )
            `;

            updatedCount++;
          }
        }

        return { updatedCount };
      });

      return { success: true, updatedCount: result.updatedCount };

    } catch (error) {
      console.error('Bulk update error:', error);
      throw APIError.internal("Failed to perform bulk update");
    }
  }
);