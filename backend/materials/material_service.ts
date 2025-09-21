import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface Material {
  id: number;
  vendor_id: number;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMaterialRequest {
  name: string;
  category: string;
  unit: string;
  price: number;
  stock_quantity?: number;
}

export interface MaterialsResponse {
  materials: Material[];
  total: number;
}

// Create material (vendor only)
export const createMaterial = api(
  { method: "POST", path: "/materials", expose: true, auth: true },
  async (req: CreateMaterialRequest): Promise<Material> => {
    const auth = getAuthData()!;

    // Basic validation
    if (!req.name || !req.category || !req.unit || !req.price) {
      throw new Error("Name, category, unit, and price are required");
    }

    // Check if user is a vendor
    const vendor = await db.queryRow`
      SELECT id FROM vendors WHERE user_id = ${auth.userID} AND is_verified = true
    `;

    if (!vendor) {
      throw new Error("Only verified vendors can create materials");
    }

    const material = await db.queryRow`
      INSERT INTO materials (
        vendor_id, name, category, unit, price, stock_quantity
      ) VALUES (
        ${vendor.id}, ${req.name}, ${req.category}, ${req.unit}, ${req.price}, ${req.stock_quantity || 0}
      )
      RETURNING *
    `;

    return material;
  }
);

// List materials
export const listMaterials = api(
  { method: "GET", path: "/materials", expose: true, auth: true },
  async (): Promise<MaterialsResponse> => {
    const materialsQuery = db.query`
      SELECT * FROM materials WHERE is_active = true ORDER BY created_at DESC LIMIT 100
    `;

    const materials: Material[] = [];
    for await (const material of materialsQuery) {
      materials.push(material);
    }

    return {
      materials,
      total: materials.length
    };
  }
);

// Get material statistics
export const getMaterialStats = api(
  { method: "GET", path: "/materials/stats", expose: true, auth: true },
  async () => {
    const stats = await db.queryRow`
      SELECT 
        COUNT(*) as total_materials,
        COUNT(*) FILTER (WHERE is_active = true) as active_materials,
        COUNT(DISTINCT category) as categories,
        SUM(price * stock_quantity) as total_value
      FROM materials
    `;

    return {
      total_materials: parseInt(stats?.total_materials || '0'),
      active_materials: parseInt(stats?.active_materials || '0'),
      categories: parseInt(stats?.categories || '0'),
      total_value: parseFloat(stats?.total_value || '0'),
      low_stock_count: 0,
      out_of_stock_count: 0,
      by_category: []
    };
  }
);

// Get categories
export const getCategories = api(
  { method: "GET", path: "/materials/categories", expose: true, auth: true },
  async (): Promise<{ categories: string[] }> => {
    const result = db.query`
      SELECT DISTINCT category FROM materials WHERE is_active = true ORDER BY category
    `;

    const categories: string[] = [];
    for await (const row of result) {
      categories.push(row.category);
    }

    return { categories };
  }
);