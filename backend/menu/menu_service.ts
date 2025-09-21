import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { AppError, withErrorHandling, safeAsync } from "../common/error_handler";

export interface MenuItem {
  id: number;
  name: string;
  display_name: string;
  icon?: string;
  path?: string;
  parent_id?: number;
  sort_order: number;
  is_active: boolean;
  children?: MenuItem[];
  can_view: boolean;
}

export interface CreateMenuRequest {
  name: string;
  display_name: string;
  icon?: string;
  path?: string;
  parent_id?: number;
  sort_order?: number;
  role_ids?: number[];
}

export interface UpdateMenuRequest {
  name?: string;
  display_name?: string;
  icon?: string;
  path?: string;
  parent_id?: number;
  sort_order?: number;
  is_active?: boolean;
  role_ids?: number[];
}

export interface UserMenuResponse {
  menus: MenuItem[];
}

// Get user's accessible menus based on their roles
export const getUserMenus = api(
  { method: "GET", path: "/menus/user", expose: true },
  withErrorHandling(async (): Promise<UserMenuResponse> => {
    const auth = getAuthData();
    if (!auth) throw AppError.unauthorized();

    const menus = await safeAsync(async () => {
      const result = await db.query(`
        SELECT DISTINCT 
          m.id,
          m.name,
          m.display_name,
          m.icon,
          m.path,
          m.parent_id,
          m.sort_order,
          m.is_active,
          rm.can_view
        FROM menus m
        INNER JOIN role_menus rm ON m.id = rm.menu_id
        INNER JOIN user_roles ur ON rm.role_id = ur.role_id
        WHERE ur.user_id = $1 
        AND m.is_active = true 
        AND rm.can_view = true
        ORDER BY m.sort_order, m.display_name
      `, [user.userID]);

      return result.rows;
    }, "fetch user menus");

    // Build hierarchical menu structure
    const menuMap = new Map<number, MenuItem>();
    const rootMenus: MenuItem[] = [];

    // First pass: create all menu items
    for (const row of menus) {
      const menuItem: MenuItem = {
        id: row.id,
        name: row.name,
        display_name: row.display_name,
        icon: row.icon,
        path: row.path,
        parent_id: row.parent_id,
        sort_order: row.sort_order,
        is_active: row.is_active,
        can_view: row.can_view,
        children: []
      };
      menuMap.set(row.id, menuItem);
    }

    // Second pass: build hierarchy
    for (const menuItem of menuMap.values()) {
      if (menuItem.parent_id) {
        const parent = menuMap.get(menuItem.parent_id);
        if (parent) {
          parent.children!.push(menuItem);
        }
      } else {
        rootMenus.push(menuItem);
      }
    }

    // Sort children for each parent
    const sortMenus = (menus: MenuItem[]) => {
      menus.sort((a, b) => a.sort_order - b.sort_order);
      menus.forEach(menu => {
        if (menu.children && menu.children.length > 0) {
          sortMenus(menu.children);
        }
      });
    };

    sortMenus(rootMenus);

    return { menus: rootMenus };
  })
);

// Get all menus (admin only)
export const getAllMenus = api(
  { method: "GET", path: "/menus", expose: true },
  withErrorHandling(async (): Promise<{ menus: MenuItem[] }> => {
    const auth = getAuthData();
    if (!auth) throw AppError.unauthorized();

    // Check if user has admin role
    const isAdmin = await safeAsync(async () => {
      const result = await db.query(`
        SELECT COUNT(*) as count 
        FROM user_roles ur 
        INNER JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = $1 AND r.name IN ('super_admin', 'admin')
      `, [auth.userID]);
      return parseInt(result.rows[0].count) > 0;
    }, "check admin access");

    if (!isAdmin) {
      throw AppError.forbidden("Admin access required");
    }

    const menus = await safeAsync(async () => {
      const result = await db.query(`
        SELECT 
          id,
          name,
          display_name,
          icon,
          path,
          parent_id,
          sort_order,
          is_active
        FROM menus
        ORDER BY sort_order, display_name
      `);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        display_name: row.display_name,
        icon: row.icon,
        path: row.path,
        parent_id: row.parent_id,
        sort_order: row.sort_order,
        is_active: row.is_active,
        can_view: true
      }));
    }, "fetch all menus");

    return { menus };
  })
);

