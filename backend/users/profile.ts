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
  country: string;
  isActive: boolean;
  emailVerified: boolean;
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
  createdAt: string;
  updatedAt: string;
}

interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  state?: string;
  avatarUrl?: string;
}

interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  theme: string;
  language: string;
  timezone: string;
}

export const getProfile = api(
  { method: "GET", path: "/users/profile", expose: true, auth: true },
  async (): Promise<UserProfile> => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Get user details
    const user = await db.queryRow`
      SELECT 
        id, email, first_name, last_name, phone, city, avatar_url
      FROM users 
      WHERE id = ${userId} AND is_active = true
    `;

    if (!user) {
      throw new Error("User not found");
    }

    // Get user roles
    const rolesQuery = db.query`
      SELECT r.name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ${userId}
    `;

    const roles: string[] = [];
    for await (const role of rolesQuery) {
      roles.push(role.name);
    }

    // Get user menus
    const menusQuery = db.query`
      SELECT DISTINCT 
        m.name,
        m.display_name,
        m.icon,
        m.path,
        m.parent_id,
        m.sort_order
      FROM menus m
      INNER JOIN role_menus rm ON m.id = rm.menu_id
      INNER JOIN user_roles ur ON rm.role_id = ur.role_id
      WHERE ur.user_id = ${userId}
      AND m.is_active = true 
      AND rm.can_view = true
      ORDER BY m.sort_order, m.display_name
    `;

    const menuMap = new Map();
    const rootMenus: any[] = [];

    for await (const menu of menusQuery) {
      const menuItem = {
        name: menu.name,
        displayName: menu.display_name,
        icon: menu.icon,
        path: menu.path,
        children: []
      };
      
      menuMap.set(menu.name, menuItem);
      
      if (!menu.parent_id) {
        rootMenus.push(menuItem);
      }
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      city: user.city,
      avatarUrl: user.avatar_url,
      roles,
      menus: rootMenus
    };
  }
);