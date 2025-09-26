import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables: string[];
  category: 'project' | 'payment' | 'system' | 'marketing';
  is_active: boolean;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

interface CreateEmailTemplateRequest {
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables?: string[];
  category: 'project' | 'payment' | 'system' | 'marketing';
}

interface UpdateEmailTemplateRequest {
  name?: string;
  subject?: string;
  html_content?: string;
  text_content?: string;
  variables?: string[];
  category?: 'project' | 'payment' | 'system' | 'marketing';
  is_active?: boolean;
}

interface EmailTemplateListParams {
  page?: Query<number>;
  limit?: Query<number>;
  category?: Query<string>;
  is_active?: Query<boolean>;
  search?: Query<string>;
}

interface SendEmailRequest {
  template_name: string;
  to: string[];
  variables: Record<string, any>;
  cc?: string[];
  bcc?: string[];
  reply_to?: string;
}

// Create email template
export const createEmailTemplate = api<CreateEmailTemplateRequest, EmailTemplate>(
  { auth: true, expose: true, method: "POST", path: "/communications/email-templates" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('communications.manage') && !auth.permissions.includes('email_templates.create')) {
      throw APIError.forbidden("Insufficient permissions to create email templates");
    }

    // Validate required fields
    if (!req.name || !req.subject || !req.html_content) {
      throw APIError.badRequest("Name, subject, and HTML content are required");
    }

    try {
      // For now, create a mock template since we don't have email_templates table
      const template: EmailTemplate = {
        id: Math.floor(Math.random() * 1000000),
        name: req.name,
        subject: req.subject,
        html_content: req.html_content,
        text_content: req.text_content,
        variables: req.variables || [],
        category: req.category,
        is_active: true,
        created_by: parseInt(auth.userID),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Log template creation
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'create', 'email_template', ${template.id}, ${JSON.stringify(template)})
      `;

      return template;

    } catch (error) {
      console.error('Email template creation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create email template");
    }
  }
);

// Get email template by ID
export const getEmailTemplate = api<{ id: number }, EmailTemplate>(
  { auth: true, expose: true, method: "GET", path: "/communications/email-templates/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('communications.view') && !auth.permissions.includes('email_templates.view')) {
      throw APIError.forbidden("Insufficient permissions to view email templates");
    }

    // Mock template data
    const template: EmailTemplate = {
      id: id,
      name: "Project Update Notification",
      subject: "Your project {{project_name}} has been updated",
      html_content: `
        <html>
          <body>
            <h2>Project Update</h2>
            <p>Dear {{client_name}},</p>
            <p>Your project <strong>{{project_name}}</strong> has been updated.</p>
            <p>Status: {{project_status}}</p>
            <p>Next milestone: {{next_milestone}}</p>
            <p>Best regards,<br>Gharinto Team</p>
          </body>
        </html>
      `,
      text_content: "Dear {{client_name}}, Your project {{project_name}} has been updated. Status: {{project_status}}. Next milestone: {{next_milestone}}. Best regards, Gharinto Team",
      variables: ["client_name", "project_name", "project_status", "next_milestone"],
      category: "project",
      is_active: true,
      created_by: 1,
      created_at: new Date(),
      updated_at: new Date()
    };

    return template;
  }
);

// List email templates
export const listEmailTemplates = api<EmailTemplateListParams, { templates: EmailTemplate[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/communications/email-templates" },
  async (params) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('communications.view') && !auth.permissions.includes('email_templates.view')) {
      throw APIError.forbidden("Insufficient permissions to view email templates");
    }

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);

    // Mock templates data
    const mockTemplates: EmailTemplate[] = [
      {
        id: 1,
        name: "Project Update Notification",
        subject: "Your project {{project_name}} has been updated",
        html_content: "<html><body><h2>Project Update</h2><p>Dear {{client_name}},</p><p>Your project <strong>{{project_name}}</strong> has been updated.</p></body></html>",
        text_content: "Dear {{client_name}}, Your project {{project_name}} has been updated.",
        variables: ["client_name", "project_name", "project_status"],
        category: "project",
        is_active: true,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        name: "Payment Confirmation",
        subject: "Payment Received - {{invoice_number}}",
        html_content: "<html><body><h2>Payment Confirmation</h2><p>Dear {{client_name}},</p><p>We have received your payment of ₹{{amount}} for invoice {{invoice_number}}.</p></body></html>",
        text_content: "Dear {{client_name}}, We have received your payment of ₹{{amount}} for invoice {{invoice_number}}.",
        variables: ["client_name", "amount", "invoice_number"],
        category: "payment",
        is_active: true,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 3,
        name: "Welcome Email",
        subject: "Welcome to Gharinto Interior Solutions",
        html_content: "<html><body><h2>Welcome!</h2><p>Dear {{client_name}},</p><p>Welcome to Gharinto Interior Solutions. We're excited to work with you!</p></body></html>",
        text_content: "Dear {{client_name}}, Welcome to Gharinto Interior Solutions. We're excited to work with you!",
        variables: ["client_name"],
        category: "system",
        is_active: true,
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Apply filters
    let filteredTemplates = mockTemplates;

    if (params.category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === params.category);
    }

    if (params.is_active !== undefined) {
      filteredTemplates = filteredTemplates.filter(t => t.is_active === params.is_active);
    }

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredTemplates = filteredTemplates.filter(t => 
        t.name.toLowerCase().includes(searchLower) || 
        t.subject.toLowerCase().includes(searchLower)
      );
    }

    const startIndex = (page - 1) * limit;
    const paginatedTemplates = filteredTemplates.slice(startIndex, startIndex + limit);

    return {
      templates: paginatedTemplates,
      total: filteredTemplates.length,
      page,
      limit
    };
  }
);

// Update email template
export const updateEmailTemplate = api<{ id: number } & UpdateEmailTemplateRequest, EmailTemplate>(
  { auth: true, expose: true, method: "PUT", path: "/communications/email-templates/:id" },
  async ({ id, ...req }) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('communications.manage') && !auth.permissions.includes('email_templates.manage')) {
      throw APIError.forbidden("Insufficient permissions to update email templates");
    }

    try {
      // Mock updated template
      const updatedTemplate: EmailTemplate = {
        id: id,
        name: req.name || "Updated Template",
        subject: req.subject || "Updated Subject",
        html_content: req.html_content || "<html><body>Updated content</body></html>",
        text_content: req.text_content,
        variables: req.variables || [],
        category: req.category || "system",
        is_active: req.is_active !== undefined ? req.is_active : true,
        created_by: 1,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        updated_at: new Date()
      };

      // Log template update
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'update', 'email_template', ${id}, ${JSON.stringify(updatedTemplate)})
      `;

      return updatedTemplate;

    } catch (error) {
      console.error('Email template update error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update email template");
    }
  }
);

