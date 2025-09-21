import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface ListUsersParams {
  page?: Query<number>;
  limit?: Query<number>;
  search?: Query<string>;
  role?: Query<string>;
  city?: Query<string>;
}

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
}

interface ListUsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

// Lists all users with filtering and pagination
export const listUsers = api<ListUsersParams, ListUsersResponse>(
  { auth: true, expose: true, method: "GET", path: "/users" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('users.view')) {
      throw new Error("Insufficient permissions");
    }

    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.search) {
      whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.city) {
      whereClause += ` AND u.city = $${paramIndex}`;
      queryParams.push(params.city);
      paramIndex++;
    }

    if (params.role) {
      whereClause += ` AND r.name = $${paramIndex}`;
      queryParams.push(params.role);
      paramIndex++;
    }

    const users = await db.rawQueryAll(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.city,
        u.is_active,
        u.created_at,
        array_agg(DISTINCT r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.city, u.is_active, u.created_at
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, ...queryParams, limit, offset);

    const totalResult = await db.rawQueryRow(`
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
    `, ...queryParams);

    return {
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        city: user.city,
        isActive: user.is_active,
        roles: user.roles || [],
        createdAt: user.created_at
      })),
      total: totalResult?.total || 0,
      page,
      limit
    };
  }
);
