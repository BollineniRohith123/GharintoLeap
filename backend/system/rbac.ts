import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  created_at: Date;
}

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface Menu {
  id: number;
  name: string;
  display_name: string;
  icon?: string;
  path?: string;
  parent_id?: number;
  sort_order: number;
  is_active: boolean;
  children?: Menu[];
}

export interface UserRoleAssignment {
  user_id: number;
  role_id: number;
  role_name: string;
  role_display_name: string;
  assigned_by?: number;
  assigned_at: Date;
}

export interface AssignRoleRequest {
  user_id: number;
  role_ids: number[];
}

export interface CheckPermissionRequest {
  permission: string;
  resource_id?: number;
}

export const getUserRoles = api<{ user_id?: number }, { roles: UserRoleAssignment[] }>(
  { auth: true, expose: true, method: "GET", path: "/rbac/user-roles" },
  async ({ user_id }) => {
    const auth = getAuthData()!;
    const targetUserId = user_id || parseInt(auth.userID);

    // Check if user can view roles (own roles or admin)
    const canView = targetUserId === parseInt(auth.userID) || 
                   auth.permissions.includes('roles.view') || 
                   auth.permissions.includes('users.view');

    if (!canView) {
      throw APIError.forbidden("Access denied to view user roles");
    }

    const rolesQuery = db.query<UserRoleAssignment>`
      SELECT 
        ur.user_id,
        ur.role_id,
        r.name as role_name,
        r.display_name as role_display_name,
        ur.assigned_by,
        ur.assigned_at
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ${targetUserId}
      ORDER BY r.display_name
    `;

    const roles: UserRoleAssignment[] = [];
    for await (const role of rolesQuery) {
      roles.push(role);
    }

    return { roles };
  }
);

export const getUserPermissions = api<{ user_id?: number }, { permissions: string[] }>(
  { auth: true, expose: true, method: "GET", path: "/rbac/user-permissions" },
  async ({ user_id }) => {
    const auth = getAuthData()!;
    const targetUserId = user_id || parseInt(auth.userID);

    // Check if user can view permissions (own permissions or admin)
    const canView = targetUserId === parseInt(auth.userID) || 
                   auth.permissions.includes('roles.view');

    if (!canView) {
      throw APIError.forbidden("Access denied to view user permissions");
    }

    const permissions = await db.queryAll<{ name: string }>`
      SELECT DISTINCT p.name
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ${targetUserId}
      ORDER BY p.name
    `;

    return { 
      permissions: permissions.map(p => p.name) 
    };
  }
);

export const getUserMenus = api<void, { menus: Menu[] }>(
  { auth: true, expose: true, method: "GET", path: "/rbac/user-menus" },
  async () => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Get menus accessible to user's roles
    const menusQuery = db.query<Menu>`
      SELECT DISTINCT 
        m.id,
        m.name,
        m.display_name,
        m.icon,
        m.path,
        m.parent_id,
        m.sort_order,
        m.is_active
      FROM menus m
      JOIN role_menus rm ON m.id = rm.menu_id
      JOIN user_roles ur ON rm.role_id = ur.role_id
      WHERE ur.user_id = ${userId} AND m.is_active = true AND rm.can_view = true
      ORDER BY m.sort_order, m.display_name
    `;

    const flatMenus: Menu[] = [];
    for await (const menu of menusQuery) {
      flatMenus.push(menu);
    }

    // Build hierarchical menu structure
    const menuMap = new Map<number, Menu>();
    const rootMenus: Menu[] = [];

    // First pass: create menu objects
    flatMenus.forEach(menu => {
      menuMap.set(menu.id, { ...menu, children: [] });
    });

    // Second pass: build hierarchy
    flatMenus.forEach(menu => {
      const menuObj = menuMap.get(menu.id)!;
      if (menu.parent_id && menuMap.has(menu.parent_id)) {
        const parent = menuMap.get(menu.parent_id)!;
        parent.children!.push(menuObj);
      } else {
        rootMenus.push(menuObj);
      }
    });

    return { menus: rootMenus };
  }
);

export const checkPermission = api<CheckPermissionRequest, { hasPermission: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/rbac/check-permission" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check if user has the permission
    const hasPermission = auth.permissions.includes(req.permission);

    // For resource-specific permissions, might need additional checks
    if (hasPermission && req.resource_id) {
      // Add resource-specific permission checks here if needed
      // For example, check if user owns the resource or has access to it
    }

    return { hasPermission };
  }
);