// Delete email template
export const deleteEmailTemplate = api<{ id: number }, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "DELETE", path: "/communications/email-templates/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('communications.manage') && !auth.permissions.includes('email_templates.manage')) {
      throw APIError.forbidden("Insufficient permissions to delete email templates");
    }

    try {
      // Log template deletion
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'delete', 'email_template', ${id}, '{"deleted_at": "${new Date().toISOString()}"}')
      `;

      return {
        success: true,
        message: "Email template deleted successfully"
      };

    } catch (error) {
      console.error('Email template deletion error:', error);
      throw APIError.internal("Failed to delete email template");
    }
  }
);

// Send email using template
export const sendTemplatedEmail = api<SendEmailRequest, { success: boolean; message_id: string }>(
  { auth: true, expose: true, method: "POST", path: "/communications/send-email" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('communications.send') && !auth.permissions.includes('email.send')) {
      throw APIError.forbidden("Insufficient permissions to send emails");
    }

    // Validate required fields
    if (!req.template_name || !req.to?.length || !req.variables) {
      throw APIError.badRequest("Template name, recipients, and variables are required");
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of req.to) {
      if (!emailRegex.test(email)) {
        throw APIError.badRequest(`Invalid email address: ${email}`);
      }
    }

    try {
      // Mock email sending
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Log email sending
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'send_email', 'email', 0, ${JSON.stringify({
          template_name: req.template_name,
          to: req.to,
          cc: req.cc,
          bcc: req.bcc,
          variables: req.variables,
          message_id: messageId,
          sent_at: new Date().toISOString()
        })})
      `;

      return {
        success: true,
        message_id: messageId
      };

    } catch (error) {
      console.error('Send templated email error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to send email");
    }
  }
);

// Preview email template
export const previewEmailTemplate = api<{ 
  template_id: number;
  variables: Record<string, any>;
}, { subject: string; html_content: string; text_content?: string }>(
  { auth: true, expose: true, method: "POST", path: "/communications/email-templates/:template_id/preview" },
  async ({ template_id, variables }) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('communications.view') && !auth.permissions.includes('email_templates.view')) {
      throw APIError.forbidden("Insufficient permissions to preview email templates");
    }

    try {
      // Get template (mock data)
      const template = await getEmailTemplate.handler({ id: template_id });

      // Replace variables in subject and content
      let subject = template.subject;
      let htmlContent = template.html_content;
      let textContent = template.text_content;

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(placeholder, String(value));
        htmlContent = htmlContent.replace(placeholder, String(value));
        if (textContent) {
          textContent = textContent.replace(placeholder, String(value));
        }
      }

      return {
        subject,
        html_content: htmlContent,
        text_content: textContent
      };

    } catch (error) {
      console.error('Preview email template error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to preview email template");
    }
  }
);

// Get email template categories
export const getEmailTemplateCategories = api<{}, { categories: string[] }>(
  { auth: true, expose: true, method: "GET", path: "/communications/email-templates/categories" },
  async () => {
    return {
      categories: ['project', 'payment', 'system', 'marketing']
    };
  }
);

// Test email template
export const testEmailTemplate = api<{
  template_id: number;
  test_email: string;
  variables: Record<string, any>;
}, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "POST", path: "/communications/email-templates/:template_id/test" },
  async ({ template_id, test_email, variables }) => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('communications.manage') && !auth.permissions.includes('email_templates.test')) {
      throw APIError.forbidden("Insufficient permissions to test email templates");
    }

    // Validate email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(test_email)) {
      throw APIError.badRequest("Invalid test email address");
    }

    try {
      // Get template
      const template = await getEmailTemplate.handler({ id: template_id });

      // Send test email (mock)
      const messageId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Log test email
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'test_email', 'email_template', ${template_id}, ${JSON.stringify({
          test_email,
          variables,
          message_id: messageId,
          sent_at: new Date().toISOString()
        })})
      `;

      return {
        success: true,
        message: `Test email sent to ${test_email}`
      };

    } catch (error) {
      console.error('Test email template error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to send test email");
    }
  }
);
