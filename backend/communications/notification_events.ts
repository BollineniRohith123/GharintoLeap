import { Topic } from "encore.dev/pubsub";

export interface NotificationEvent {
  user_ids: number[];
  title: string;
  content: string;
  type: string;
  reference_type?: string;
  reference_id?: number;
  metadata?: Record<string, any>;
}

export interface EmailNotificationEvent {
  to: string[];
  template: string;
  variables: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

export interface PushNotificationEvent {
  user_ids: number[];
  title: string;
  body: string;
  data?: Record<string, any>;
  image?: string;
}

export const notificationTopic = new Topic<NotificationEvent>("notification-created", {
  deliveryGuarantee: "at-least-once",
});

export const emailTopic = new Topic<EmailNotificationEvent>("email-notification", {
  deliveryGuarantee: "at-least-once",
});

export const pushTopic = new Topic<PushNotificationEvent>("push-notification", {
  deliveryGuarantee: "at-least-once",
});