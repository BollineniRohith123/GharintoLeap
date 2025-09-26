import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import db from "../db";

interface RequestPasswordResetRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

interface PasswordResetToken {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  used_at?: Date;
  created_at: Date;
}

// Generate secure random token
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Validate password strength
function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Request password reset
export const requestPasswordReset = api<RequestPasswordResetRequest, { success: boolean; message: string }>(
  { expose: true, method: "POST", path: "/auth/password-reset/request" },
  async (req) => {
    // Validate email
    if (!req.email || !req.email.includes('@')) {
      throw APIError.badRequest("Valid email address is required");
    }

    try {
      // Find user by email
      const user = await db.queryRow`
        SELECT id, email, first_name, last_name, is_active 
        FROM users 
        WHERE email = ${req.email.toLowerCase().trim()}
      `;

      // Always return success to prevent email enumeration attacks
      if (!user || !user.is_active) {
        return {
          success: true,
          message: "If an account with this email exists, a password reset link has been sent."
        };
      }

      // Invalidate any existing tokens for this user
      await db.exec`
        UPDATE password_reset_tokens 
        SET used_at = NOW() 
        WHERE user_id = ${user.id} AND used_at IS NULL
      `;

      // Generate new reset token
      const resetToken = generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store reset token
      await db.exec`
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES (${user.id}, ${resetToken}, ${expiresAt})
      `;

      // TODO: Send email with reset link
      // In a real implementation, you would send an email here
      // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      // await emailService.sendPasswordResetEmail(user.email, user.first_name, resetLink);

      // Log the password reset request
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${user.id}, 'password_reset_requested', 'user', ${user.id}, '{"email": "${user.email}"}')
      `;

      return {
        success: true,
        message: "If an account with this email exists, a password reset link has been sent."
      };

    } catch (error) {
      console.error('Password reset request error:', error);
      throw APIError.internal("Failed to process password reset request");
    }
  }
);

// Reset password using token
export const resetPassword = api<ResetPasswordRequest, { success: boolean; message: string }>(
  { expose: true, method: "POST", path: "/auth/password-reset/confirm" },
  async (req) => {
    // Validate inputs
    if (!req.token || !req.new_password) {
      throw APIError.badRequest("Token and new password are required");
    }

    // Validate password strength
    const passwordValidation = validatePassword(req.new_password);
    if (!passwordValidation.isValid) {
      throw APIError.badRequest(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    try {
      // Find valid reset token
      const resetToken = await db.queryRow<PasswordResetToken>`
        SELECT prt.*, u.email, u.is_active
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = ${req.token}
        AND prt.expires_at > NOW()
        AND prt.used_at IS NULL
        AND u.is_active = true
      `;

      if (!resetToken) {
        throw APIError.badRequest("Invalid or expired reset token");
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(req.new_password, saltRounds);

      // Update user password
      await db.exec`
        UPDATE users 
        SET password_hash = ${hashedPassword}, updated_at = NOW()
        WHERE id = ${resetToken.user_id}
      `;

      // Mark token as used
      await db.exec`
        UPDATE password_reset_tokens 
        SET used_at = NOW()
        WHERE id = ${resetToken.id}
      `;

      // Log the password reset
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${resetToken.user_id}, 'password_reset_completed', 'user', ${resetToken.user_id}, '{"reset_token_id": ${resetToken.id}}')
      `;

      return {
        success: true,
        message: "Password has been reset successfully. You can now log in with your new password."
      };

    } catch (error) {
      console.error('Password reset error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to reset password");
    }
  }
);

