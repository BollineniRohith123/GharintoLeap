import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { ValidationService } from "../common/validation";

interface UpdateLeadRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
  budgetMin?: number;
  budgetMax?: number;
  projectType?: string;
  propertyType?: string;
  timeline?: string;
  description?: string;
  status?: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'won' | 'lost';
}

interface AssignLeadRequest {
  assignedTo: number;
}

interface ConvertLeadRequest {
  projectTitle: string;
  projectDescription?: string;
  budget: number;
  startDate?: string;
  designerId?: number;
  projectManagerId?: number;
}

interface BulkUpdateRequest {
  leadIds: number[];
  updates: Partial<UpdateLeadRequest>;
}

interface LeadStats {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  proposalSent: number;
  won: number;
  lost: number;
  conversionRate: number;
}

// Update a lead
export const updateLead = api(
  { auth: true, expose: true, method: "PUT", path: "/leads/:id" },
  async ({ id, ...req }: { id: number } & UpdateLeadRequest) => {
    const auth = getAuthData()!;
    
    // Check if user can update leads
    if (!auth.permissions.includes('leads.update')) {
      throw APIError.forbidden("Insufficient permissions to update leads");
    }

    // Check if lead exists
    const existingLead = await db.queryRow`
      SELECT * FROM leads WHERE id = ${id}
    `;

    if (!existingLead) {
      throw APIError.notFound("Lead not found");
    }

    // Role-based access control
    if (auth.roles.includes('interior_designer') && existingLead.assigned_to !== parseInt(auth.userID)) {
      throw APIError.forbidden("You can only update leads assigned to you");
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (req.firstName) {
      updates.push(`first_name = $${paramIndex}`);
      values.push(req.firstName);
      paramIndex++;
    }
    if (req.lastName) {
      updates.push(`last_name = $${paramIndex}`);
      values.push(req.lastName);
      paramIndex++;
    }
    if (req.email) {
      updates.push(`email = $${paramIndex}`);
      values.push(req.email);
      paramIndex++;
    }
    if (req.phone) {
      updates.push(`phone = $${paramIndex}`);
      values.push(req.phone);
      paramIndex++;
    }
    if (req.city) {
      updates.push(`city = $${paramIndex}`);
      values.push(req.city);
      paramIndex++;
    }
    if (req.budgetMin !== undefined) {
      updates.push(`budget_min = $${paramIndex}`);
      values.push(req.budgetMin);
      paramIndex++;
    }
    if (req.budgetMax !== undefined) {
      updates.push(`budget_max = $${paramIndex}`);
      values.push(req.budgetMax);
      paramIndex++;
    }
    if (req.projectType) {
      updates.push(`project_type = $${paramIndex}`);
      values.push(req.projectType);
      paramIndex++;
    }
    if (req.propertyType) {
      updates.push(`property_type = $${paramIndex}`);
      values.push(req.propertyType);
      paramIndex++;
    }
    if (req.timeline) {
      updates.push(`timeline = $${paramIndex}`);
      values.push(req.timeline);
      paramIndex++;
    }
    if (req.description) {
      updates.push(`description = $${paramIndex}`);
      values.push(req.description);
      paramIndex++;
    }
    if (req.status) {
      updates.push(`status = $${paramIndex}`);
      values.push(req.status);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw APIError.badRequest("No fields to update");
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    await db.exec(
      `UPDATE leads SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      ...values
    );

    // Log the update event
    await db.exec`
      INSERT INTO analytics_events (event_type, user_id, entity_type, entity_id, properties, created_at)
      VALUES ('lead_updated', ${auth.userID}, 'lead', ${id}, ${JSON.stringify(req)}, NOW())
    `;

    // Get updated lead
    const updatedLead = await db.queryRow`
      SELECT * FROM leads WHERE id = ${id}
    `;

    return {
      id: updatedLead.id,
      source: updatedLead.source,
      firstName: updatedLead.first_name,
      lastName: updatedLead.last_name,
      email: updatedLead.email,
      phone: updatedLead.phone,
      city: updatedLead.city,
      budgetMin: updatedLead.budget_min,
      budgetMax: updatedLead.budget_max,
      projectType: updatedLead.project_type,
      propertyType: updatedLead.property_type,
      timeline: updatedLead.timeline,
      description: updatedLead.description,
      score: updatedLead.score,
      status: updatedLead.status,
      assignedTo: updatedLead.assigned_to,
      createdAt: updatedLead.created_at,
      updatedAt: updatedLead.updated_at
    };
  }
);

// Assign lead to a user
export const assignLead = api(
  { auth: true, expose: true, method: "POST", path: "/leads/:id/assign" },
  async ({ id, assignedTo }: { id: number } & AssignLeadRequest) => {
    const auth = getAuthData()!;

    if (!auth.permissions.includes('leads.assign')) {
      throw APIError.forbidden("Insufficient permissions to assign leads");
    }

    // Verify lead exists
    const lead = await db.queryRow`
      SELECT * FROM leads WHERE id = ${id}
    `;

    if (!lead) {
      throw APIError.notFound("Lead not found");
    }

    // Verify user exists and has appropriate role
    const user = await db.queryRow`
      SELECT u.id, u.first_name, u.last_name
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = ${assignedTo} AND r.name IN ('interior_designer', 'project_manager') AND u.is_active = true
    `;

    if (!user) {
      throw APIError.badRequest("Invalid user for assignment");
    }

    // Update assignment
    await db.exec`
      UPDATE leads SET assigned_to = ${assignedTo}, updated_at = NOW() WHERE id = ${id}
    `;

    // Create notification
    await db.exec`
      INSERT INTO notifications (user_id, title, content, type, reference_type, reference_id)
      VALUES (
        ${assignedTo},
        'Lead Assigned',
        ${'Lead from ' + lead.first_name + ' ' + lead.last_name + ' has been assigned to you'},
        'lead_assignment',
        'lead',
        ${id}
      )
    `;

    // Log assignment event
    await db.exec`
      INSERT INTO analytics_events (event_type, user_id, entity_type, entity_id, properties, created_at)
      VALUES ('lead_assigned', ${auth.userID}, 'lead', ${id}, ${JSON.stringify({ assignedTo, assignedBy: auth.userID })}, NOW())
    `;

    return { message: "Lead assigned successfully" };
  }
);

// Convert lead to project
export const convertLead = api(
  { auth: true, expose: true, method: "POST", path: "/leads/:id/convert" },
  async ({ id, ...req }: { id: number } & ConvertLeadRequest) => {
    const auth = getAuthData()!;

    if (!auth.permissions.includes('leads.convert')) {
      throw APIError.forbidden("Insufficient permissions to convert leads");
    }

    // Get lead details
    const lead = await db.queryRow`
      SELECT * FROM leads WHERE id = ${id}
    `;

    if (!lead) {
      throw APIError.notFound("Lead not found");
    }

    if (lead.status === 'won' && lead.converted_to_project) {
      throw APIError.badRequest("Lead already converted to project");
    }

    // Find client user or create one
    let clientId = lead.client_id;
    if (!clientId) {
      // Check if user exists with this email
      const existingUser = await db.queryRow`
        SELECT id FROM users WHERE email = ${lead.email}
      `;

      if (existingUser) {
        clientId = existingUser.id;
      } else {
        // Create customer user
        const newUser = await db.queryRow`
          INSERT INTO users (email, first_name, last_name, phone, city, is_active, password_hash)
          VALUES (${lead.email}, ${lead.first_name}, ${lead.last_name}, ${lead.phone}, ${lead.city}, true, 'temp_password_hash')
          RETURNING id
        `;
        
        if (newUser) {
          clientId = newUser.id;
          
          // Assign customer role
          const customerRole = await db.queryRow`
            SELECT id FROM roles WHERE name = 'customer'
          `;
          
          if (customerRole) {
            await db.exec`
              INSERT INTO user_roles (user_id, role_id, assigned_by)
              VALUES (${clientId}, ${customerRole.id}, ${auth.userID})
            `;
          }
        }
      }
    }

    if (!clientId) {
      throw APIError.internal("Failed to create or find client");
    }

    // Create project
    const project = await db.queryRow`
      INSERT INTO projects (
        title, description, client_id, designer_id, project_manager_id,
        budget, city, property_type, status
      ) VALUES (
        ${req.projectTitle}, ${req.projectDescription}, ${clientId}, ${req.designerId},
        ${req.projectManagerId}, ${req.budget}, ${lead.city}, ${lead.property_type}, 'planning'
      ) RETURNING id
    `;

    if (!project) {
      throw APIError.internal("Failed to create project");
    }

    // Update lead status and link to project
    await db.exec`
      UPDATE leads SET 
        status = 'won',
        converted_to_project = ${project.id},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    // Log conversion event
    await db.exec`
      INSERT INTO analytics_events (event_type, user_id, entity_type, entity_id, properties, created_at)
      VALUES ('lead_converted', ${auth.userID}, 'lead', ${id}, ${JSON.stringify({ projectId: project.id })}, NOW())
    `;

    return {
      message: "Lead converted to project successfully",
      projectId: project.id,
      leadId: id
    };
  }
);

// Get lead statistics
export const getLeadStats = api(
  { auth: true, expose: true, method: "GET", path: "/leads/stats" },
  async (): Promise<LeadStats> => {
    const auth = getAuthData()!;

    let whereClause = "";
    if (auth.roles.includes('interior_designer')) {
      whereClause = `WHERE assigned_to = ${auth.userID}`;
    }

    const stats = await db.queryRow`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
        COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified,
        COUNT(CASE WHEN status = 'proposal_sent' THEN 1 END) as proposal_sent,
        COUNT(CASE WHEN status = 'won' THEN 1 END) as won,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost
      FROM leads
      ${whereClause ? db.rawQuery(whereClause) : db.rawQuery("")}
    `;

    const total = parseInt(stats.total) || 0;
    const won = parseInt(stats.won) || 0;
    const conversionRate = total > 0 ? (won / total) * 100 : 0;

    return {
      total,
      new: parseInt(stats.new) || 0,
      contacted: parseInt(stats.contacted) || 0,
      qualified: parseInt(stats.qualified) || 0,
      proposalSent: parseInt(stats.proposal_sent) || 0,
      won,
      lost: parseInt(stats.lost) || 0,
      conversionRate: parseFloat(conversionRate.toFixed(2))
    };
  }
);

// Bulk update leads
export const bulkUpdateLeads = api(
  { auth: true, expose: true, method: "PUT", path: "/leads/bulk" },
  async (req: BulkUpdateRequest) => {
    const auth = getAuthData()!;

    if (!auth.permissions.includes('leads.update')) {
      throw APIError.forbidden("Insufficient permissions to update leads");
    }

    if (!req.leadIds || req.leadIds.length === 0) {
      throw APIError.badRequest("No leads specified for update");
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (req.updates.status) {
      updates.push(`status = $${paramIndex}`);
      values.push(req.updates.status);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw APIError.badRequest("No updates specified");
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.leadIds);

    await db.exec(
      `UPDATE leads SET ${updates.join(", ")} WHERE id = ANY($${paramIndex})`,
      ...values
    );

    // Log bulk update event
    await db.exec`
      INSERT INTO analytics_events (event_type, user_id, entity_type, properties, created_at)
      VALUES ('leads_bulk_updated', ${auth.userID}, 'lead', ${JSON.stringify({ leadIds: req.leadIds, updates: req.updates })}, NOW())
    `;

    return { 
      message: `${req.leadIds.length} leads updated successfully`,
      updatedCount: req.leadIds.length
    };
  }
);

// Delete a lead (soft delete)
export const deleteLead = api(
  { auth: true, expose: true, method: "DELETE", path: "/leads/:id" },
  async ({ id }: { id: number }) => {
    const auth = getAuthData()!;

    if (!auth.permissions.includes('leads.delete')) {
      throw APIError.forbidden("Insufficient permissions to delete leads");
    }

    const lead = await db.queryRow`
      SELECT * FROM leads WHERE id = ${id}
    `;

    if (!lead) {
      throw APIError.notFound("Lead not found");
    }

    // Soft delete by updating status
    await db.exec`
      UPDATE leads SET status = 'deleted', updated_at = NOW() WHERE id = ${id}
    `;

    // Log deletion event
    await db.exec`
      INSERT INTO analytics_events (event_type, user_id, entity_type, entity_id, properties, created_at)
      VALUES ('lead_deleted', ${auth.userID}, 'lead', ${id}, '{"action": "soft_delete"}', NOW())
    `;

    return { message: "Lead deleted successfully" };
  }
);