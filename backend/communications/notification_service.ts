import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Subscription } from "encore.dev/pubsub";
import db from "../db";
import { notificationTopic, emailTopic, pushTopic, NotificationEvent, EmailNotificationEvent, PushNotificationEvent } from "./notification_events";

export interface Notification {
  id: number;
  title: string;
  content: string;
  type: string;
  reference_type?: string;
  reference_id?: number;
  is_read: boolean;
  created_at: Date;
}

export interface CreateNotificationRequest {
  user_ids: number[];
  title: string;
  content: string;
  type: string;
  reference_type?: string;
  reference_id?: number;
  send_email?: boolean;
  send_push?: boolean;
}

export interface NotificationTemplate {
  id: number;
  name: string;
  title: string;
  content: string;
  variables: string[];
}

export const createNotification = api<CreateNotificationRequest, void>(
  { auth: true, expose: true, method: "POST", path: "/notifications" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Validate user IDs exist
    const userCount = await db.queryRow`
      SELECT COUNT(*) as count FROM users WHERE id = ANY(${req.user_ids})
    `;

    if (userCount?.count !== req.user_ids.length) {
      throw APIError.badRequest("Some user IDs do not exist");
    }

    // Publish notification event
    await notificationTopic.publish({
      user_ids: req.user_ids,
      title: req.title,
      content: req.content,
      type: req.type,
      reference_type: req.reference_type,
      reference_id: req.reference_id,
      metadata: {
        send_email: req.send_email,
        send_push: req.send_push,
        created_by: auth.userID
      }
    });
  }
);

export const getUserNotifications = api<{ 
  limit?: number; 
  offset?: number; 
  unread_only?: boolean;
}, { notifications: Notification[]; total_count: number; unread_count: number }>(
  { auth: true, expose: true, method: "GET", path: "/notifications" },
  async ({ limit = 20, offset = 0, unread_only = false }) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    const whereClause = unread_only ? 
      "WHERE user_id = $1 AND is_read = false" : 
      "WHERE user_id = $1";

    // Get notifications
    const notificationsQuery = db.rawQuery<Notification>(`
      SELECT id, title, content, type, reference_type, reference_id, is_read, created_at
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${unread_only ? '2' : '3'} OFFSET $${unread_only ? '3' : '4'}
    `, userId, limit, offset);

    const notifications: Notification[] = [];
    for await (const notification of notificationsQuery) {
      notifications.push(notification);
    }

    // Get total count
    const totalResult = await db.rawQueryRow<{ count: number }>(`
      SELECT COUNT(*) as count FROM notifications ${whereClause}
    `, userId);

    // Get unread count
    const unreadResult = await db.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ${userId} AND is_read = false
    `;

    return {
      notifications,
      total_count: totalResult?.count || 0,
      unread_count: unreadResult?.count || 0
    };
  }
);

export const markNotificationsAsRead = api<{ notification_ids: number[] }, void>(
  { auth: true, expose: true, method: "POST", path: "/notifications/mark-read" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    if (req.notification_ids.length === 0) {
      return;
    }

    await db.exec`
      UPDATE notifications 
      SET is_read = true 
      WHERE id = ANY(${req.notification_ids}) AND user_id = ${userId}
    `;
  }
);

export const getNotificationTemplates = api<void, { templates: NotificationTemplate[] }>(
  { auth: true, expose: true, method: "GET", path: "/notification-templates" },
  async () => {
    const templatesQuery = db.query<NotificationTemplate>`
      SELECT id, name, title, content, variables 
      FROM notification_templates 
      WHERE is_active = true 
      ORDER BY name
    `;

    const templates: NotificationTemplate[] = [];
    for await (const template of templatesQuery) {
      templates.push(template);
    }

    return { templates };
  }
);

export const sendTemplatedNotification = api<{
  template_name: string;
  user_ids: number[];
  variables: Record<string, any>;
  send_email?: boolean;
  send_push?: boolean;
}, void>(
  { auth: true, expose: true, method: "POST", path: "/notifications/templated" },
  async (req) => {
    const template = await db.queryRow<NotificationTemplate>`
      SELECT id, name, title, content, variables 
      FROM notification_templates 
      WHERE name = ${req.template_name} AND is_active = true
    `;

    if (!template) {
      throw APIError.notFound("Notification template not found");
    }

    // Replace variables in title and content
    let title = template.title;
    let content = template.content;

    for (const [key, value] of Object.entries(req.variables)) {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), String(value));
      content = content.replace(new RegExp(placeholder, 'g'), String(value));
    }

    await createNotification({
      user_ids: req.user_ids,
      title,
      content,
      type: 'templated',
      send_email: req.send_email,
      send_push: req.send_push
    });
  }
);

// Subscription to handle notification creation
new Subscription(notificationTopic, "create-notifications", {
  handler: async (event: NotificationEvent) => {
    // Insert notifications for each user
    for (const userId of event.user_ids) {
      await db.exec`
        INSERT INTO notifications (user_id, title, content, type, reference_type, reference_id)
        VALUES (${userId}, ${event.title}, ${event.content}, ${event.type}, ${event.reference_type}, ${event.reference_id})
      `;
    }

    // Send email notifications if requested
    if (event.metadata?.send_email) {
      const users = await db.queryAll<{ email: string }>`
        SELECT email FROM users WHERE id = ANY(${event.user_ids}) AND email IS NOT NULL
      `;

      if (users.length > 0) {
        await emailTopic.publish({
          to: users.map(u => u.email),
          template: 'generic_notification',
          variables: {
            title: event.title,
            content: event.content,
            type: event.type
          }
        });
      }
    }

    // Send push notifications if requested
    if (event.metadata?.send_push) {
      await pushTopic.publish({
        user_ids: event.user_ids,
        title: event.title,
        body: event.content,
        data: {
          type: event.type,
          reference_type: event.reference_type,
          reference_id: event.reference_id?.toString()
        }
      });
    }
  }
});

// Subscription to handle email notifications
new Subscription(emailTopic, "send-emails", {
  handler: async (event: EmailNotificationEvent) => {
    // In a real implementation, integrate with email service like SendGrid, SES, etc.
    console.log(`Sending email to ${event.to.join(', ')}: ${event.template}`, event.variables);
    
    // For now, just log the email
    // TODO: Implement actual email sending logic
  }
});

// Subscription to handle push notifications
new Subscription(pushTopic, "send-push", {
  handler: async (event: PushNotificationEvent) => {
    // In a real implementation, integrate with push service like FCM, APNs, etc.
    console.log(`Sending push to users ${event.user_ids.join(', ')}: ${event.title}`, event.body);
    
    // For now, just log the push notification
    // TODO: Implement actual push notification logic
  }
});