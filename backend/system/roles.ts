import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface Role {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
}

interface RolesResponse {
  roles: Role[];
}

// Gets all system roles with their permissions
export const getRoles = api<void, RolesResponse>(
  { auth: true, expose: true, method: "GET", path: "/system/roles" },
  async () => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('roles.view')) {
      throw APIError.permissionDenied("Insufficient permissions");
    }

    const roles = await db.queryAll`
      SELECT 
        r.id,
        r.name,
        r.display_name,
        r.description,
        r.is_active,
        r.created_at,
        array_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      GROUP BY r.id, r.name, r.display_name, r.description, r.is_active, r.created_at
      ORDER BY r.name
    `;

    return {
      roles: roles.map(role => ({
        id: role.id,
        name: role.name,
        displayName: role.display_name,
        description: role.description,
        isActive: role.is_active,
        permissions: role.permissions || [],
        createdAt: role.created_at
      }))
    };
  }
);
