import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

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
}

export interface UserMenuResponse {
  menus: MenuItem[];
}

// Get user's accessible menus based on their roles
export const getUserMenus = api(
  { method: "GET", path: "/menus/user", expose: true, auth: true },
  async (): Promise<UserMenuResponse> => {
    const auth = getAuthData()!;

    const menusQuery = db.query`
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
      INNER JOIN role_menus rm ON m.id = rm.menu_id
      INNER JOIN user_roles ur ON rm.role_id = ur.role_id
      WHERE ur.user_id = ${auth.userID}
      AND m.is_active = true 
      AND rm.can_view = true
      ORDER BY m.sort_order, m.display_name
    `;

    // Build hierarchical menu structure
    const menuMap = new Map<number, MenuItem>();
    const rootMenus: MenuItem[] = [];

    // First pass: create all menu items
    for await (const row of menusQuery) {
      const menuItem: MenuItem = {
        id: row.id,
        name: row.name,
        display_name: row.display_name,
        icon: row.icon,
        path: row.path,
        parent_id: row.parent_id,
        sort_order: row.sort_order,
        is_active: row.is_active,
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
  }
);