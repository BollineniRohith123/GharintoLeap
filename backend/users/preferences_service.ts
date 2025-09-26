import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface UserPreferences {
  id: number;
  user_id: number;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

interface UpdatePreferencesRequest {
  email_notifications?: boolean;
  push_notifications?: boolean;
  sms_notifications?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;
}

interface NotificationPreferences {
  project_updates: boolean;
  payment_reminders: boolean;
  marketing_emails: boolean;
  system_alerts: boolean;
  weekly_digest: boolean;
}

interface UpdateNotificationPreferencesRequest {
  project_updates?: boolean;
  payment_reminders?: boolean;
  marketing_emails?: boolean;
  system_alerts?: boolean;
  weekly_digest?: boolean;
}

// Get user preferences
export const getUserPreferences = api<{ user_id?: number }, UserPreferences>(
  { auth: true, expose: true, method: "GET", path: "/users/preferences" },
  async ({ user_id }) => {
    const auth = getAuthData()!;
    
    const targetUserId = user_id || parseInt(auth.userID);
    
    // Check permissions
    if (targetUserId !== parseInt(auth.userID) && !auth.permissions.includes('users.admin')) {
      throw APIError.forbidden("Insufficient permissions to view user preferences");
    }

    try {
      // Get or create user preferences
      let preferences = await db.queryRow<UserPreferences>`
        SELECT * FROM user_preferences WHERE user_id = ${targetUserId}
      `;

      if (!preferences) {
        // Create default preferences
        preferences = await db.queryRow<UserPreferences>`
          INSERT INTO user_preferences (user_id)
          VALUES (${targetUserId})
          RETURNING *
        `;
      }

      return preferences;

    } catch (error) {
      console.error('Get user preferences error:', error);
      throw APIError.internal("Failed to fetch user preferences");
    }
  }
);

// Update user preferences
export const updateUserPreferences = api<UpdatePreferencesRequest, UserPreferences>(
  { auth: true, expose: true, method: "PUT", path: "/users/preferences" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Validate theme if provided
    if (req.theme && !['light', 'dark', 'auto'].includes(req.theme)) {
      throw APIError.badRequest("Invalid theme. Must be 'light', 'dark', or 'auto'");
    }

    // Validate language if provided
    if (req.language && !/^[a-z]{2}(-[A-Z]{2})?$/.test(req.language)) {
      throw APIError.badRequest("Invalid language format. Use ISO 639-1 format (e.g., 'en', 'en-US')");
    }

    try {
      // Get existing preferences
      const existingPreferences = await db.queryRow<UserPreferences>`
        SELECT * FROM user_preferences WHERE user_id = ${auth.userID}
      `;

      let preferences: UserPreferences;

      if (existingPreferences) {
        // Update existing preferences
        preferences = await db.queryRow<UserPreferences>`
          UPDATE user_preferences SET
            email_notifications = COALESCE(${req.email_notifications}, email_notifications),
            push_notifications = COALESCE(${req.push_notifications}, push_notifications),
            sms_notifications = COALESCE(${req.sms_notifications}, sms_notifications),
            theme = COALESCE(${req.theme}, theme),
            language = COALESCE(${req.language}, language),
            timezone = COALESCE(${req.timezone}, timezone),
            updated_at = NOW()
          WHERE user_id = ${auth.userID}
          RETURNING *
        `;
      } else {
        // Create new preferences
        preferences = await db.queryRow<UserPreferences>`
          INSERT INTO user_preferences (
            user_id, email_notifications, push_notifications, sms_notifications,
            theme, language, timezone
          ) VALUES (
            ${auth.userID}, 
            ${req.email_notifications !== undefined ? req.email_notifications : true},
            ${req.push_notifications !== undefined ? req.push_notifications : true},
            ${req.sms_notifications !== undefined ? req.sms_notifications : false},
            ${req.theme || 'light'},
            ${req.language || 'en'},
            ${req.timezone || 'Asia/Kolkata'}
          )
          RETURNING *
        `;
      }

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'update', 'user_preferences', ${preferences.id}, ${JSON.stringify(existingPreferences)}, ${JSON.stringify(preferences)})
      `;

      return preferences;

    } catch (error) {
      console.error('Update user preferences error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update user preferences");
    }
  }
);

// Get notification preferences (detailed)
export const getNotificationPreferences = api<{}, NotificationPreferences>(
  { auth: true, expose: true, method: "GET", path: "/users/preferences/notifications" },
  async () => {
    const auth = getAuthData()!;
    
    try {
      // Get user preferences from system settings or user-specific table
      const preferences = await db.queryRow`
        SELECT 
          COALESCE(up.email_notifications, true) as email_notifications,
          COALESCE(up.push_notifications, true) as push_notifications,
          COALESCE(up.sms_notifications, false) as sms_notifications
        FROM users u
        LEFT JOIN user_preferences up ON u.id = up.user_id
        WHERE u.id = ${auth.userID}
      `;

      // For now, return default notification preferences
      // In a real implementation, you might have a separate table for detailed notification preferences
      return {
        project_updates: preferences?.email_notifications || true,
        payment_reminders: preferences?.email_notifications || true,
        marketing_emails: false, // Usually opt-in
        system_alerts: preferences?.push_notifications || true,
        weekly_digest: preferences?.email_notifications || true
      };

    } catch (error) {
      console.error('Get notification preferences error:', error);
      throw APIError.internal("Failed to fetch notification preferences");
    }
  }
);

// Update notification preferences (detailed)
export const updateNotificationPreferences = api<UpdateNotificationPreferencesRequest, { success: boolean; preferences: NotificationPreferences }>(
  { auth: true, expose: true, method: "PUT", path: "/users/preferences/notifications" },
  async (req) => {
    const auth = getAuthData()!;
    
    try {
      // For now, we'll store these in the audit log as user preferences
      // In a real implementation, you might create a separate notification_preferences table
      
      // Update basic notification settings based on detailed preferences
      const emailNotifications = req.project_updates || req.payment_reminders || req.marketing_emails || req.weekly_digest;
      const pushNotifications = req.system_alerts;

      await db.exec`
        INSERT INTO user_preferences (user_id, email_notifications, push_notifications, updated_at)
        VALUES (${auth.userID}, ${emailNotifications}, ${pushNotifications}, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          email_notifications = ${emailNotifications},
          push_notifications = ${pushNotifications},
          updated_at = NOW()
      `;

      // Log detailed preferences
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'update', 'notification_preferences', 0, ${JSON.stringify(req)})
      `;

      const updatedPreferences: NotificationPreferences = {
        project_updates: req.project_updates !== undefined ? req.project_updates : true,
        payment_reminders: req.payment_reminders !== undefined ? req.payment_reminders : true,
        marketing_emails: req.marketing_emails !== undefined ? req.marketing_emails : false,
        system_alerts: req.system_alerts !== undefined ? req.system_alerts : true,
        weekly_digest: req.weekly_digest !== undefined ? req.weekly_digest : true
      };

      return {
        success: true,
        preferences: updatedPreferences
      };

    } catch (error) {
      console.error('Update notification preferences error:', error);
      throw APIError.internal("Failed to update notification preferences");
    }
  }
);

// Get available timezones
export const getAvailableTimezones = api<{}, { timezones: { value: string; label: string; offset: string }[] }>(
  { auth: true, expose: true, method: "GET", path: "/users/preferences/timezones" },
  async () => {
    // Common timezones for Indian users
    const timezones = [
      { value: 'Asia/Kolkata', label: 'India Standard Time (IST)', offset: '+05:30' },
      { value: 'UTC', label: 'Coordinated Universal Time (UTC)', offset: '+00:00' },
      { value: 'America/New_York', label: 'Eastern Time (ET)', offset: '-05:00' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: '-08:00' },
      { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', offset: '+00:00' },
      { value: 'Europe/Paris', label: 'Central European Time (CET)', offset: '+01:00' },
      { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)', offset: '+04:00' },
      { value: 'Asia/Singapore', label: 'Singapore Standard Time (SGT)', offset: '+08:00' },
      { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: '+09:00' },
      { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)', offset: '+10:00' }
    ];

    return { timezones };
  }
);

// Get available languages
export const getAvailableLanguages = api<{}, { languages: { value: string; label: string; native_label: string }[] }>(
  { auth: true, expose: true, method: "GET", path: "/users/preferences/languages" },
  async () => {
    const languages = [
      { value: 'en', label: 'English', native_label: 'English' },
      { value: 'hi', label: 'Hindi', native_label: 'हिन्दी' },
      { value: 'bn', label: 'Bengali', native_label: 'বাংলা' },
      { value: 'te', label: 'Telugu', native_label: 'తెలుగు' },
      { value: 'mr', label: 'Marathi', native_label: 'मराठी' },
      { value: 'ta', label: 'Tamil', native_label: 'தமிழ்' },
      { value: 'gu', label: 'Gujarati', native_label: 'ગુજરાતી' },
      { value: 'kn', label: 'Kannada', native_label: 'ಕನ್ನಡ' },
      { value: 'ml', label: 'Malayalam', native_label: 'മലയാളം' },
      { value: 'pa', label: 'Punjabi', native_label: 'ਪੰਜਾਬੀ' }
    ];

    return { languages };
  }
);

// Reset preferences to default
export const resetPreferencesToDefault = api<{}, UserPreferences>(
  { auth: true, expose: true, method: "POST", path: "/users/preferences/reset" },
  async () => {
    const auth = getAuthData()!;
    
    try {
      // Get existing preferences for logging
      const existingPreferences = await db.queryRow<UserPreferences>`
        SELECT * FROM user_preferences WHERE user_id = ${auth.userID}
      `;

      // Reset to default preferences
      const preferences = await db.queryRow<UserPreferences>`
        INSERT INTO user_preferences (
          user_id, email_notifications, push_notifications, sms_notifications,
          theme, language, timezone
        ) VALUES (
          ${auth.userID}, true, true, false, 'light', 'en', 'Asia/Kolkata'
        )
        ON CONFLICT (user_id) DO UPDATE SET
          email_notifications = true,
          push_notifications = true,
          sms_notifications = false,
          theme = 'light',
          language = 'en',
          timezone = 'Asia/Kolkata',
          updated_at = NOW()
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'reset', 'user_preferences', ${preferences.id}, ${JSON.stringify(existingPreferences)}, ${JSON.stringify(preferences)})
      `;

      return preferences;

    } catch (error) {
      console.error('Reset preferences error:', error);
      throw APIError.internal("Failed to reset preferences");
    }
  }
);

// Export user preferences (GDPR compliance)
export const exportUserPreferences = api<{}, { preferences: any; export_date: string }>(
  { auth: true, expose: true, method: "GET", path: "/users/preferences/export" },
  async () => {
    const auth = getAuthData()!;
    
    try {
      // Get user preferences
      const preferences = await db.queryRow`
        SELECT * FROM user_preferences WHERE user_id = ${auth.userID}
      `;

      // Get notification preferences from audit logs
      const notificationPrefsQuery = db.query`
        SELECT new_values, created_at
        FROM audit_logs 
        WHERE user_id = ${auth.userID} 
        AND action = 'update' 
        AND entity_type = 'notification_preferences'
        ORDER BY created_at DESC
        LIMIT 1
      `;

      let notificationPreferences = {};
      for await (const row of notificationPrefsQuery) {
        try {
          notificationPreferences = JSON.parse(row.new_values);
        } catch (e) {
          // Ignore parsing errors
        }
        break;
      }

      const exportData = {
        basic_preferences: preferences || {},
        notification_preferences: notificationPreferences,
        user_id: parseInt(auth.userID),
        export_date: new Date().toISOString()
      };

      // Log export activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'export', 'user_preferences', 0, '{"exported_at": "${new Date().toISOString()}"}')
      `;

      return {
        preferences: exportData,
        export_date: new Date().toISOString()
      };

    } catch (error) {
      console.error('Export user preferences error:', error);
      throw APIError.internal("Failed to export user preferences");
    }
  }
);

// Get preferences statistics (admin)
export const getPreferencesStatistics = api<{}, { 
  total_users: number;
  email_notifications_enabled: number;
  push_notifications_enabled: number;
  sms_notifications_enabled: number;
  theme_distribution: any[];
  language_distribution: any[];
  timezone_distribution: any[];
}>(
  { auth: true, expose: true, method: "GET", path: "/admin/preferences/statistics" },
  async () => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('users.admin') && !auth.permissions.includes('analytics.view')) {
      throw APIError.forbidden("Insufficient permissions to view preferences statistics");
    }

    try {
      // Get overall statistics
      const overallStats = await db.queryRow`
        SELECT 
          COUNT(DISTINCT u.id) as total_users,
          COUNT(*) FILTER (WHERE COALESCE(up.email_notifications, true) = true) as email_notifications_enabled,
          COUNT(*) FILTER (WHERE COALESCE(up.push_notifications, true) = true) as push_notifications_enabled,
          COUNT(*) FILTER (WHERE COALESCE(up.sms_notifications, false) = true) as sms_notifications_enabled
        FROM users u
        LEFT JOIN user_preferences up ON u.id = up.user_id
        WHERE u.is_active = true
      `;

      // Get theme distribution
      const themeQuery = db.query`
        SELECT 
          COALESCE(theme, 'light') as theme,
          COUNT(*) as count
        FROM users u
        LEFT JOIN user_preferences up ON u.id = up.user_id
        WHERE u.is_active = true
        GROUP BY COALESCE(theme, 'light')
        ORDER BY count DESC
      `;

      const themeDistribution: any[] = [];
      for await (const row of themeQuery) {
        themeDistribution.push({
          theme: row.theme,
          count: parseInt(row.count || '0')
        });
      }

      // Get language distribution
      const languageQuery = db.query`
        SELECT 
          COALESCE(language, 'en') as language,
          COUNT(*) as count
        FROM users u
        LEFT JOIN user_preferences up ON u.id = up.user_id
        WHERE u.is_active = true
        GROUP BY COALESCE(language, 'en')
        ORDER BY count DESC
      `;

      const languageDistribution: any[] = [];
      for await (const row of languageQuery) {
        languageDistribution.push({
          language: row.language,
          count: parseInt(row.count || '0')
        });
      }

      // Get timezone distribution
      const timezoneQuery = db.query`
        SELECT 
          COALESCE(timezone, 'Asia/Kolkata') as timezone,
          COUNT(*) as count
        FROM users u
        LEFT JOIN user_preferences up ON u.id = up.user_id
        WHERE u.is_active = true
        GROUP BY COALESCE(timezone, 'Asia/Kolkata')
        ORDER BY count DESC
        LIMIT 10
      `;

      const timezoneDistribution: any[] = [];
      for await (const row of timezoneQuery) {
        timezoneDistribution.push({
          timezone: row.timezone,
          count: parseInt(row.count || '0')
        });
      }

      return {
        total_users: parseInt(overallStats?.total_users || '0'),
        email_notifications_enabled: parseInt(overallStats?.email_notifications_enabled || '0'),
        push_notifications_enabled: parseInt(overallStats?.push_notifications_enabled || '0'),
        sms_notifications_enabled: parseInt(overallStats?.sms_notifications_enabled || '0'),
        theme_distribution: themeDistribution,
        language_distribution: languageDistribution,
        timezone_distribution: timezoneDistribution
      };

    } catch (error) {
      console.error('Get preferences statistics error:', error);
      throw APIError.internal("Failed to fetch preferences statistics");
    }
  }
);
