import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface ListNotificationsParams {
  page?: Query<number>;
  limit?: Query<number>;
  unreadOnly?: Query<boolean>;
}

interface Notification {
  id: number;
  title: string;
  content: string;
  type: string;
  referenceType?: string;
  referenceId?: number;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

// Gets user notifications with pagination
export const getNotifications = api<ListNotificationsParams, NotificationsResponse>(
  { auth: true, expose: true, method: "GET", path: "/communications/notifications" },
  async (params) => {
    const auth = getAuthData()!;
    
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE user_id = ${auth.userID}`;
    if (params.unreadOnly) {
      whereClause += " AND is_read = false";
    }

    const notifications = await db.rawQueryAll(`
      SELECT id, title, content, type, reference_type, reference_id, is_read, created_at
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const totalResult = await db.rawQueryRow(`
      SELECT COUNT(*) as total FROM notifications ${whereClause}
    `);

    const unreadResult = await db.rawQueryRow`
      SELECT COUNT(*) as unread FROM notifications WHERE user_id = ${auth.userID} AND is_read = false
    `;

    return {
      notifications: notifications.map(notification => ({
        id: notification.id,
        title: notification.title,
        content: notification.content,
        type: notification.type,
        referenceType: notification.reference_type,
        referenceId: notification.reference_id,
        isRead: notification.is_read,
        createdAt: notification.created_at
      })),
      total: totalResult?.total || 0,
      unreadCount: unreadResult?.unread || 0,
      page,
      limit
    };
  }
);
