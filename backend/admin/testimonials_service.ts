import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

export interface Testimonial {
  id: number;
  client_id?: number;
  project_id?: number;
  client_name: string;
  client_designation?: string;
  client_company?: string;
  testimonial_text: string;
  rating: number;
  is_featured: boolean;
  is_approved: boolean;
  approved_by?: number;
  approved_at?: Date;
  display_order: number;
  image_url?: string;
  created_at: Date;
  updated_at: Date;
}

interface CreateTestimonialRequest {
  client_id?: number;
  project_id?: number;
  client_name: string;
  client_designation?: string;
  client_company?: string;
  testimonial_text: string;
  rating: number;
  image_url?: string;
}

interface UpdateTestimonialRequest {
  client_name?: string;
  client_designation?: string;
  client_company?: string;
  testimonial_text?: string;
  rating?: number;
  is_featured?: boolean;
  display_order?: number;
  image_url?: string;
}

interface TestimonialListParams {
  page?: Query<number>;
  limit?: Query<number>;
  is_featured?: Query<boolean>;
  is_approved?: Query<boolean>;
  rating?: Query<number>;
  client_id?: Query<number>;
}

// Create new testimonial
export const createTestimonial = api<CreateTestimonialRequest, Testimonial>(
  { auth: true, expose: true, method: "POST", path: "/admin/testimonials" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Validate required fields
    if (!req.client_name || !req.testimonial_text || !req.rating) {
      throw APIError.badRequest("Client name, testimonial text, and rating are required");
    }

    // Validate rating
    if (req.rating < 1 || req.rating > 5) {
      throw APIError.badRequest("Rating must be between 1 and 5");
    }

    // Verify client if provided
    if (req.client_id) {
      const client = await db.queryRow`
        SELECT id FROM users WHERE id = ${req.client_id} AND is_active = true
      `;
      if (!client) {
        throw APIError.badRequest("Invalid client ID");
      }
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
      // Get next display order
      const maxOrder = await db.queryRow`
        SELECT COALESCE(MAX(display_order), 0) as max_order
        FROM testimonials
      `;

      const displayOrder = (maxOrder?.max_order || 0) + 1;

      // Create testimonial
      const testimonial = await db.queryRow<Testimonial>`
        INSERT INTO testimonials (
          client_id, project_id, client_name, client_designation, client_company,
          testimonial_text, rating, display_order, image_url
        ) VALUES (
          ${req.client_id || null}, ${req.project_id || null}, ${req.client_name}, 
          ${req.client_designation || null}, ${req.client_company || null},
          ${req.testimonial_text}, ${req.rating}, ${displayOrder}, ${req.image_url || null}
        )
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'create', 'testimonial', ${testimonial.id}, ${JSON.stringify(testimonial)})
      `;

      return testimonial;

    } catch (error) {
      console.error('Testimonial creation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create testimonial");
    }
  }
);

// Get testimonial by ID
export const getTestimonial = api<{ id: number }, Testimonial>(
  { auth: true, expose: true, method: "GET", path: "/admin/testimonials/:id" },
  async ({ id }) => {
    const testimonial = await db.queryRow<Testimonial>`
      SELECT t.*, 
             u.first_name || ' ' || u.last_name as client_full_name,
             p.title as project_title,
             approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM testimonials t
      LEFT JOIN users u ON t.client_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users approver ON t.approved_by = approver.id
      WHERE t.id = ${id}
    `;

    if (!testimonial) {
      throw APIError.notFound("Testimonial not found");
    }

    return testimonial;
  }
);

// List testimonials with filtering
export const listTestimonials = api<TestimonialListParams, { testimonials: any[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/admin/testimonials" },
  async (params) => {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Featured filter
    if (params.is_featured !== undefined) {
      whereClause += ` AND t.is_featured = $${paramIndex}`;
      queryParams.push(params.is_featured);
      paramIndex++;
    }

    // Approved filter
    if (params.is_approved !== undefined) {
      whereClause += ` AND t.is_approved = $${paramIndex}`;
      queryParams.push(params.is_approved);
      paramIndex++;
    }

    // Rating filter
    if (params.rating) {
      whereClause += ` AND t.rating >= $${paramIndex}`;
      queryParams.push(params.rating);
      paramIndex++;
    }

    // Client filter
    if (params.client_id) {
      whereClause += ` AND t.client_id = $${paramIndex}`;
      queryParams.push(params.client_id);
      paramIndex++;
    }

    try {
      // Get testimonials
      const testimonialsQuery = `
        SELECT 
          t.*,
          u.first_name || ' ' || u.last_name as client_full_name,
          p.title as project_title,
          approver.first_name || ' ' || approver.last_name as approved_by_name
        FROM testimonials t
        LEFT JOIN users u ON t.client_id = u.id
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users approver ON t.approved_by = approver.id
        ${whereClause}
        ORDER BY t.is_featured DESC, t.display_order, t.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const testimonialsResult = await db.query(testimonialsQuery, ...queryParams);
      const testimonials: any[] = [];
      for await (const testimonial of testimonialsResult) {
        testimonials.push({
          id: testimonial.id,
          client_id: testimonial.client_id,
          project_id: testimonial.project_id,
          client_name: testimonial.client_name,
          client_full_name: testimonial.client_full_name,
          client_designation: testimonial.client_designation,
          client_company: testimonial.client_company,
          testimonial_text: testimonial.testimonial_text,
          rating: testimonial.rating,
          is_featured: testimonial.is_featured,
          is_approved: testimonial.is_approved,
          approved_by: testimonial.approved_by,
          approved_by_name: testimonial.approved_by_name,
          approved_at: testimonial.approved_at,
          display_order: testimonial.display_order,
          image_url: testimonial.image_url,
          project_title: testimonial.project_title,
          created_at: testimonial.created_at,
          updated_at: testimonial.updated_at
        });
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM testimonials t ${whereClause}`;
      const countResult = await db.query(countQuery, ...queryParams.slice(0, -2));
      let total = 0;
      for await (const row of countResult) {
        total = parseInt(row.total);
        break;
      }

      return {
        testimonials,
        total,
        page,
        limit
      };

    } catch (error) {
      console.error('List testimonials error:', error);
      throw APIError.internal("Failed to fetch testimonials");
    }
  }
);

// Update testimonial
export const updateTestimonial = api<{ id: number } & UpdateTestimonialRequest, Testimonial>(
  { auth: true, expose: true, method: "PUT", path: "/admin/testimonials/:id" },
  async ({ id, ...req }) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('content.manage') && !auth.permissions.includes('testimonials.manage')) {
      throw APIError.forbidden("Insufficient permissions to update testimonials");
    }

    // Get existing testimonial
    const existingTestimonial = await db.queryRow<Testimonial>`
      SELECT * FROM testimonials WHERE id = ${id}
    `;

    if (!existingTestimonial) {
      throw APIError.notFound("Testimonial not found");
    }

    // Validate rating if provided
    if (req.rating && (req.rating < 1 || req.rating > 5)) {
      throw APIError.badRequest("Rating must be between 1 and 5");
    }

    try {
      // Update testimonial
      const testimonial = await db.queryRow<Testimonial>`
        UPDATE testimonials SET
          client_name = COALESCE(${req.client_name}, client_name),
          client_designation = COALESCE(${req.client_designation}, client_designation),
          client_company = COALESCE(${req.client_company}, client_company),
          testimonial_text = COALESCE(${req.testimonial_text}, testimonial_text),
          rating = COALESCE(${req.rating}, rating),
          is_featured = COALESCE(${req.is_featured}, is_featured),
          display_order = COALESCE(${req.display_order}, display_order),
          image_url = COALESCE(${req.image_url}, image_url),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'update', 'testimonial', ${id}, ${JSON.stringify(existingTestimonial)}, ${JSON.stringify(testimonial)})
      `;

      return testimonial;

    } catch (error) {
      console.error('Testimonial update error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update testimonial");
    }
  }
);

// Approve testimonial
export const approveTestimonial = api<{ id: number; approved: boolean }, Testimonial>(
  { auth: true, expose: true, method: "POST", path: "/admin/testimonials/:id/approve" },
  async ({ id, approved }) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('content.manage') && !auth.permissions.includes('testimonials.approve')) {
      throw APIError.forbidden("Insufficient permissions to approve testimonials");
    }

    const testimonial = await db.queryRow<Testimonial>`
      SELECT * FROM testimonials WHERE id = ${id}
    `;

    if (!testimonial) {
      throw APIError.notFound("Testimonial not found");
    }

    try {
      // Update approval status
      const updatedTestimonial = await db.queryRow<Testimonial>`
        UPDATE testimonials SET
          is_approved = ${approved},
          approved_by = ${approved ? auth.userID : null},
          approved_at = ${approved ? 'NOW()' : null},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, ${approved ? 'approve' : 'unapprove'}, 'testimonial', ${id}, ${JSON.stringify(testimonial)}, ${JSON.stringify(updatedTestimonial)})
      `;

      return updatedTestimonial;

    } catch (error) {
      console.error('Approve testimonial error:', error);
      throw APIError.internal("Failed to approve testimonial");
    }
  }
);

