import { api, APIError } from "encore.dev/api";
import db from "../db";
import { ValidationService, LeadValidationRules } from "../common/validation";

interface CreateLeadRequest {
  source: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  budgetMin?: number;
  budgetMax?: number;
  projectType?: string;
  propertyType?: string;
  timeline?: string;
  description?: string;
}

interface Lead {
  id: number;
  source: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  budgetMin?: number;
  budgetMax?: number;
  projectType?: string;
  propertyType?: string;
  timeline?: string;
  description?: string;
  score: number;
  status: string;
  createdAt: string;
}

// Creates a new lead with automatic scoring
export const createLead = api<CreateLeadRequest, Lead>(
  { expose: true, method: "POST", path: "/leads" },
  async (req) => {
    // Validate input
    const validationData = {
      source: req.source,
      first_name: req.firstName,
      last_name: req.lastName,
      email: req.email,
      phone: req.phone,
      city: req.city,
      budget_min: req.budgetMin,
      budget_max: req.budgetMax,
      project_type: req.projectType,
      property_type: req.propertyType,
      timeline: req.timeline,
      description: req.description
    };
    ValidationService.validateAndThrow(validationData, LeadValidationRules.create);

    // Calculate lead score based on various factors
    let score = 0;
    
    // Budget scoring
    if (req.budgetMin && req.budgetMin > 500000) score += 30;
    else if (req.budgetMin && req.budgetMin > 200000) score += 20;
    else if (req.budgetMin) score += 10;
    
    // Timeline scoring
    if (req.timeline === 'immediate') score += 25;
    else if (req.timeline === '1-3 months') score += 20;
    else if (req.timeline === '3-6 months') score += 15;
    else if (req.timeline === '6-12 months') score += 10;
    
    // Project type scoring
    if (req.projectType === 'full_home') score += 20;
    else if (req.projectType === 'multiple_rooms') score += 15;
    else if (req.projectType === 'single_room') score += 10;
    
    // Property type scoring
    if (req.propertyType === 'apartment') score += 10;
    else if (req.propertyType === 'villa') score += 15;
    else if (req.propertyType === 'office') score += 12;
    
    // Source scoring
    if (req.source === 'website_form') score += 10;
    else if (req.source === 'referral') score += 15;
    else if (req.source === 'social_media') score += 8;

    const lead = await db.queryRow`
      INSERT INTO leads (
        source, first_name, last_name, email, phone, city,
        budget_min, budget_max, project_type, property_type,
        timeline, description, score
      ) VALUES (
        ${req.source}, ${req.firstName}, ${req.lastName}, ${req.email}, ${req.phone}, ${req.city},
        ${req.budgetMin}, ${req.budgetMax}, ${req.projectType}, ${req.propertyType},
        ${req.timeline}, ${req.description}, ${score}
      ) RETURNING *
    `;

    if (!lead) {
      throw APIError.internal("Failed to create lead");
    }

    // Log the lead creation event
    await db.exec`
      INSERT INTO analytics_events (event_type, entity_type, entity_id, properties, created_at)
      VALUES ('lead_created', 'lead', ${lead.id}, ${JSON.stringify({ score, source: req.source })}, NOW())
    `;

    // Auto-assign lead based on city and workload
    await assignLead(lead.id, req.city);

    return {
      id: lead.id,
      source: lead.source,
      firstName: lead.first_name,
      lastName: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      budgetMin: lead.budget_min,
      budgetMax: lead.budget_max,
      projectType: lead.project_type,
      propertyType: lead.property_type,
      timeline: lead.timeline,
      description: lead.description,
      score: lead.score,
      status: lead.status,
      createdAt: lead.created_at
    };
  }
);

async function assignLead(leadId: number, city: string) {
  // Find the best available designer in the city
  const designer = await db.queryRow`
    SELECT u.id, COUNT(l.id) as lead_count
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    LEFT JOIN leads l ON u.id = l.assigned_to AND l.status IN ('new', 'contacted', 'qualified')
    WHERE r.name = 'interior_designer' 
      AND u.city = ${city} 
      AND u.is_active = true
    GROUP BY u.id
    ORDER BY lead_count ASC, u.created_at ASC
    LIMIT 1
  `;

  if (designer) {
    await db.exec`
      UPDATE leads SET assigned_to = ${designer.id} WHERE id = ${leadId}
    `;

    // Create notification for the assigned designer
    await db.exec`
      INSERT INTO notifications (user_id, title, content, type, reference_type, reference_id)
      VALUES (
        ${designer.id},
        'New Lead Assigned',
        'A new lead has been assigned to you',
        'lead_assignment',
        'lead',
        ${leadId}
      )
    `;
  }
}
