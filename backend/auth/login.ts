import { api } from "encore.dev/api";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { secret } from "encore.dev/config";
import db from "../db";

const jwtSecret = secret("JWT_SECRET");

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
}

// Simple login API - should work with CORS
export const login = api(
  { 
    expose: true, 
    method: "POST", 
    path: "/auth/login"
  },
  async (req: LoginRequest): Promise<LoginResponse> => {
    console.log('Login attempt for:', req.email);

    // Basic validation
    if (!req.email || !req.password) {
      throw new Error("Email and password are required");
    }

    try {
      // Get user with roles
      const user = await db.queryRow`
        SELECT 
          u.id,
          u.email,
          u.password_hash,
          u.first_name,
          u.last_name,
          u.is_active
        FROM users u
        WHERE u.email = ${req.email.toLowerCase().trim()}
      `;

      console.log('User found:', user ? 'Yes' : 'No');

      if (!user) {
        throw new Error("Invalid credentials");
      }

      if (!user.is_active) {
        throw new Error("Account is disabled");
      }

      // Check password
      const isValidPassword = await bcrypt.compare(req.password, user.password_hash);
      console.log('Password valid:', isValidPassword);

      if (!isValidPassword) {
        throw new Error("Invalid credentials");
      }

      // Get user roles
      const rolesResult = db.query`
        SELECT r.name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = ${user.id}
      `;

      const roles: string[] = [];
      for await (const role of rolesResult) {
        roles.push(role.name);
      }

      console.log('User roles:', roles);

      // Generate JWT token
      const token = jwt.sign(
        { 
          userID: user.id.toString(), // Encore expects userID as string
          email: user.email,
          roles: roles
        },
        jwtSecret(),
        { expiresIn: "7d" }
      );

      // Log the login event
      try {
        await db.exec`
          INSERT INTO analytics_events (event_type, user_id, properties, created_at)
          VALUES ('user_login', ${user.id}, '{"method": "email"}', NOW())
        `;
      } catch (logError) {
        console.warn('Failed to log analytics event:', logError);
      }

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          roles: roles
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error instanceof Error ? error.message : "Login failed");
    }
  }
);