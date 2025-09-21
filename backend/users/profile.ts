import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  roles: string[];
  profileData?: any;
}

// Retrieves the current user's profile.
export const getProfile = api<void, UserProfile>(
  { auth: true, expose: true, method: "GET", path: "/users/profile" },
  async () => {
    const auth = getAuthData()!;
    
    const user = await db.queryRow<{
      id: number;
      email: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      avatar_url: string | null;
    }>`
      SELECT id, email, first_name, last_name, phone, avatar_url
      FROM users 
      WHERE id = ${auth.userID}
    `;

    if (!user) {
      throw new Error("User not found");
    }

    // Get profile data based on role
    let profileData = {};
    
    if (auth.roles && auth.roles.includes('homeowner')) {
      const profile = await db.queryRow`
        SELECT hp.*, c.name as city_name
        FROM homeowner_profiles hp
        LEFT JOIN cities c ON hp.city_id = c.id
        WHERE hp.user_id = ${user.id}
      `;
      profileData = profile || {};
    } else if (auth.roles && auth.roles.includes('interior_designer')) {
      const profile = await db.queryRow`
        SELECT dp.*, c.name as city_name
        FROM designer_profiles dp
        LEFT JOIN cities c ON dp.city_id = c.id
        WHERE dp.user_id = ${user.id}
      `;
      profileData = profile || {};
    } else if (auth.roles && auth.roles.includes('vendor')) {
      const profile = await db.queryRow`
        SELECT vp.*, c.name as city_name
        FROM vendor_profiles vp
        LEFT JOIN cities c ON vp.city_id = c.id
        WHERE vp.user_id = ${user.id}
      `;
      profileData = profile || {};
    }

    return {
      id: user.id.toString(),
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      roles: auth.roles || [],
      profileData
    };
  }
);
