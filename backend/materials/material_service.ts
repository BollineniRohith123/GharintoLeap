import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { AppError, withErrorHandling, safeAsync } from "../common/error_handler";
import { ValidationService, MaterialValidationRules } from "../common/validation";

export interface Material {
  id: number;
  vendor_id: number;
  name: string;
  category: string;
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
  images?: string[];
  specifications?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  vendor?: {
    id: number;
    company_name: string;
    rating?: number;
    is_verified: boolean;
  };
}

export interface CreateMaterialRequest {
  name: string;
  category: string;
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
  specifications?: Record<string, any>;
}

export interface UpdateMaterialRequest {
  name?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  description?: string;
  unit?: string;
  price?: number;
  discounted_price?: number;
  stock_quantity?: number;
  min_order_quantity?: number;
  lead_time_days?: number;
  is_active?: boolean;
  images?: string[];
  specifications?: Record<string, any>;
}

export interface MaterialSearchRequest {
  search?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  vendor_id?: number;
  min_price?: number;
  max_price?: number;
  in_stock_only?: boolean;
  is_active?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'price' | 'created_at' | 'stock_quantity';
  sort_order?: 'asc' | 'desc';
}

export interface MaterialsResponse {
  materials: Material[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface MaterialStatsResponse {
  total_materials: number;
  active_materials: number;
  categories: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  by_category: Array<{
    category: string;
    count: number;
    total_value: number;
  }>;
}

// Create material (vendor only)
export const createMaterial = api(
  { method: "POST", path: "/materials", expose: true },
  withErrorHandling(async (req: CreateMaterialRequest): Promise<Material> => {
    const auth = getAuthData();
    if (!auth) throw AppError.unauthorized();

    // Validate input
    ValidationService.validateAndThrow(req, MaterialValidationRules.create);

    // Check if user is a vendor
    const vendor = await safeAsync(async () => {
      const result = await db.query(`
        SELECT id FROM vendors WHERE user_id = $1 AND is_verified = true
      `, [auth.userID]);
      return result.rows[0];
    }, "check vendor status");

    if (!vendor) {
      throw AppError.forbidden("Only verified vendors can create materials");
    }

    const material = await safeAsync(async () => {
      const result = await db.query(`
        INSERT INTO materials (
          vendor_id, name, category, subcategory, brand, model, description,
          unit, price, discounted_price, stock_quantity, min_order_quantity, 
          lead_time_days, images, specifications
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        vendor.id,
        req.name,
        req.category,
        req.subcategory,
        req.brand,
        req.model,
        req.description,
        req.unit,
        req.price,
        req.discounted_price,
        req.stock_quantity || 0,
        req.min_order_quantity || 1,
        req.lead_time_days || 0,
        JSON.stringify(req.images || []),
        JSON.stringify(req.specifications || {})
      ]);

      return result.rows[0];
    }, "create material");

    return {
      ...material,
      images: material.images ? JSON.parse(material.images) : [],
      specifications: material.specifications ? JSON.parse(material.specifications) : {}
    };
  })
);

// Update material (vendor only - own materials)
export const updateMaterial = api<UpdateMaterialRequest & { id: string }, Material>(
  { method: "PUT", path: "/materials/:id", expose: true },
  withErrorHandling(async (req) => {
    const materialId = parseInt(req.id);
    const auth = getAuthData();
    if (!auth) throw AppError.unauthorized();

    // Validate input
    ValidationService.validateAndThrow(req, MaterialValidationRules.update);

    // Check if user owns this material
    const material = await safeAsync(async () => {
      const result = await db.query(`
        SELECT m.*, v.user_id 
        FROM materials m 
        INNER JOIN vendors v ON m.vendor_id = v.id 
        WHERE m.id = $1
      `, [materialId]);
      return result.rows[0];
    }, "check material ownership");

    if (!material) {
      throw AppError.notFound("Material", materialId);
    }

    if (material.user_id !== parseInt(auth.userID)) {
      throw AppError.forbidden("You can only update your own materials");
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const fields = [
      'name', 'category', 'subcategory', 'brand', 'model', 'description',
      'unit', 'price', 'discounted_price', 'stock_quantity', 
      'min_order_quantity', 'lead_time_days', 'is_active'
    ];

    for (const field of fields) {
      if (req[field as keyof UpdateMaterialRequest] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(req[field as keyof UpdateMaterialRequest]);
        paramCount++;
      }
    }

    if (req.images !== undefined) {
      updates.push(`images = $${paramCount}`);
      values.push(JSON.stringify(req.images));
      paramCount++;
    }

    if (req.specifications !== undefined) {
      updates.push(`specifications = $${paramCount}`);
      values.push(JSON.stringify(req.specifications));
      paramCount++;
    }

    if (updates.length === 0) {
      throw AppError.badRequest("No fields to update");
    }

    values.push(materialId);
    const updatedMaterial = await safeAsync(async () => {
      const result = await db.query(`
        UPDATE materials 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      return result.rows[0];
    }, "update material");

    return {
      ...updatedMaterial,
      images: updatedMaterial.images ? JSON.parse(updatedMaterial.images) : [],
      specifications: updatedMaterial.specifications ? JSON.parse(updatedMaterial.specifications) : {}
    };
  })
);

// Search and list materials
export const searchMaterials = api(
  { method: "GET", path: "/materials", expose: true },
  withErrorHandling(async (req: MaterialSearchRequest): Promise<MaterialsResponse> => {
    const auth = getAuthData();
    if (!auth) throw AppError.unauthorized();

    const page = req.page || 1;
    const limit = Math.min(req.limit || 20, 100);
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (req.search) {
      conditions.push(`(m.name ILIKE $${paramCount} OR m.description ILIKE $${paramCount} OR m.brand ILIKE $${paramCount})`);
      params.push(`%${req.search}%`);
      paramCount++;
    }

    if (req.category) {
      conditions.push(`m.category = $${paramCount}`);
      params.push(req.category);
      paramCount++;
    }

    if (req.subcategory) {
      conditions.push(`m.subcategory = $${paramCount}`);
      params.push(req.subcategory);
      paramCount++;
    }

    if (req.brand) {
      conditions.push(`m.brand = $${paramCount}`);
      params.push(req.brand);
      paramCount++;
    }

    if (req.vendor_id) {
      conditions.push(`m.vendor_id = $${paramCount}`);
      params.push(req.vendor_id);
      paramCount++;
    }

    if (req.min_price) {
      conditions.push(`m.price >= $${paramCount}`);
      params.push(req.min_price);
      paramCount++;
    }

    if (req.max_price) {
      conditions.push(`m.price <= $${paramCount}`);
      params.push(req.max_price);
      paramCount++;
    }

    if (req.in_stock_only) {
      conditions.push(`m.stock_quantity > 0`);
    }

    if (req.is_active !== undefined) {
      conditions.push(`m.is_active = $${paramCount}`);
      params.push(req.is_active);
      paramCount++;
    } else {
      conditions.push(`m.is_active = true`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY
    const sortBy = req.sort_by || 'created_at';
    const sortOrder = req.sort_order || 'desc';
    const orderBy = `ORDER BY m.${sortBy} ${sortOrder.toUpperCase()}`;

    // Get total count
    const countResult = await safeAsync(async () => {
      const result = await db.query(`
        SELECT COUNT(*) as total
        FROM materials m
        INNER JOIN vendors v ON m.vendor_id = v.id
        ${whereClause}
      `, params);
      return parseInt(result.rows[0].total);
    }, "count materials");

    // Get materials
    const materials = await safeAsync(async () => {
      const result = await db.query(`
        SELECT 
          m.*,
          v.company_name as vendor_company_name,
          v.rating as vendor_rating,
          v.is_verified as vendor_is_verified
        FROM materials m
        INNER JOIN vendors v ON m.vendor_id = v.id
        ${whereClause}
        ${orderBy}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `, [...params, limit, offset]);

      return result.rows.map(row => ({
        ...row,
        images: row.images ? JSON.parse(row.images) : [],
        specifications: row.specifications ? JSON.parse(row.specifications) : {},
        vendor: {
          id: row.vendor_id,
          company_name: row.vendor_company_name,
          rating: row.vendor_rating,
          is_verified: row.vendor_is_verified
        }
      }));
    }, "fetch materials");

    const totalPages = Math.ceil(countResult / limit);

    return {
      materials,
      total: countResult,
      page,
      limit,
      total_pages: totalPages
    };
  })
);

// Get material by ID
export const getMaterial = api<{ id: string }, Material>(
  { method: "GET", path: "/materials/:id", expose: true },
  withErrorHandling(async (req) => {
    const materialId = parseInt(req.id);
    const auth = getAuthData();
    if (!auth) throw AppError.unauthorized();

    const material = await safeAsync(async () => {
      const result = await db.query(`
        SELECT 
          m.*,
          v.company_name as vendor_company_name,
          v.rating as vendor_rating,
          v.is_verified as vendor_is_verified
        FROM materials m
        INNER JOIN vendors v ON m.vendor_id = v.id
        WHERE m.id = $1 AND m.is_active = true
      `, [materialId]);

      return result.rows[0];
    }, "fetch material");

    if (!material) {
      throw AppError.notFound("Material", materialId);
    }

    return {
      ...material,
      images: material.images ? JSON.parse(material.images) : [],
      specifications: material.specifications ? JSON.parse(material.specifications) : {},
      vendor: {
        id: material.vendor_id,
        company_name: material.vendor_company_name,
        rating: material.vendor_rating,
        is_verified: material.vendor_is_verified
      }
    };
  })
);

// Get material categories
export const getCategories = api(
  { method: "GET", path: "/materials/categories", expose: true },
  withErrorHandling(async (): Promise<{ categories: string[] }> => {
    const auth = getAuthData();
    if (!auth) throw AppError.unauthorized();

    const categories = await safeAsync(async () => {
      const result = await db.query(`
        SELECT DISTINCT category 
        FROM materials 
        WHERE is_active = true 
        ORDER BY category
      `);
      return result.rows.map(row => row.category);
    }, "fetch categories");

    return { categories };
  })
);

// Get material statistics
export const getMaterialStats = api(
  { method: "GET", path: "/materials/stats", expose: true },
  withErrorHandling(async (): Promise<MaterialStatsResponse> => {
    const auth = getAuthData();
    if (!auth) throw AppError.unauthorized();

    const stats = await safeAsync(async () => {
      // Basic stats
      const basicStats = await db.query(`
        SELECT 
          COUNT(*) as total_materials,
          COUNT(*) FILTER (WHERE is_active = true) as active_materials,
          COUNT(DISTINCT category) as categories,
          SUM(price * stock_quantity) as total_value,
          COUNT(*) FILTER (WHERE stock_quantity <= min_order_quantity AND stock_quantity > 0) as low_stock_count,
          COUNT(*) FILTER (WHERE stock_quantity = 0) as out_of_stock_count
        FROM materials
      `);

      // Category breakdown
      const categoryStats = await db.query(`
        SELECT 
          category,
          COUNT(*) as count,
          SUM(price * stock_quantity) as total_value
        FROM materials 
        WHERE is_active = true
        GROUP BY category
        ORDER BY count DESC
      `);

      return {
        ...basicStats.rows[0],
        by_category: categoryStats.rows
      };
    }, "fetch material statistics");

    return {
      total_materials: parseInt(stats.total_materials),
      active_materials: parseInt(stats.active_materials),
      categories: parseInt(stats.categories),
      total_value: parseFloat(stats.total_value) || 0,
      low_stock_count: parseInt(stats.low_stock_count),
      out_of_stock_count: parseInt(stats.out_of_stock_count),
      by_category: stats.by_category.map((cat: any) => ({
        category: cat.category,
        count: parseInt(cat.count),
        total_value: parseFloat(cat.total_value) || 0
      }))
    };
  })
);

// Update stock quantity (for inventory management)
export const updateStock = api<{ id: string; stock_quantity: number; reason?: string }, { success: boolean }>(
  { method: "PUT", path: "/materials/:id/stock", expose: true },
  withErrorHandling(async (req) => {
    const materialId = parseInt(req.id);
    const auth = getAuthData();
    if (!auth) throw AppError.unauthorized();

    if (req.stock_quantity < 0) {
      throw AppError.badRequest("Stock quantity cannot be negative");
    }

    // Check if user owns this material or has admin access
    const material = await safeAsync(async () => {
      const result = await db.query(`
        SELECT m.*, v.user_id 
        FROM materials m 
        INNER JOIN vendors v ON m.vendor_id = v.id 
        WHERE m.id = $1
      `, [materialId]);
      return result.rows[0];
    }, "check material ownership");

    if (!material) {
      throw AppError.notFound("Material", materialId);
    }

    // Check if user has permission (vendor owner or admin)
    const hasPermission = material.user_id === parseInt(auth.userID) || await safeAsync(async () => {
      const result = await db.query(`
        SELECT COUNT(*) as count 
        FROM user_roles ur 
        INNER JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = $1 AND r.name IN ('super_admin', 'admin', 'project_manager')
      `, [auth.userID]);
      return parseInt(result.rows[0].count) > 0;
    }, "check admin access");

    if (!hasPermission) {
      throw AppError.forbidden("You can only update stock for your own materials");
    }

    await safeAsync(async () => {
      await db.query(`
        UPDATE materials 
        SET stock_quantity = $1, updated_at = NOW()
        WHERE id = $2
      `, [req.stock_quantity, materialId]);
    }, "update stock quantity");

    return { success: true };
  })
);

// Delete material (vendor only - own materials)
export const deleteMaterial = api<{ id: string }, { success: boolean }>(
  { method: "DELETE", path: "/materials/:id", expose: true },
  withErrorHandling(async (req) => {
    const materialId = parseInt(req.id);
    const auth = getAuthData();
    if (!auth) throw AppError.unauthorized();

    // Check if user owns this material
    const material = await safeAsync(async () => {
      const result = await db.query(`
        SELECT m.*, v.user_id 
        FROM materials m 
        INNER JOIN vendors v ON m.vendor_id = v.id 
        WHERE m.id = $1
      `, [materialId]);
      return result.rows[0];
    }, "check material ownership");

    if (!material) {
      throw AppError.notFound("Material", materialId);
    }

    if (material.user_id !== parseInt(auth.userID)) {
      throw AppError.forbidden("You can only delete your own materials");
    }

    // Check if material is used in any active projects
    const isUsed = await safeAsync(async () => {
      const result = await db.query(`
        SELECT COUNT(*) as count 
        FROM bom_items 
        WHERE material_id = $1 AND status IN ('pending', 'ordered')
      `, [materialId]);
      return parseInt(result.rows[0].count) > 0;
    }, "check material usage");

    if (isUsed) {
      throw AppError.conflict("Cannot delete material that is currently used in active projects");
    }

    await safeAsync(async () => {
      // Soft delete by marking as inactive
      await db.query(`
        UPDATE materials 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `, [materialId]);
    }, "delete material");

    return { success: true };
  })
);