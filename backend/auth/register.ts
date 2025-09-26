import { api, APIError } from "encore.dev/api";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { secret } from "encore.dev/config";
import db from "../db";
import { ValidationService, UserValidationRules } from "../common/validation";

const jwtSecret = secret("JWT_SECRET");

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  state?: string;
  userType: 'customer' | 'interior_designer' | 'vendor' | 'project_manager';
}

interface RegisterResponse {
  token: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
}

// Registers a new user account
export const register = api<RegisterRequest, RegisterResponse>(
  { expose: true, method: "POST", path: "/auth/register" },
  async (req) => {
    // Validate input
    const validationData = {
      email: req.email,
      first_name: req.firstName,
      last_name: req.lastName,
      password: req.password,
      phone: req.phone,
      city: req.city
    };
    ValidationService.validateAndThrow(validationData, UserValidationRules.create);

    // Check if user already exists
    const existingUser = await db.queryRow`
      SELECT id FROM users WHERE email = ${req.email.toLowerCase()}
    `;

    if (existingUser) {
      throw APIError.alreadyExists("User with this email already exists");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(req.password, 12);

    // Create user
    const user = await db.queryRow`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, city, country)
      VALUES (${req.email.toLowerCase()}, ${passwordHash}, ${req.firstName}, ${req.lastName}, ${req.phone}, ${req.city}, 'India')
      RETURNING id, email, first_name, last_name
    `;

    if (!user) {
      throw APIError.internal("Failed to create user");
    }

    // Assign role based on user type
    const role = await db.queryRow`
      SELECT id FROM roles WHERE name = ${req.userType}
    `;

    if (role) {
      await db.exec`
        INSERT INTO user_roles (user_id, role_id)
        VALUES (${user.id}, ${role.id})
      `;
    }

    // Create wallet for the user
    await db.exec`
      INSERT INTO wallets (user_id) VALUES (${user.id})
    `;

    // Create user preferences
    await db.exec`
      INSERT INTO user_preferences (user_id) VALUES (${user.id})
    `;

    // Generate JWT token
    const token = jwt.sign(
      { userID: user.id.toString(), email: user.email },
      jwtSecret(),
      { expiresIn: "7d" }
    );

    // Log the registration event
    await db.exec`
      INSERT INTO analytics_events (event_type, user_id, properties, created_at)
      VALUES ('user_registration', ${user.id}, ${JSON.stringify({ userType: req.userType })}, NOW())
    `;

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    };
  }
);