// Delete testimonial
export const deleteTestimonial = api<{ id: number }, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "DELETE", path: "/admin/testimonials/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('content.manage') && !auth.permissions.includes('testimonials.manage')) {
      throw APIError.forbidden("Insufficient permissions to delete testimonials");
    }

    const testimonial = await db.queryRow<Testimonial>`
      SELECT * FROM testimonials WHERE id = ${id}
    `;

    if (!testimonial) {
      throw APIError.notFound("Testimonial not found");
    }

    try {
      // Delete testimonial
      await db.exec`DELETE FROM testimonials WHERE id = ${id}`;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values)
        VALUES (${auth.userID}, 'delete', 'testimonial', ${id}, ${JSON.stringify(testimonial)})
      `;

      return {
        success: true,
        message: "Testimonial deleted successfully"
      };

    } catch (error) {
      console.error('Testimonial deletion error:', error);
      throw APIError.internal("Failed to delete testimonial");
    }
  }
);

// Get public testimonials (for website)
export const getPublicTestimonials = api<{ 
  limit?: Query<number>;
  featured_only?: Query<boolean>;
  min_rating?: Query<number>;
}, { testimonials: any[] }>(
  { expose: true, method: "GET", path: "/public/testimonials" },
  async (params) => {
    const limit = Math.min(params.limit || 10, 50);
    const featuredOnly = params.featured_only || false;
    const minRating = params.min_rating || 1;

    try {
      let whereClause = "WHERE t.is_approved = true";
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (featuredOnly) {
        whereClause += ` AND t.is_featured = true`;
      }

      if (minRating > 1) {
        whereClause += ` AND t.rating >= $${paramIndex}`;
        queryParams.push(minRating);
        paramIndex++;
      }

      const testimonialsQuery = `
        SELECT 
          t.id,
          t.client_name,
          t.client_designation,
          t.client_company,
          t.testimonial_text,
          t.rating,
          t.image_url,
          p.title as project_title
        FROM testimonials t
        LEFT JOIN projects p ON t.project_id = p.id
        ${whereClause}
        ORDER BY t.is_featured DESC, t.display_order, t.created_at DESC
        LIMIT $${paramIndex}
      `;
      
      queryParams.push(limit);
      
      const testimonialsResult = await db.query(testimonialsQuery, ...queryParams);
      const testimonials: any[] = [];
      for await (const testimonial of testimonialsResult) {
        testimonials.push({
          id: testimonial.id,
          client_name: testimonial.client_name,
          client_designation: testimonial.client_designation,
          client_company: testimonial.client_company,
          testimonial_text: testimonial.testimonial_text,
          rating: testimonial.rating,
          image_url: testimonial.image_url,
          project_title: testimonial.project_title
        });
      }

      return { testimonials };

    } catch (error) {
      console.error('Get public testimonials error:', error);
      throw APIError.internal("Failed to fetch public testimonials");
    }
  }
);

// Reorder testimonials
export const reorderTestimonials = api<{ testimonial_orders: { id: number; display_order: number }[] }, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/admin/testimonials/reorder" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('content.manage') && !auth.permissions.includes('testimonials.manage')) {
      throw APIError.forbidden("Insufficient permissions to reorder testimonials");
    }

    if (!req.testimonial_orders?.length) {
      throw APIError.badRequest("Testimonial orders are required");
    }

    try {
      // Update display orders
      for (const order of req.testimonial_orders) {
        await db.exec`
          UPDATE testimonials 
          SET display_order = ${order.display_order}, updated_at = NOW()
          WHERE id = ${order.id}
        `;
      }

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'reorder', 'testimonial', 0, ${JSON.stringify(req.testimonial_orders)})
      `;

      return { success: true };

    } catch (error) {
      console.error('Reorder testimonials error:', error);
      throw APIError.internal("Failed to reorder testimonials");
    }
  }
);