// Create new menu (admin only)
export const createMenu = api(
  { method: "POST", path: "/menus", expose: true },
  withErrorHandling(async (req: CreateMenuRequest): Promise<MenuItem> => {
    const auth = getAuthData();
    if (!auth) throw AppError.unauthorized();

    // Check if user has admin role
    const isAdmin = await safeAsync(async () => {
      const result = await db.query(`
        SELECT COUNT(*) as count 
        FROM user_roles ur 
        INNER JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = $1 AND r.name IN ('super_admin', 'admin')
      `, [auth.userID]);
      return parseInt(result.rows[0].count) > 0;
    }, "check admin access");

    if (!isAdmin) {
      throw AppError.forbidden("Admin access required");
    }

    // Validate required fields
    if (!req.name || !req.display_name) {
      throw AppError.badRequest("Name and display_name are required");
    }

    // Check if parent exists
    if (req.parent_id) {
      const parentExists = await safeAsync(async () => {
        const result = await db.query("SELECT COUNT(*) as count FROM menus WHERE id = $1", [req.parent_id]);
        return parseInt(result.rows[0].count) > 0;
      }, "check parent menu");

      if (!parentExists) {
        throw AppError.notFound("Parent menu", req.parent_id);
      }
    }

    const menu = await safeAsync(async () => {
      const result = await db.query(`
        INSERT INTO menus (name, display_name, icon, path, parent_id, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        req.name,
        req.display_name,
        req.icon,
        req.path,
        req.parent_id,
        req.sort_order || 0
      ]);

      return result.rows[0];
    }, "create menu");

    // Assign to roles if specified
    if (req.role_ids && req.role_ids.length > 0) {
      await safeAsync(async () => {
        for (const roleId of req.role_ids) {
          await db.query(`
            INSERT INTO role_menus (role_id, menu_id, can_view)
            VALUES ($1, $2, $3)
            ON CONFLICT (role_id, menu_id) DO NOTHING
          `, [roleId, menu.id, true]);
        }
      }, "assign menu to roles");
    }

    return {
      id: menu.id,
      name: menu.name,
      display_name: menu.display_name,
      icon: menu.icon,
      path: menu.path,
      parent_id: menu.parent_id,
      sort_order: menu.sort_order,
      is_active: menu.is_active,
      can_view: true
    };
  })
);

// Update menu (admin only)
export const updateMenu = api<UpdateMenuRequest & { id: string }, MenuItem>(
  { method: "PUT", path: "/menus/:id", expose: true },
  withErrorHandling(async (req) => {
    const menuId = parseInt(req.id);
    const auth = getAuthData();
    if (!auth) throw AppError.unauthorized();

    // Check if user has admin role
    const isAdmin = await safeAsync(async () => {
      const result = await db.query(`
        SELECT COUNT(*) as count 
        FROM user_roles ur 
        INNER JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = $1 AND r.name IN ('super_admin', 'admin')
      `, [auth.userID]);
      return parseInt(result.rows[0].count) > 0;
    }, "check admin access");

    if (!isAdmin) {
      throw AppError.forbidden("Admin access required");
    }

    // Check if menu exists
    const menuExists = await safeAsync(async () => {
      const result = await db.query("SELECT COUNT(*) as count FROM menus WHERE id = $1", [menuId]);
      return parseInt(result.rows[0].count) > 0;
    }, "check menu existence");

    if (!menuExists) {
      throw AppError.notFound("Menu", menuId);
    }

    // Check if parent exists (if specified)
    if (req.parent_id) {
      const parentExists = await safeAsync(async () => {
        const result = await db.query("SELECT COUNT(*) as count FROM menus WHERE id = $1", [req.parent_id]);
        return parseInt(result.rows[0].count) > 0;
      }, "check parent menu");

      if (!parentExists) {
        throw AppError.notFound("Parent menu", req.parent_id);
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (req.name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(req.name);
      paramCount++;
    }

    if (req.display_name !== undefined) {
      updates.push(`display_name = $${paramCount}`);
      values.push(req.display_name);
      paramCount++;
    }

    if (req.icon !== undefined) {
      updates.push(`icon = $${paramCount}`);
      values.push(req.icon);
      paramCount++;
    }

    if (req.path !== undefined) {
      updates.push(`path = $${paramCount}`);
      values.push(req.path);
      paramCount++;
    }

    if (req.parent_id !== undefined) {
      updates.push(`parent_id = $${paramCount}`);
      values.push(req.parent_id);
      paramCount++;
    }

    if (req.sort_order !== undefined) {
      updates.push(`sort_order = $${paramCount}`);
      values.push(req.sort_order);
      paramCount++;
    }

    if (req.is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(req.is_active);
      paramCount++;
    }

    if (updates.length === 0) {
      throw AppError.badRequest("No fields to update");
    }

    values.push(menuId);
    const menu = await safeAsync(async () => {
      const result = await db.query(`
        UPDATE menus 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      return result.rows[0];
    }, "update menu");

    // Update role assignments if specified
    if (req.role_ids) {
      await safeAsync(async () => {
        // Remove existing assignments
        await db.query("DELETE FROM role_menus WHERE menu_id = $1", [menuId]);
        
        // Add new assignments
        for (const roleId of req.role_ids) {
          await db.query(`
            INSERT INTO role_menus (role_id, menu_id, can_view)
            VALUES ($1, $2, $3)
          `, [roleId, menuId, true]);
        }
      }, "update menu role assignments");
    }

    return {
      id: menu.id,
      name: menu.name,
      display_name: menu.display_name,
      icon: menu.icon,
      path: menu.path,
      parent_id: menu.parent_id,
      sort_order: menu.sort_order,
      is_active: menu.is_active,
      can_view: true
    };
  })
);

// Delete menu (admin only)
export const deleteMenu = api<{ id: string }, { success: boolean }>(
  { method: "DELETE", path: "/menus/:id", expose: true },
  withErrorHandling(async (req) => {
    const menuId = parseInt(req.id);
    const auth = getAuthData();
    if (!auth) throw AppError.unauthorized();

    // Check if user has admin role
    const isAdmin = await safeAsync(async () => {
      const result = await db.query(`
        SELECT COUNT(*) as count 
        FROM user_roles ur 
        INNER JOIN roles r ON ur.role_id = r.id 
        WHERE ur.user_id = $1 AND r.name IN ('super_admin', 'admin')
      `, [auth.userID]);
      return parseInt(result.rows[0].count) > 0;
    }, "check admin access");

    if (!isAdmin) {
      throw AppError.forbidden("Admin access required");
    }

    // Check if menu has children
    const hasChildren = await safeAsync(async () => {
      const result = await db.query("SELECT COUNT(*) as count FROM menus WHERE parent_id = $1", [menuId]);
      return parseInt(result.rows[0].count) > 0;
    }, "check menu children");

    if (hasChildren) {
      throw AppError.conflict("Cannot delete menu with child items");
    }

    await safeAsync(async () => {
      // Delete role assignments first
      await db.query("DELETE FROM role_menus WHERE menu_id = $1", [menuId]);
      
      // Delete the menu
      const result = await db.query("DELETE FROM menus WHERE id = $1", [menuId]);
      
      if (result.rowCount === 0) {
        throw AppError.notFound("Menu", menuId);
      }
    }, "delete menu");

    return { success: true };
  })
);