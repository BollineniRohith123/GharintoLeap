import { api } from "encore.dev/api";
import db from "../db";
import * as bcrypt from "bcryptjs";
import { APIError } from "encore.dev/api";

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'homeowner' | 'interior_designer' | 'vendor';
  profileData?: {
    cityId?: number;
    businessName?: string;
    companyName?: string;
    specializations?: string[];
    services?: string[];
  };
}

export interface RegisterResponse {
  success: boolean;
  userId: string;
}

// Registers a new user with the specified role.
export const register = api<RegisterRequest, RegisterResponse>(
  { expose: true, method: "POST", path: "/auth/register" },
  async (req) => {
    // Check if user already exists
    const existingUser = await db.queryRow<{ id: number }>`
      SELECT id FROM users WHERE email = ${req.email}
    `;

    if (existingUser) {
      throw APIError.alreadyExists("user with this email already exists");
    }

    const passwordHash = await bcrypt.hash(req.password, 12);

    await db.exec`BEGIN`;
    
    try {
      // Create user
      const user = await db.queryRow<{ id: number }>`
        INSERT INTO users (email, password_hash, first_name, last_name, phone)
        VALUES (${req.email}, ${passwordHash}, ${req.firstName}, ${req.lastName}, ${req.phone})
        RETURNING id
      `;

      if (!user) {
        throw new Error("Failed to create user");
      }

      // Get role ID
      const role = await db.queryRow<{ id: number }>`
        SELECT id FROM roles WHERE name = ${req.role}
      `;

      if (!role) {
        throw APIError.invalidArgument("invalid role");
      }

      // Assign role
      await db.exec`
        INSERT INTO user_roles (user_id, role_id)
        VALUES (${user.id}, ${role.id})
      `;

      // Create profile based on role
      if (req.role === 'homeowner') {
        await db.exec`
          INSERT INTO homeowner_profiles (user_id, city_id)
          VALUES (${user.id}, ${req.profileData?.cityId})
        `;
      } else if (req.role === 'interior_designer') {
        await db.exec`
          INSERT INTO designer_profiles (user_id, city_id, business_name, specializations)
          VALUES (${user.id}, ${req.profileData?.cityId}, ${req.profileData?.businessName}, ${req.profileData?.specializations})
        `;
      } else if (req.role === 'vendor') {
        await db.exec`
          INSERT INTO vendor_profiles (user_id, city_id, company_name, services)
          VALUES (${user.id}, ${req.profileData?.cityId}, ${req.profileData?.companyName}, ${req.profileData?.services})
        `;
      }

      // Create wallet for the user
      await db.exec`
        INSERT INTO wallets (user_id, balance)
        VALUES (${user.id}, 0)
      `;

      await db.exec`COMMIT`;

      return {
        success: true,
        userId: user.id.toString()
      };
    } catch (error) {
      await db.exec`ROLLBACK`;
      throw error;
    }
  }
);
