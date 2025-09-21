import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

interface UserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  state?: string;
  avatarUrl?: string;
  roles: string[];
  menus: Array<{
    name: string;
    displayName: string;
    icon?: string;
    path?: string;
    children?: Array<{
      name: string;
      displayName: string;
      path?: string;
    }>;
  }>;
}

// Gets the current user's profile and menu access
export const getProfile = api<void, UserProfile>(
  { auth: true, expose: true, method: "GET", path: "/users/profile" },
  async () => {
    const auth = getAuthData()!;
    
    const profile = await db.queryRow`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.city,
        u.state,
        u.avatar_url,
        array_agg(DISTINCT r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = ${auth.userID}
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.city, u.state, u.avatar_url
    `;

    if (!profile) {
      throw APIError.notFound("User not found");
    }

    // Get accessible menus
    const menuRows = await db.queryAll`
      SELECT DISTINCT
        m.name,
        m.display_name,
        m.icon,
        m.path,
        m.parent_id,
        m.sort_order
      FROM menus m
      JOIN role_menus rm ON m.id = rm.menu_id
      JOIN roles r ON rm.role_id = r.id
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ${auth.userID} AND m.is_active = true AND rm.can_view = true
      ORDER BY m.sort_order, m.display_name
    `;

    // Build menu hierarchy
    const menuMap = new Map();
    const menus: any[] = [];

    menuRows.forEach(row => {
      const menu = {
        name: row.name,
        displayName: row.display_name,
        icon: row.icon,
        path: row.path,
        children: []
      };
      
      menuMap.set(row.name, menu);
      
      if (!row.parent_id) {
        menus.push(menu);
      }
    });

    // Add child menus
    menuRows.forEach(row => {
      if (row.parent_id) {
        const parent = Array.from(menuMap.values()).find((m: any) => m.name === row.parent_id);
        if (parent) {
          parent.children.push(menuMap.get(row.name));
        }
      }
    });

    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      phone: profile.phone,
      city: profile.city,
      state: profile.state,
      avatarUrl: profile.avatar_url,
      roles: profile.roles || [],
      menus
    };
  }
);
