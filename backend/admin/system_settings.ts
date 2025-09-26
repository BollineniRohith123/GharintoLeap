import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

interface CreateSettingRequest {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
  is_public?: boolean;
}

interface UpdateSettingRequest {
  value: string;
  description?: string;
  is_public?: boolean;
}

interface SettingListParams {
  category?: Query<string>;
  is_public?: Query<boolean>;
}

interface BulkUpdateRequest {
  settings: { key: string; value: string }[];
}

// Create system setting
export const createSystemSetting = api<CreateSettingRequest, SystemSetting>(
  { auth: true, expose: true, method: "POST", path: "/admin/settings" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('system.admin') && !auth.permissions.includes('settings.manage')) {
      throw APIError.forbidden("Insufficient permissions to create system settings");
    }

    // Validate required fields
    if (!req.key || !req.value || !req.category) {
      throw APIError.badRequest("Key, value, and category are required");
    }

    // Validate key format (alphanumeric with underscores and dots)
    if (!/^[a-zA-Z0-9_.]+$/.test(req.key)) {
      throw APIError.badRequest("Setting key can only contain letters, numbers, underscores, and dots");
    }

    // Validate value based on type
    if (req.type === 'number' && isNaN(Number(req.value))) {
      throw APIError.badRequest("Value must be a valid number for number type");
    }

    if (req.type === 'boolean' && !['true', 'false'].includes(req.value.toLowerCase())) {
      throw APIError.badRequest("Value must be 'true' or 'false' for boolean type");
    }

    if (req.type === 'json') {
      try {
        JSON.parse(req.value);
      } catch (e) {
        throw APIError.badRequest("Value must be valid JSON for json type");
      }
    }

    try {
      // Check if setting key already exists
      const existingSetting = await db.queryRow`
        SELECT id FROM system_settings WHERE key = ${req.key}
      `;

      if (existingSetting) {
        throw APIError.alreadyExists("Setting with this key already exists");
      }

      // Create setting
      const setting = await db.queryRow<SystemSetting>`
        INSERT INTO system_settings (key, value, type, category, description, is_public)
        VALUES (${req.key}, ${req.value}, ${req.type}, ${req.category}, ${req.description || null}, ${req.is_public !== false})
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'create', 'system_setting', ${setting.id}, ${JSON.stringify(setting)})
      `;

      return setting;

    } catch (error) {
      console.error('System setting creation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create system setting");
    }
  }
);

// Get system setting by key
export const getSystemSetting = api<{ key: string }, SystemSetting>(
  { auth: true, expose: true, method: "GET", path: "/admin/settings/:key" },
  async ({ key }) => {
    const auth = getAuthData()!;
    
    const setting = await db.queryRow<SystemSetting>`
      SELECT * FROM system_settings WHERE key = ${key}
    `;

    if (!setting) {
      throw APIError.notFound("System setting not found");
    }

    // Check if user can view this setting
    if (!setting.is_public && !auth.permissions.includes('system.admin') && !auth.permissions.includes('settings.view')) {
      throw APIError.forbidden("Insufficient permissions to view this setting");
    }

    return setting;
  }
);

// List system settings
export const listSystemSettings = api<SettingListParams, { settings: SystemSetting[] }>(
  { auth: true, expose: true, method: "GET", path: "/admin/settings" },
  async (params) => {
    const auth = getAuthData()!;
    
    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Filter by public settings if user doesn't have admin permissions
    if (!auth.permissions.includes('system.admin') && !auth.permissions.includes('settings.view')) {
      whereClause += ` AND is_public = true`;
    }

    // Category filter
    if (params.category) {
      whereClause += ` AND category = $${paramIndex}`;
      queryParams.push(params.category);
      paramIndex++;
    }

    // Public filter
    if (params.is_public !== undefined) {
      whereClause += ` AND is_public = $${paramIndex}`;
      queryParams.push(params.is_public);
      paramIndex++;
    }

    try {
      const settingsQuery = `
        SELECT * FROM system_settings
        ${whereClause}
        ORDER BY category, key
      `;
      
      const settingsResult = await db.query(settingsQuery, ...queryParams);
      const settings: SystemSetting[] = [];
      for await (const setting of settingsResult) {
        settings.push(setting);
      }

      return { settings };

    } catch (error) {
      console.error('List system settings error:', error);
      throw APIError.internal("Failed to fetch system settings");
    }
  }
);

