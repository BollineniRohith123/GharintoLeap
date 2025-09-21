import { Header, Cookie, APIError, Gateway } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import jwt from "jsonwebtoken";
import { secret } from "encore.dev/config";
import db from "../db";

const jwtSecret = secret("JWT_SECRET");

interface AuthParams {
  authorization?: Header<"Authorization">;
  session?: Cookie<"session">;
}

export interface AuthData {
  userID: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export const auth = authHandler<AuthParams, AuthData>(
  async (params: AuthParams) => {
    const token = params.authorization?.replace("Bearer ", "") ?? params.session?.value;
    
    if (!token) {
      throw APIError.unauthenticated("Missing authentication token");
    }

    try {
      const decoded = jwt.verify(token, jwtSecret()) as any;
      
      // Get user with roles and permissions
      const user = await db.queryRow`
        SELECT 
          u.id,
          u.email,
          array_agg(DISTINCT r.name) as roles,
          array_agg(DISTINCT p.name) as permissions
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = ${decoded.userId} AND u.is_active = true
        GROUP BY u.id, u.email
      `;

      if (!user) {
        throw APIError.unauthenticated("Invalid token");
      }

      return {
        userID: user.id.toString(),
        email: user.email,
        roles: user.roles || [],
        permissions: user.permissions || []
      };
    } catch (error) {
      throw APIError.unauthenticated("Invalid token", error as Error);
    }
  }
);

// Configure the API gateway to use the auth handler
export const gw = new Gateway({ authHandler: auth });