// Change password (authenticated user)
export const changePassword = api<ChangePasswordRequest, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "POST", path: "/users/change-password" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Validate inputs
    if (!req.current_password || !req.new_password) {
      throw APIError.badRequest("Current password and new password are required");
    }

    // Validate new password strength
    const passwordValidation = validatePassword(req.new_password);
    if (!passwordValidation.isValid) {
      throw APIError.badRequest(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if new password is different from current
    if (req.current_password === req.new_password) {
      throw APIError.badRequest("New password must be different from current password");
    }

    try {
      // Get user's current password hash
      const user = await db.queryRow`
        SELECT id, password_hash, email
        FROM users 
        WHERE id = ${auth.userID} AND is_active = true
      `;

      if (!user) {
        throw APIError.notFound("User not found");
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(req.current_password, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw APIError.badRequest("Current password is incorrect");
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(req.new_password, saltRounds);

      // Update password
      await db.exec`
        UPDATE users 
        SET password_hash = ${hashedNewPassword}, updated_at = NOW()
        WHERE id = ${auth.userID}
      `;

      // Log the password change
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'password_changed', 'user', ${auth.userID}, '{"changed_at": "${new Date().toISOString()}"}')
      `;

      return {
        success: true,
        message: "Password changed successfully"
      };

    } catch (error) {
      console.error('Change password error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to change password");
    }
  }
);

// Validate reset token (check if token is valid without using it)
export const validateResetToken = api<{ token: string }, { valid: boolean; expires_at?: Date }>(
  { expose: true, method: "GET", path: "/auth/password-reset/validate" },
  async ({ token }) => {
    if (!token) {
      throw APIError.badRequest("Token is required");
    }

    try {
      const resetToken = await db.queryRow<PasswordResetToken>`
        SELECT prt.expires_at, u.is_active
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = ${token}
        AND prt.used_at IS NULL
        AND u.is_active = true
      `;

      if (!resetToken) {
        return { valid: false };
      }

      const isExpired = new Date(resetToken.expires_at) < new Date();
      
      return {
        valid: !isExpired,
        expires_at: resetToken.expires_at
      };

    } catch (error) {
      console.error('Validate reset token error:', error);
      throw APIError.internal("Failed to validate reset token");
    }
  }
);

// Get password reset history (admin only)
export const getPasswordResetHistory = api<{ user_id?: number }, { resets: any[] }>(
  { auth: true, expose: true, method: "GET", path: "/admin/password-reset-history" },
  async ({ user_id }) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('users.admin') && !auth.permissions.includes('security.view')) {
      throw APIError.forbidden("Insufficient permissions to view password reset history");
    }

    try {
      let whereClause = "WHERE 1=1";
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (user_id) {
        whereClause += ` AND prt.user_id = $${paramIndex}`;
        queryParams.push(user_id);
        paramIndex++;
      }

      const historyQuery = `
        SELECT 
          prt.id,
          prt.user_id,
          u.email,
          u.first_name || ' ' || u.last_name as user_name,
          prt.created_at as requested_at,
          prt.used_at as completed_at,
          prt.expires_at,
          CASE 
            WHEN prt.used_at IS NOT NULL THEN 'completed'
            WHEN prt.expires_at < NOW() THEN 'expired'
            ELSE 'pending'
          END as status
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        ${whereClause}
        ORDER BY prt.created_at DESC
        LIMIT 100
      `;

      const historyResult = await db.query(historyQuery, ...queryParams);
      const resets: any[] = [];

      for await (const row of historyResult) {
        resets.push({
          id: row.id,
          user_id: row.user_id,
          email: row.email,
          user_name: row.user_name,
          requested_at: row.requested_at,
          completed_at: row.completed_at,
          expires_at: row.expires_at,
          status: row.status
        });
      }

      return { resets };

    } catch (error) {
      console.error('Get password reset history error:', error);
      throw APIError.internal("Failed to fetch password reset history");
    }
  }
);

// Clean up expired tokens (maintenance endpoint)
export const cleanupExpiredTokens = api<{}, { cleaned_count: number }>(
  { auth: true, expose: true, method: "POST", path: "/admin/cleanup-expired-tokens" },
  async () => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('system.admin')) {
      throw APIError.forbidden("Insufficient permissions to perform system maintenance");
    }

    try {
      // Delete expired tokens older than 24 hours
      const result = await db.queryRow`
        DELETE FROM password_reset_tokens 
        WHERE expires_at < NOW() - INTERVAL '24 hours'
        RETURNING COUNT(*) as cleaned_count
      `;

      const cleanedCount = parseInt(result?.cleaned_count || '0');

      // Log the cleanup
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'cleanup_expired_tokens', 'system', 0, '{"cleaned_count": ${cleanedCount}}')
      `;

      return { cleaned_count: cleanedCount };

    } catch (error) {
      console.error('Cleanup expired tokens error:', error);
      throw APIError.internal("Failed to cleanup expired tokens");
    }
  }
);