// Update system setting
export const updateSystemSetting = api<{ key: string } & UpdateSettingRequest, SystemSetting>(
  { auth: true, expose: true, method: "PUT", path: "/admin/settings/:key" },
  async ({ key, ...req }) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('system.admin') && !auth.permissions.includes('settings.manage')) {
      throw APIError.forbidden("Insufficient permissions to update system settings");
    }

    // Get existing setting
    const existingSetting = await db.queryRow<SystemSetting>`
      SELECT * FROM system_settings WHERE key = ${key}
    `;

    if (!existingSetting) {
      throw APIError.notFound("System setting not found");
    }

    // Validate value based on type
    if (existingSetting.type === 'number' && isNaN(Number(req.value))) {
      throw APIError.badRequest("Value must be a valid number for number type");
    }

    if (existingSetting.type === 'boolean' && !['true', 'false'].includes(req.value.toLowerCase())) {
      throw APIError.badRequest("Value must be 'true' or 'false' for boolean type");
    }

    if (existingSetting.type === 'json') {
      try {
        JSON.parse(req.value);
      } catch (e) {
        throw APIError.badRequest("Value must be valid JSON for json type");
      }
    }

    try {
      // Update setting
      const setting = await db.queryRow<SystemSetting>`
        UPDATE system_settings SET
          value = ${req.value},
          description = COALESCE(${req.description}, description),
          is_public = COALESCE(${req.is_public}, is_public),
          updated_at = NOW()
        WHERE key = ${key}
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'update', 'system_setting', ${setting.id}, ${JSON.stringify(existingSetting)}, ${JSON.stringify(setting)})
      `;

      return setting;

    } catch (error) {
      console.error('System setting update error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update system setting");
    }
  }
);

// Delete system setting
export const deleteSystemSetting = api<{ key: string }, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "DELETE", path: "/admin/settings/:key" },
  async ({ key }) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('system.admin')) {
      throw APIError.forbidden("Insufficient permissions to delete system settings");
    }

    const setting = await db.queryRow<SystemSetting>`
      SELECT * FROM system_settings WHERE key = ${key}
    `;

    if (!setting) {
      throw APIError.notFound("System setting not found");
    }

    try {
      // Delete setting
      await db.exec`DELETE FROM system_settings WHERE key = ${key}`;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values)
        VALUES (${auth.userID}, 'delete', 'system_setting', ${setting.id}, ${JSON.stringify(setting)})
      `;

      return {
        success: true,
        message: "System setting deleted successfully"
      };

    } catch (error) {
      console.error('System setting deletion error:', error);
      throw APIError.internal("Failed to delete system setting");
    }
  }
);

// Get public settings (for frontend configuration)
export const getPublicSettings = api<{}, { settings: Record<string, any> }>(
  { expose: true, method: "GET", path: "/public/settings" },
  async () => {
    try {
      const settingsQuery = db.query<SystemSetting>`
        SELECT key, value, type FROM system_settings 
        WHERE is_public = true
        ORDER BY category, key
      `;

      const settings: Record<string, any> = {};
      for await (const setting of settingsQuery) {
        let parsedValue: any = setting.value;
        
        // Parse value based on type
        switch (setting.type) {
          case 'number':
            parsedValue = Number(setting.value);
            break;
          case 'boolean':
            parsedValue = setting.value.toLowerCase() === 'true';
            break;
          case 'json':
            try {
              parsedValue = JSON.parse(setting.value);
            } catch (e) {
              parsedValue = setting.value;
            }
            break;
        }
        
        settings[setting.key] = parsedValue;
      }

      return { settings };

    } catch (error) {
      console.error('Get public settings error:', error);
      throw APIError.internal("Failed to fetch public settings");
    }
  }
);

// Bulk update settings
export const bulkUpdateSettings = api<BulkUpdateRequest, { success: boolean; updated_count: number }>(
  { auth: true, expose: true, method: "POST", path: "/admin/settings/bulk-update" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('system.admin') && !auth.permissions.includes('settings.manage')) {
      throw APIError.forbidden("Insufficient permissions to bulk update system settings");
    }

    if (!req.settings?.length) {
      throw APIError.badRequest("Settings array is required");
    }

    try {
      let updatedCount = 0;

      for (const settingUpdate of req.settings) {
        // Get existing setting to validate type
        const existingSetting = await db.queryRow<SystemSetting>`
          SELECT * FROM system_settings WHERE key = ${settingUpdate.key}
        `;

        if (!existingSetting) {
          continue; // Skip non-existent settings
        }

        // Validate value based on type
        let isValid = true;
        if (existingSetting.type === 'number' && isNaN(Number(settingUpdate.value))) {
          isValid = false;
        }
        if (existingSetting.type === 'boolean' && !['true', 'false'].includes(settingUpdate.value.toLowerCase())) {
          isValid = false;
        }
        if (existingSetting.type === 'json') {
          try {
            JSON.parse(settingUpdate.value);
          } catch (e) {
            isValid = false;
          }
        }

        if (!isValid) {
          continue; // Skip invalid values
        }

        // Update setting
        await db.exec`
          UPDATE system_settings SET
            value = ${settingUpdate.value},
            updated_at = NOW()
          WHERE key = ${settingUpdate.key}
        `;

        updatedCount++;
      }

      // Log bulk update activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'bulk_update', 'system_setting', 0, ${JSON.stringify({ settings: req.settings, updated_count: updatedCount })})
      `;

      return {
        success: true,
        updated_count: updatedCount
      };

    } catch (error) {
      console.error('Bulk update settings error:', error);
      throw APIError.internal("Failed to bulk update settings");
    }
  }
);

