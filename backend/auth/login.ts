import { api, Cookie } from "encore.dev/api";
import { secret } from "encore.dev/config";
import db from "../db";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { APIError } from "encore.dev/api";

const jwtSecret = secret("JWTSecret");

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
  token: string;
  session: Cookie<"session">;
}

// Authenticates user login credentials.
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    const user = await db.queryRow<{
      id: number;
      email: string;
      password_hash: string;
      first_name: string;
      last_name: string;
      status: string;
    }>`
      SELECT id, email, password_hash, first_name, last_name, status
      FROM users 
      WHERE email = ${req.email} AND status = 'active'
    `;

    if (!user) {
      throw APIError.unauthenticated("invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(req.password, user.password_hash);
    if (!isValidPassword) {
      throw APIError.unauthenticated("invalid credentials");
    }

    // Get user roles
    const roles = await db.queryAll<{ name: string }>`
      SELECT r.name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ${user.id}
    `;

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret(),
      { expiresIn: "7d" }
    );

    return {
      user: {
        id: user.id.toString(),
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: roles.map(r => r.name)
      },
      token,
      session: {
        value: token,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        secure: true,
        sameSite: "Lax"
      }
    };
  }
);
