import { api, APIError } from "encore.dev/api";
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

// Authenticates a user and returns a JWT token
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    const user = await db.queryRow`
      SELECT 
        u.id,
        u.email,
        u.password_hash,
        u.first_name,
        u.last_name,
        u.is_active,
        array_agg(DISTINCT r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.email = ${req.email}
      GROUP BY u.id, u.email, u.password_hash, u.first_name, u.last_name, u.is_active
    `;

    if (!user || !user.is_active) {
      throw APIError.unauthenticated("Invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(req.password, user.password_hash);
    if (!isValidPassword) {
      throw APIError.unauthenticated("Invalid credentials");
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret(),
      { expiresIn: "7d" }
    );

    // Log the login event
    await db.exec`
      INSERT INTO analytics_events (event_type, user_id, properties, created_at)
      VALUES ('user_login', ${user.id}, '{"method": "email"}', NOW())
    `;

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: user.roles || []
      }
    };
  }
);
