import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface MenuItem {
  id: string;
  name: string;
  icon: string | null;
  route: string | null;
  children?: MenuItem[];
}

export interface MenuResponse {
  items: MenuItem[];
}

// Retrieves navigation menu items based on user roles.
export const getMenu = api<void, MenuResponse>(
  { auth: true, expose: true, method: "GET", path: "/users/menu" },
  async () => {
    const auth = getAuthData()!;
    
    // Get menu items for user's roles
    const menuItems = await db.queryAll<{
      id: number;
      name: string;
      icon: string | null;
      route: string | null;
      parent_id: number | null;
      sort_order: number;
    }>`
      SELECT DISTINCT mi.id, mi.name, mi.icon, mi.route, mi.parent_id, mi.sort_order
      FROM menu_items mi
      JOIN role_menu_items rmi ON mi.id = rmi.menu_item_id
      JOIN roles r ON rmi.role_id = r.id
      WHERE r.name = ANY(${auth.roles}) AND mi.is_active = true
      ORDER BY mi.sort_order
    `;

    // Build hierarchical menu structure
    const menuMap = new Map<number, MenuItem>();
    const rootItems: MenuItem[] = [];

    // First pass: create all menu items
    for (const item of menuItems) {
      const menuItem: MenuItem = {
        id: item.id.toString(),
        name: item.name,
        icon: item.icon,
        route: item.route,
        children: []
      };
      
      menuMap.set(item.id, menuItem);
      
      if (!item.parent_id) {
        rootItems.push(menuItem);
      }
    }

    // Second pass: build parent-child relationships
    for (const item of menuItems) {
      if (item.parent_id) {
        const parent = menuMap.get(item.parent_id);
        const child = menuMap.get(item.id);
        if (parent && child) {
          parent.children!.push(child);
        }
      }
    }

    // Remove children array if empty
    const cleanMenu = (items: MenuItem[]): MenuItem[] => {
      return items.map(item => ({
        ...item,
        children: item.children && item.children.length > 0 
          ? cleanMenu(item.children) 
          : undefined
      }));
    };

    return {
      items: cleanMenu(rootItems)
    };
  }
);
