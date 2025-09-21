import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { APIError } from "encore.dev/api";

export interface CreateLeadRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  source?: string;
  leadType?: string;
  projectType?: string;
  budgetRange?: string;
  description?: string;
  cityId?: number;
}

export interface CreateLeadResponse {
  id: string;
  customerName: string;
  status: string;
  score: number;
}

// Creates a new lead.
export const createLead = api<CreateLeadRequest, CreateLeadResponse>(
  { auth: true, expose: true, method: "POST", path: "/leads" },
  async (req) => {
    const auth = getAuthData()!;

    if (!auth.permissions.includes('leads.create')) {
      throw APIError.permissionDenied("insufficient permissions");
    }

    // Calculate lead score based on available information
    let score = 0;
    if (req.customerEmail) score += 20;
    if (req.customerPhone) score += 20;
    if (req.budgetRange) score += 30;
    if (req.projectType) score += 15;
    if (req.description) score += 15;

    const lead = await db.queryRow<{
      id: number;
      customer_name: string;
      status: string;
      score: number;
    }>`
      INSERT INTO leads (
        customer_name, customer_email, customer_phone, source,
        lead_type, project_type, budget_range, description,
        city_id, status, score, created_at, updated_at
      )
      VALUES (
        ${req.customerName}, ${req.customerEmail}, ${req.customerPhone}, ${req.source},
        ${req.leadType}, ${req.projectType}, ${req.budgetRange}, ${req.description},
        ${req.cityId}, 'new', ${score}, NOW(), NOW()
      )
      RETURNING id, customer_name, status, score
    `;

    if (!lead) {
      throw APIError.internal("failed to create lead");
    }

    // Auto-assign lead based on city and availability
    if (req.cityId) {
      const availableAgent = await db.queryRow<{ user_id: number }>`
        SELECT mp.user_id
        FROM manager_profiles mp
        WHERE ${req.cityId} = ANY(mp.access_cities)
        ORDER BY RANDOM()
        LIMIT 1
      `;

      if (availableAgent) {
        await db.exec`
          UPDATE leads SET assigned_to = ${availableAgent.user_id}
          WHERE id = ${lead.id}
        `;

        // Create notification for assigned agent
        await db.exec`
          INSERT INTO notifications (user_id, title, content, type, reference_id, reference_type)
          VALUES (
            ${availableAgent.user_id},
            'New Lead Assigned',
            'A new lead "${req.customerName}" has been assigned to you.',
            'lead_assigned',
            ${lead.id},
            'lead'
          )
        `;
      }
    }

    return {
      id: lead.id.toString(),
      customerName: lead.customer_name,
      status: lead.status,
      score: lead.score
    };
  }
);
