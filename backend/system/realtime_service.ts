import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import { logger } from "../common/logger";

interface RealtimeEvent {
  type: string;
  userId?: number;
  roomId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

interface NotificationData {
  userId: number;
  title: string;
  content: string;
  type: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  referenceType?: string;
  referenceId?: number;
  metadata?: Record<string, any>;
}

class RealtimeService {
  private static instance: RealtimeService;
  private connections: Map<number, WebSocket[]> = new Map();
  private roomConnections: Map<string, Set<number>> = new Map();

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  // User connection management
  addConnection(userId: number, ws: WebSocket) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, []);
    }
    this.connections.get(userId)!.push(ws);
    
    logger.info('RealtimeService', 'user_connected', { userId });
  }

  removeConnection(userId: number, ws: WebSocket) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const index = userConnections.indexOf(ws);
      if (index > -1) {
        userConnections.splice(index, 1);
      }
      if (userConnections.length === 0) {
        this.connections.delete(userId);
      }
    }
    
    logger.info('RealtimeService', 'user_disconnected', { userId });
  }

  // Room management for project collaboration
  joinRoom(userId: number, roomId: string) {
    if (!this.roomConnections.has(roomId)) {
      this.roomConnections.set(roomId, new Set());
    }
    this.roomConnections.get(roomId)!.add(userId);
    
    logger.info('RealtimeService', 'joined_room', { userId, roomId });
  }

  leaveRoom(userId: number, roomId: string) {
    const roomUsers = this.roomConnections.get(roomId);
    if (roomUsers) {
      roomUsers.delete(userId);
      if (roomUsers.size === 0) {
        this.roomConnections.delete(roomId);
      }
    }
    
    logger.info('RealtimeService', 'left_room', { userId, roomId });
  }

  // Send real-time events
  async sendToUser(userId: number, event: Omit<RealtimeEvent, 'timestamp'>) {
    const userConnections = this.connections.get(userId);
    if (userConnections && userConnections.length > 0) {
      const eventData = {
        ...event,
        timestamp: new Date()
      };

      userConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(eventData));
        }
      });

      logger.debug('RealtimeService', 'event_sent_to_user', { 
        userId, 
        eventType: event.type,
        connectionCount: userConnections.length 
      });

      return true;
    }
    return false;
  }

  async sendToRoom(roomId: string, event: Omit<RealtimeEvent, 'timestamp'>, excludeUserId?: number) {
    const roomUsers = this.roomConnections.get(roomId);
    if (roomUsers && roomUsers.size > 0) {
      let sentCount = 0;
      
      for (const userId of roomUsers) {
        if (excludeUserId && userId === excludeUserId) continue;
        
        const sent = await this.sendToUser(userId, event);
        if (sent) sentCount++;
      }

      logger.debug('RealtimeService', 'event_sent_to_room', { 
        roomId, 
        eventType: event.type,
        sentCount,
        totalUsers: roomUsers.size 
      });

      return sentCount;
    }
    return 0;
  }

  // Notification system
  async sendNotification(notificationData: NotificationData) {
    try {
      // Store notification in database
      const notification = await db.queryRow`
        INSERT INTO notifications (
          user_id, title, content, type, priority, reference_type, 
          reference_id, metadata, is_read, created_at
        ) VALUES (
          ${notificationData.userId}, ${notificationData.title}, ${notificationData.content},
          ${notificationData.type}, ${notificationData.priority || 'medium'}, 
          ${notificationData.referenceType}, ${notificationData.referenceId},
          ${JSON.stringify(notificationData.metadata || {})}, false, NOW()
        ) RETURNING *
      `;

      // Send real-time notification
      await this.sendToUser(notificationData.userId, {
        type: 'notification',
        data: {
          id: notification.id,
          title: notificationData.title,
          content: notificationData.content,
          type: notificationData.type,
          priority: notificationData.priority,
          metadata: notificationData.metadata
        }
      });

      // Send push notification for mobile users
      if (notificationData.priority === 'urgent' || notificationData.priority === 'high') {
        await this.sendPushNotification(notificationData);
      }

      logger.info('RealtimeService', 'notification_sent', {
        userId: notificationData.userId,
        type: notificationData.type,
        priority: notificationData.priority
      });

      return notification;

    } catch (error) {
      logger.error('RealtimeService', 'notification_send_failed', error as Error, {
        userId: notificationData.userId,
        type: notificationData.type
      });
      throw error;
    }
  }

  private async sendPushNotification(notificationData: NotificationData) {
    try {
      // Get user's push notification settings
      const userPrefs = await db.queryRow`
        SELECT push_notifications, device_tokens
        FROM user_preferences up
        JOIN users u ON up.user_id = u.id
        WHERE u.id = ${notificationData.userId} AND push_notifications = true
      `;

      if (userPrefs && userPrefs.device_tokens) {
        // In production, integrate with FCM, APNS, or other push services
        logger.info('RealtimeService', 'push_notification_queued', {
          userId: notificationData.userId,
          deviceTokens: userPrefs.device_tokens?.length || 0
        });
      }

    } catch (error) {
      logger.warn('RealtimeService', 'push_notification_failed', {
        userId: notificationData.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Business event handlers
  async handleProjectUpdate(projectId: number, updateType: string, data: Record<string, any>, updatedBy: number) {
    // Get all project stakeholders
    const stakeholders = await db.queryAll`
      SELECT DISTINCT user_id FROM (
        SELECT client_id as user_id FROM projects WHERE id = ${projectId}
        UNION
        SELECT designer_id as user_id FROM projects WHERE id = ${projectId} WHERE designer_id IS NOT NULL
        UNION
        SELECT project_manager_id as user_id FROM projects WHERE id = ${projectId} WHERE project_manager_id IS NOT NULL
        UNION
        SELECT team_member_id as user_id FROM project_team_members WHERE project_id = ${projectId} AND is_active = true
      ) stakeholders WHERE user_id IS NOT NULL
    `;

    // Send real-time updates to all stakeholders
    for (const stakeholder of stakeholders) {
      if (stakeholder.user_id !== updatedBy) { // Don't notify the person who made the update
        await this.sendToUser(stakeholder.user_id, {
          type: 'project_update',
          data: {
            projectId,
            updateType,
            data,
            updatedBy
          }
        });
      }
    }

    // Send to project room
    await this.sendToRoom(`project_${projectId}`, {
      type: 'project_update',
      data: {
        projectId,
        updateType,
        data,
        updatedBy
      }
    }, updatedBy);

    logger.info('RealtimeService', 'project_update_broadcasted', {
      projectId,
      updateType,
      stakeholderCount: stakeholders.length
    });
  }

  async handleNewMessage(conversationId: number, message: any, senderId: number) {
    // Get conversation participants
    const participants = await db.queryAll`
      SELECT user_id FROM conversation_participants 
      WHERE conversation_id = ${conversationId} AND user_id != ${senderId}
    `;

    // Send real-time message to all participants
    for (const participant of participants) {
      await this.sendToUser(participant.user_id, {
        type: 'new_message',
        data: {
          conversationId,
          message,
          senderId
        }
      });

      // Create notification for new message
      await this.sendNotification({
        userId: participant.user_id,
        title: 'New Message',
        content: `You have a new message from ${message.senderName}`,
        type: 'new_message',
        priority: 'medium',
        referenceType: 'conversation',
        referenceId: conversationId
      });
    }

    logger.info('RealtimeService', 'message_broadcasted', {
      conversationId,
      senderId,
      participantCount: participants.length
    });
  }

  async handleLeadAssignment(leadId: number, assignedTo: number, assignedBy: number) {
    // Notify assigned designer
    await this.sendNotification({
      userId: assignedTo,
      title: 'New Lead Assigned',
      content: 'A new lead has been assigned to you. Please review and take action.',
      type: 'lead_assignment',
      priority: 'high',
      referenceType: 'lead',
      referenceId: leadId
    });

    // Send real-time update
    await this.sendToUser(assignedTo, {
      type: 'lead_assigned',
      data: {
        leadId,
        assignedBy
      }
    });

    logger.info('RealtimeService', 'lead_assignment_notified', {
      leadId,
      assignedTo,
      assignedBy
    });
  }

  async handlePaymentUpdate(userId: number, paymentType: string, amount: number, status: string, paymentId?: number) {
    const title = status === 'completed' ? 'Payment Successful' : 'Payment Update';
    const priority = status === 'failed' ? 'high' : 'medium';

    await this.sendNotification({
      userId,
      title,
      content: `Your ${paymentType} of ₹${amount} is ${status}`,
      type: 'payment_update',
      priority,
      referenceType: 'payment',
      referenceId: paymentId,
      metadata: { amount, paymentType, status }
    });

    await this.sendToUser(userId, {
      type: 'payment_update',
      data: {
        paymentId,
        paymentType,
        amount,
        status
      }
    });

    logger.logPaymentEvent(userId, 'payment_notification_sent', amount, paymentId, {
      paymentType,
      status
    });
  }

  async handleComplaintUpdate(complaintId: number, customerId: number, status: string, assignedTo?: number) {
    // Notify customer
    await this.sendNotification({
      userId: customerId,
      title: 'Complaint Update',
      content: `Your complaint status has been updated to: ${status}`,
      type: 'complaint_update',
      priority: 'medium',
      referenceType: 'complaint',
      referenceId: complaintId
    });

    // Notify assigned agent if any
    if (assignedTo) {
      await this.sendNotification({
        userId: assignedTo,
        title: 'Complaint Assignment',
        content: 'A complaint has been assigned to you for resolution',
        type: 'complaint_assignment',
        priority: 'high',
        referenceType: 'complaint',
        referenceId: complaintId
      });
    }

    logger.info('RealtimeService', 'complaint_update_notified', {
      complaintId,
      customerId,
      status,
      assignedTo
    });
  }

  // System health monitoring
  async monitorSystemHealth() {
    const connectionCount = Array.from(this.connections.values()).reduce((total, connections) => total + connections.length, 0);
    const roomCount = this.roomConnections.size;
    const activeUsers = this.connections.size;

    logger.info('RealtimeService', 'health_check', {
      activeUsers,
      totalConnections: connectionCount,
      activeRooms: roomCount,
      timestamp: new Date()
    });

    // Alert if too many connections (potential memory issue)
    if (connectionCount > 10000) {
      logger.triggerAlert({
        type: 'performance_degradation',
        severity: 'high',
        title: 'High Connection Count',
        description: `Real-time service has ${connectionCount} active connections`,
        metadata: { connectionCount, activeUsers, roomCount },
        resolved: false,
        timestamp: new Date()
      });
    }

    return {
      activeUsers,
      totalConnections: connectionCount,
      activeRooms: roomCount,
      memoryUsage: process.memoryUsage()
    };
  }
}

export const realtimeService = RealtimeService.getInstance();

// API endpoints for real-time service management
export const getRealtimeStats = api(
  { auth: true, expose: true, method: "GET", path: "/realtime/stats" },
  async () => {
    const auth = getAuthData()!;
    
    if (!auth.permissions.includes('system.view')) {
      throw new Error("Insufficient permissions");
    }

    return await realtimeService.monitorSystemHealth();
  }
);

export const sendTestNotification = api(
  { auth: true, expose: true, method: "POST", path: "/realtime/test-notification" },
  async (req: { userId: number; title: string; content: string }) => {
    const auth = getAuthData()!;
    
    if (!auth.permissions.includes('system.admin')) {
      throw new Error("Insufficient permissions");
    }

    await realtimeService.sendNotification({
      userId: req.userId,
      title: req.title,
      content: req.content,
      type: 'test',
      priority: 'medium'
    });

    return { success: true };
  }
);

// User preference management for notifications
export const updateNotificationPreferences = api(
  { auth: true, expose: true, method: "PUT", path: "/realtime/preferences" },
  async (req: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
    realtimeUpdates?: boolean;
  }) => {
    const auth = getAuthData()!;

    await db.exec`
      UPDATE user_preferences 
      SET 
        email_notifications = COALESCE(${req.emailNotifications}, email_notifications),
        push_notifications = COALESCE(${req.pushNotifications}, push_notifications),
        sms_notifications = COALESCE(${req.smsNotifications}, sms_notifications),
        realtime_updates = COALESCE(${req.realtimeUpdates}, realtime_updates),
        updated_at = NOW()
      WHERE user_id = ${auth.userID}
    `;

    logger.logUserAction(parseInt(auth.userID), 'notification_preferences_updated', 'user_preferences', undefined, req);

    return { success: true };
  }
);