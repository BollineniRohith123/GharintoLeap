import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { ValidationService, MaterialValidationRules } from "../common/validation";

export interface Vendor {
  id: number;
  user_id?: number;
  company_name: string;
  business_type?: string;
  gst_number?: string;
  pan_number?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  is_verified: boolean;
  rating: number;
  total_orders: number;
  created_at: Date;
  updated_at: Date;
}

export interface Material {
  id: number;
  vendor_id: number;
  name: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  description?: string;
  unit: string;
  price: number;
  discounted_price?: number;
  stock_quantity: number;
  min_order_quantity: number;
  lead_time_days: number;
  is_active: boolean;
  images: string[];
  specifications?: string;
  created_at: Date;
  updated_at: Date;
}

export interface VendorReview {
  id: number;
  vendor_id: number;
  project_id?: number;
  reviewer_id: number;
  reviewer_name: string;
  rating: number;
  review_text?: string;
  created_at: Date;
}

export interface CreateVendorRequest {
  company_name: string;
  business_type?: string;
  gst_number?: string;
  pan_number?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface CreateMaterialRequest {
  name: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  description?: string;
  unit: string;
  price: number;
  discounted_price?: number;
  stock_quantity?: number;
  min_order_quantity?: number;
  lead_time_days?: number;
  images?: string[];
  specifications?: string;
}

export interface CreateReviewRequest {
  vendor_id: number;
  project_id?: number;
  rating: number;
  review_text?: string;
}

export interface SearchMaterialsRequest {
  query?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  vendor_id?: number;
  city?: string;
  in_stock?: boolean;
  limit?: number;
  offset?: number;
}

export const createVendor = api<CreateVendorRequest, Vendor>(
  { auth: true, expose: true, method: "POST", path: "/vendors" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Check if user has vendor role or admin permissions
    const hasPermission = auth.roles.includes('vendor') || 
                         auth.permissions.includes('vendors.manage');

    if (!hasPermission) {
      throw APIError.forbidden("Access denied to create vendor");
    }

    const vendor = await db.queryRow<Vendor>`
      INSERT INTO vendors (
        user_id, company_name, business_type, gst_number, pan_number,
        address, city, state, pincode
      ) VALUES (
        ${userId}, ${req.company_name}, ${req.business_type}, ${req.gst_number},
        ${req.pan_number}, ${req.address}, ${req.city}, ${req.state}, ${req.pincode}
      ) RETURNING *
    `;

    if (!vendor) {
      throw APIError.internal("Failed to create vendor");
    }

    return vendor;
  }
);

export const getVendors = api<{
  city?: string;
  business_type?: string;
  verified_only?: boolean;
  min_rating?: number;
  limit?: number;
  offset?: number;
}, { vendors: Vendor[]; total_count: number }>(
  { auth: true, expose: true, method: "GET", path: "/vendors" },
  async (req) => {
    const { city, business_type, verified_only, min_rating, limit = 20, offset = 0 } = req;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (city) {
      whereConditions.push(`city = $${paramIndex++}`);
      params.push(city);
    }

    if (business_type) {
      whereConditions.push(`business_type = $${paramIndex++}`);
      params.push(business_type);
    }

    if (verified_only) {
      whereConditions.push(`is_verified = true`);
    }

    if (min_rating !== undefined) {
      whereConditions.push(`rating >= $${paramIndex++}`);
      params.push(min_rating);
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT * FROM vendors
      ${whereClause}
      ORDER BY rating DESC, total_orders DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const vendors = await db.rawQueryAll<Vendor>(query, ...params);

    const countQuery = `SELECT COUNT(*) as count FROM vendors ${whereClause}`;
    const countResult = await db.rawQueryRow<{ count: number }>(
      countQuery, 
      ...params.slice(0, -2)
    );

    return {
      vendors,
      total_count: countResult?.count || 0
    };
  }
);

export const createMaterial = api<CreateMaterialRequest, Material>(
  { auth: true, expose: true, method: "POST", path: "/materials" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Validate input
    ValidationService.validateAndThrow(req, MaterialValidationRules.create);

    // Get vendor ID for the user
    const vendor = await db.queryRow<{ id: number }>`
      SELECT id FROM vendors WHERE user_id = ${userId}
    `;

    if (!vendor) {
      throw APIError.forbidden("Only vendors can create materials");
    }

    const material = await db.queryRow<Material>`
      INSERT INTO materials (
        vendor_id, name, category, subcategory, brand, model,
        description, unit, price, discounted_price, stock_quantity,
        min_order_quantity, lead_time_days, images, specifications
      ) VALUES (
        ${vendor.id}, ${req.name}, ${req.category}, ${req.subcategory},
        ${req.brand}, ${req.model}, ${req.description}, ${req.unit},
        ${req.price}, ${req.discounted_price}, ${req.stock_quantity || 0},
        ${req.min_order_quantity || 1}, ${req.lead_time_days || 0},
        ${req.images || []}, ${req.specifications}
      ) RETURNING *
    `;

    if (!material) {
      throw APIError.internal("Failed to create material");
    }

    return material;
  }
);

export const searchMaterials = api<SearchMaterialsRequest, { materials: Material[]; total_count: number }>(
  { auth: true, expose: true, method: "POST", path: "/materials/search" },
  async (req) => {
    const { 
      query, category, min_price, max_price, vendor_id, city, 
      in_stock, limit = 20, offset = 0 
    } = req;

    let whereConditions: string[] = ['m.is_active = true'];
    let params: any[] = [];
    let paramIndex = 1;

    if (query) {
      whereConditions.push(`m.name ILIKE $${paramIndex++}`);
      params.push(`%${query}%`);
    }

    if (category) {
      whereConditions.push(`m.category = $${paramIndex++}`);
      params.push(category);
    }

    if (min_price !== undefined) {
      whereConditions.push(`m.price >= $${paramIndex++}`);
      params.push(min_price);
    }

    if (max_price !== undefined) {
      whereConditions.push(`m.price <= $${paramIndex++}`);
      params.push(max_price);
    }

    if (vendor_id) {
      whereConditions.push(`m.vendor_id = $${paramIndex++}`);
      params.push(vendor_id);
    }

    if (city) {
      whereConditions.push(`v.city = $${paramIndex++}`);
      params.push(city);
    }

    if (in_stock) {
      whereConditions.push(`m.stock_quantity > 0`);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const searchQuery = `
      SELECT 
        m.*,
        v.company_name as vendor_name,
        v.city as vendor_city,
        v.rating as vendor_rating
      FROM materials m
      JOIN vendors v ON m.vendor_id = v.id
      ${whereClause}
      ORDER BY 
        CASE WHEN m.discounted_price IS NOT NULL THEN m.discounted_price ELSE m.price END ASC,
        v.rating DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const materials = await db.rawQueryAll<Material>(searchQuery, ...params);

    const countQuery = `
      SELECT COUNT(*) as count
      FROM materials m
      JOIN vendors v ON m.vendor_id = v.id
      ${whereClause}
    `;
    const countResult = await db.rawQueryRow<{ count: number }>(
      countQuery, 
      ...params.slice(0, -2)
    );

    return {
      materials,
      total_count: countResult?.count || 0
    };
  }
);

export const getMaterial = api<{ material_id: number }, Material>(
  { auth: true, expose: true, method: "GET", path: "/materials/:material_id" },
  async ({ material_id }) => {
    const material = await db.queryRow<Material>`
      SELECT m.*, v.company_name as vendor_name, v.city as vendor_city
      FROM materials m
      JOIN vendors v ON m.vendor_id = v.id
      WHERE m.id = ${material_id} AND m.is_active = true
    `;

    if (!material) {
      throw APIError.notFound("Material not found");
    }

    return material;
  }
);

export const updateMaterial = api<{ material_id: number } & Partial<CreateMaterialRequest>, Material>(
  { auth: true, expose: true, method: "PUT", path: "/materials/:material_id" },
  async ({ material_id, ...updates }) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Check if user owns this material or has admin permissions
    const material = await db.queryRow<{ vendor_id: number; user_id: number }>`
      SELECT m.vendor_id, v.user_id
      FROM materials m
      JOIN vendors v ON m.vendor_id = v.id
      WHERE m.id = ${material_id}
    `;

    if (!material) {
      throw APIError.notFound("Material not found");
    }

    const canUpdate = material.user_id === userId || 
                     auth.permissions.includes('vendors.manage');

    if (!canUpdate) {
      throw APIError.forbidden("Access denied to update this material");
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'material_id') {
        updateFields.push(`${key} = $${paramIndex++}`);
        params.push(value);
      }
    });

    if (updateFields.length === 0) {
      throw APIError.badRequest("No fields to update");
    }

    updateFields.push(`updated_at = NOW()`);
    params.push(material_id);

    const updateQuery = `
      UPDATE materials 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updatedMaterial = await db.rawQueryRow<Material>(updateQuery, ...params);

    if (!updatedMaterial) {
      throw APIError.internal("Failed to update material");
    }

    return updatedMaterial;
  }
);

export const createVendorReview = api<CreateReviewRequest, VendorReview>(
  { auth: true, expose: true, method: "POST", path: "/vendors/reviews" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Validate rating
    if (req.rating < 1 || req.rating > 5) {
      throw APIError.badRequest("Rating must be between 1 and 5");
    }

    // Check if vendor exists
    const vendor = await db.queryRow`
      SELECT id FROM vendors WHERE id = ${req.vendor_id}
    `;

    if (!vendor) {
      throw APIError.notFound("Vendor not found");
    }

    // Check if user has already reviewed this vendor for this project
    if (req.project_id) {
      const existingReview = await db.queryRow`
        SELECT id FROM vendor_reviews 
        WHERE vendor_id = ${req.vendor_id} AND reviewer_id = ${userId} AND project_id = ${req.project_id}
      `;

      if (existingReview) {
        throw APIError.alreadyExists("You have already reviewed this vendor for this project");
      }
    }

    const review = await db.queryRow<VendorReview>`
      INSERT INTO vendor_reviews (vendor_id, project_id, reviewer_id, rating, review_text)
      VALUES (${req.vendor_id}, ${req.project_id}, ${userId}, ${req.rating}, ${req.review_text})
      RETURNING id, vendor_id, project_id, reviewer_id, rating, review_text, created_at
    `;

    if (!review) {
      throw APIError.internal("Failed to create review");
    }

    // Update vendor's average rating
    await updateVendorRating(req.vendor_id);

    // Get reviewer name
    const reviewer = await db.queryRow<{ first_name: string; last_name: string }>`
      SELECT first_name, last_name FROM users WHERE id = ${userId}
    `;

    return {
      ...review,
      reviewer_name: reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : 'Anonymous'
    };
  }
);

export const getVendorReviews = api<{ vendor_id: number; limit?: number; offset?: number }, { reviews: VendorReview[]; total_count: number; average_rating: number }>(
  { auth: true, expose: true, method: "GET", path: "/vendors/:vendor_id/reviews" },
  async ({ vendor_id, limit = 10, offset = 0 }) => {
    const reviewsQuery = db.rawQuery<VendorReview>(`
      SELECT 
        vr.id, vr.vendor_id, vr.project_id, vr.reviewer_id, vr.rating, vr.review_text, vr.created_at,
        u.first_name || ' ' || u.last_name as reviewer_name
      FROM vendor_reviews vr
      JOIN users u ON vr.reviewer_id = u.id
      WHERE vr.vendor_id = $1
      ORDER BY vr.created_at DESC
      LIMIT $2 OFFSET $3
    `, vendor_id, limit, offset);

    const reviews: VendorReview[] = [];
    for await (const review of reviewsQuery) {
      reviews.push(review);
    }

    const countResult = await db.queryRow<{ count: number; avg_rating: number }>`
      SELECT COUNT(*) as count, AVG(rating)::NUMERIC(3,2) as avg_rating
      FROM vendor_reviews 
      WHERE vendor_id = ${vendor_id}
    `;

    return {
      reviews,
      total_count: countResult?.count || 0,
      average_rating: countResult?.avg_rating || 0
    };
  }
);

async function updateVendorRating(vendorId: number): Promise<void> {
  await db.exec`
    UPDATE vendors 
    SET rating = (
      SELECT AVG(rating)::NUMERIC(3,2) 
      FROM vendor_reviews 
      WHERE vendor_id = ${vendorId}
    )
    WHERE id = ${vendorId}
  `;
}