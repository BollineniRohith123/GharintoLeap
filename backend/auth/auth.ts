import { Header, Cookie, APIError, Gateway } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";
import db from "../db";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

const jwtSecret = secret("JWTSecret");

interface AuthParams {
  authorization?: Header<"Authorization">;
  session?: Cookie<"session">;
}

export interface AuthData {
  userID: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

export const auth = authHandler<AuthParams, AuthData>(
  async (data: AuthParams) => {
    const token = data.authorization?.replace("Bearer ", "") ?? data.session?.value;
    if (!token) {
      throw APIError.unauthenticated("missing token");
    }

    try {
      const decoded = jwt.verify(token, jwtSecret()) as any;
      const userId = decoded.userId;

      const user = await db.queryRow<{
        id: number;
        email: string;
        first_name: string;
        last_name: string;
        status: string;
      }>`
        SELECT id, email, first_name, last_name, status
        FROM users 
        WHERE id = ${userId} AND status = 'active'
      `;

      if (!user) {
        throw APIError.unauthenticated("user not found or inactive");
      }

      // Get user roles and permissions
      const rolesAndPermissions = await db.queryAll<{
        role_name: string;
        permission_name: string;
      }>`
        SELECT r.name as role_name, p.name as permission_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = ${user.id}
      `;

      const roles = [...new Set(rolesAndPermissions.map(rp => rp.role_name))];
      const permissions = [...new Set(rolesAndPermissions
        .filter(rp => rp.permission_name)
        .map(rp => rp.permission_name))];

      return {
        userID: user.id.toString(),
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles,
        permissions
      };
    } catch (err) {
      throw APIError.unauthenticated("invalid token", err as Error);
    }
  }
);

export const gw = new Gateway({ authHandler: auth });