// Get settings by category
export const getSettingsByCategory = api<{ category: string }, { settings: SystemSetting[] }>(
  { auth: true, expose: true, method: "GET", path: "/admin/settings/category/:category" },
  async ({ category }) => {
    const auth = getAuthData()!;
    
    try {
      let whereClause = "WHERE category = $1";
      const queryParams = [category];

      // Filter by public settings if user doesn't have admin permissions
      if (!auth.permissions.includes('system.admin') && !auth.permissions.includes('settings.view')) {
        whereClause += " AND is_public = true";
      }

      const settingsQuery = `
        SELECT * FROM system_settings
        ${whereClause}
        ORDER BY key
      `;
      
      const settingsResult = await db.query(settingsQuery, ...queryParams);
      const settings: SystemSetting[] = [];
      for await (const setting of settingsResult) {
        settings.push(setting);
      }

      return { settings };

    } catch (error) {
      console.error('Get settings by category error:', error);
      throw APIError.internal("Failed to fetch settings by category");
    }
  }
);

// Get available categories
export const getSettingCategories = api<{}, { categories: string[] }>(
  { auth: true, expose: true, method: "GET", path: "/admin/settings/categories" },
  async () => {
    const auth = getAuthData()!;
    
    try {
      let whereClause = "WHERE 1=1";

      // Filter by public settings if user doesn't have admin permissions
      if (!auth.permissions.includes('system.admin') && !auth.permissions.includes('settings.view')) {
        whereClause += " AND is_public = true";
      }

      const categoriesQuery = `
        SELECT DISTINCT category FROM system_settings
        ${whereClause}
        ORDER BY category
      `;
      
      const categoriesResult = await db.query(categoriesQuery);
      const categories: string[] = [];
      for await (const row of categoriesResult) {
        categories.push(row.category);
      }

      return { categories };

    } catch (error) {
      console.error('Get setting categories error:', error);
      throw APIError.internal("Failed to fetch setting categories");
    }
  }
);

// Initialize default settings
export const initializeDefaultSettings = api<{}, { success: boolean; initialized_count: number }>(
  { auth: true, expose: true, method: "POST", path: "/admin/settings/initialize" },
  async () => {
    const auth = getAuthData()!;
    
    // Check admin permissions
    if (!auth.permissions.includes('system.admin')) {
      throw APIError.forbidden("Insufficient permissions to initialize system settings");
    }

    const defaultSettings = [
      { key: 'app.name', value: 'Gharinto Interior Solutions', type: 'string', category: 'general', description: 'Application name', is_public: true },
      { key: 'app.version', value: '1.0.0', type: 'string', category: 'general', description: 'Application version', is_public: true },
      { key: 'app.maintenance_mode', value: 'false', type: 'boolean', category: 'general', description: 'Enable maintenance mode', is_public: true },
      { key: 'email.smtp_host', value: 'smtp.gmail.com', type: 'string', category: 'email', description: 'SMTP host for email sending', is_public: false },
      { key: 'email.smtp_port', value: '587', type: 'number', category: 'email', description: 'SMTP port', is_public: false },
      { key: 'email.from_address', value: 'noreply@gharinto.com', type: 'string', category: 'email', description: 'Default from email address', is_public: false },
      { key: 'payment.gateway', value: 'razorpay', type: 'string', category: 'payment', description: 'Payment gateway provider', is_public: false },
      { key: 'payment.currency', value: 'INR', type: 'string', category: 'payment', description: 'Default currency', is_public: true },
      { key: 'ui.theme', value: 'light', type: 'string', category: 'ui', description: 'Default UI theme', is_public: true },
      { key: 'ui.items_per_page', value: '20', type: 'number', category: 'ui', description: 'Default items per page', is_public: true },
      { key: 'security.session_timeout', value: '3600', type: 'number', category: 'security', description: 'Session timeout in seconds', is_public: false },
      { key: 'security.max_login_attempts', value: '5', type: 'number', category: 'security', description: 'Maximum login attempts before lockout', is_public: false },
      { key: 'notifications.email_enabled', value: 'true', type: 'boolean', category: 'notifications', description: 'Enable email notifications', is_public: false },
      { key: 'notifications.sms_enabled', value: 'false', type: 'boolean', category: 'notifications', description: 'Enable SMS notifications', is_public: false }
    ];

    try {
      let initializedCount = 0;

      for (const setting of defaultSettings) {
        // Check if setting already exists
        const existingSetting = await db.queryRow`
          SELECT id FROM system_settings WHERE key = ${setting.key}
        `;

        if (!existingSetting) {
          await db.exec`
            INSERT INTO system_settings (key, value, type, category, description, is_public)
            VALUES (${setting.key}, ${setting.value}, ${setting.type}, ${setting.category}, ${setting.description}, ${setting.is_public})
          `;
          initializedCount++;
        }
      }

      // Log initialization
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'initialize', 'system_setting', 0, ${JSON.stringify({ initialized_count: initializedCount })})
      `;

      return {
        success: true,
        initialized_count: initializedCount
      };

    } catch (error) {
      console.error('Initialize default settings error:', error);
      throw APIError.internal("Failed to initialize default settings");
    }
  }
);