// Get testimonial statistics
export const getTestimonialStatistics = api<{}, { 
  total_testimonials: number;
  approved_testimonials: number;
  featured_testimonials: number;
  average_rating: number;
  rating_distribution: any[];
}>(
  { auth: true, expose: true, method: "GET", path: "/admin/testimonials/statistics" },
  async () => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('content.view') && !auth.permissions.includes('analytics.view')) {
      throw APIError.forbidden("Insufficient permissions to view testimonial statistics");
    }

    try {
      // Get overall statistics
      const overallStats = await db.queryRow`
        SELECT 
          COUNT(*) as total_testimonials,
          COUNT(*) FILTER (WHERE is_approved = true) as approved_testimonials,
          COUNT(*) FILTER (WHERE is_featured = true) as featured_testimonials,
          AVG(rating) as average_rating
        FROM testimonials
      `;

      // Get rating distribution
      const ratingQuery = db.query`
        SELECT 
          rating,
          COUNT(*) as count
        FROM testimonials
        WHERE is_approved = true
        GROUP BY rating
        ORDER BY rating DESC
      `;

      const ratingDistribution: any[] = [];
      for await (const row of ratingQuery) {
        ratingDistribution.push({
          rating: row.rating,
          count: parseInt(row.count || '0')
        });
      }

      return {
        total_testimonials: parseInt(overallStats?.total_testimonials || '0'),
        approved_testimonials: parseInt(overallStats?.approved_testimonials || '0'),
        featured_testimonials: parseInt(overallStats?.featured_testimonials || '0'),
        average_rating: parseFloat(overallStats?.average_rating || '0'),
        rating_distribution: ratingDistribution
      };

    } catch (error) {
      console.error('Get testimonial statistics error:', error);
      throw APIError.internal("Failed to fetch testimonial statistics");
    }
  }
);