export const assignUserRoles = api<AssignRoleRequest, void>(
  { auth: true, expose: true, method: "POST", path: "/rbac/assign-roles" },
  async (req) => {
    const auth = getAuthData()!;
    const assignerId = parseInt(auth.userID);

    // Check if user can assign roles
    if (!auth.permissions.includes('roles.manage')) {
      throw APIError.forbidden("Access denied to assign roles");
    }

    // Validate user exists
    const user = await db.queryRow`
      SELECT id FROM users WHERE id = ${req.user_id}
    `;

    if (!user) {
      throw APIError.notFound("User not found");
    }

    // Validate roles exist
    const roleCount = await db.queryRow`
      SELECT COUNT(*) as count FROM roles WHERE id = ANY(${req.role_ids})
    `;

    if (roleCount?.count !== req.role_ids.length) {
      throw APIError.badRequest("Some roles do not exist");
    }

    // Remove existing roles
    await db.exec`
      DELETE FROM user_roles WHERE user_id = ${req.user_id}
    `;

    // Assign new roles
    if (req.role_ids.length > 0) {
      for (const roleId of req.role_ids) {
        await db.exec`
          INSERT INTO user_roles (user_id, role_id, assigned_by)
          VALUES (${req.user_id}, ${roleId}, ${assignerId})
        `;
      }
    }
  }
);

export const getAllRoles = api<void, { roles: Role[] }>(
  { auth: true, expose: true, method: "GET", path: "/rbac/roles" },
  async () => {
    const auth = getAuthData()!;

    // Check if user can view roles
    if (!auth.permissions.includes('roles.view')) {
      throw APIError.forbidden("Access denied to view roles");
    }

    const rolesQuery = db.query<Role>`
      SELECT id, name, display_name, description, is_active, created_at
      FROM roles
      WHERE is_active = true
      ORDER BY display_name
    `;

    const roles: Role[] = [];
    for await (const role of rolesQuery) {
      roles.push(role);
    }

    return { roles };
  }
);

export const getAllPermissions = api<void, { permissions: Permission[] }>(
  { auth: true, expose: true, method: "GET", path: "/rbac/permissions" },
  async () => {
    const auth = getAuthData()!;

    // Check if user can view permissions
    if (!auth.permissions.includes('roles.view')) {
      throw APIError.forbidden("Access denied to view permissions");
    }

    const permissionsQuery = db.query<Permission>`
      SELECT id, name, display_name, description, resource, action
      FROM permissions
      ORDER BY resource, action, display_name
    `;

    const permissions: Permission[] = [];
    for await (const permission of permissionsQuery) {
      permissions.push(permission);
    }

    return { permissions };
  }
);

export const getRolePermissions = api<{ role_id: number }, { permissions: Permission[] }>(
  { auth: true, expose: true, method: "GET", path: "/rbac/roles/:role_id/permissions" },
  async ({ role_id }) => {
    const auth = getAuthData()!;

    // Check if user can view role permissions
    if (!auth.permissions.includes('roles.view')) {
      throw APIError.forbidden("Access denied to view role permissions");
    }

    const permissionsQuery = db.query<Permission>`
      SELECT p.id, p.name, p.display_name, p.description, p.resource, p.action
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ${role_id}
      ORDER BY p.resource, p.action, p.display_name
    `;

    const permissions: Permission[] = [];
    for await (const permission of permissionsQuery) {
      permissions.push(permission);
    }

    return { permissions };
  }
);

export const updateRolePermissions = api<{
  role_id: number;
  permission_ids: number[];
}, void>(
  { auth: true, expose: true, method: "PUT", path: "/rbac/roles/:role_id/permissions" },
  async (req) => {
    const auth = getAuthData()!;

    // Check if user can manage roles
    if (!auth.permissions.includes('roles.manage')) {
      throw APIError.forbidden("Access denied to manage role permissions");
    }

    // Validate role exists
    const role = await db.queryRow`
      SELECT id FROM roles WHERE id = ${req.role_id}
    `;

    if (!role) {
      throw APIError.notFound("Role not found");
    }

    // Validate permissions exist
    if (req.permission_ids.length > 0) {
      const permissionCount = await db.queryRow`
        SELECT COUNT(*) as count FROM permissions WHERE id = ANY(${req.permission_ids})
      `;

      if (permissionCount?.count !== req.permission_ids.length) {
        throw APIError.badRequest("Some permissions do not exist");
      }
    }

    // Remove existing permissions
    await db.exec`
      DELETE FROM role_permissions WHERE role_id = ${req.role_id}
    `;

    // Assign new permissions
    if (req.permission_ids.length > 0) {
      for (const permissionId of req.permission_ids) {
        await db.exec`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES (${req.role_id}, ${permissionId})
        `;
      }
    }
  }
);