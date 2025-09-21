import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  message_type: string;
  attachments: string[];
  created_at: Date;
  is_read_by_current_user: boolean;
  read_by_count: number;
}

export interface CreateMessageRequest {
  conversation_id: number;
  content: string;
  message_type?: string;
  attachments?: string[];
}

export interface MarkAsReadRequest {
  message_ids: number[];
}

export interface ConversationSummary {
  id: number;
  project_id?: number;
  title?: string;
  type: string;
  participants: number[];
  last_message?: string;
  last_message_at?: Date;
  unread_count: number;
}

export const sendMessage = api<CreateMessageRequest, Message>(
  { auth: true, expose: true, method: "POST", path: "/messages" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Validate conversation exists and user is participant
    const conversation = await db.queryRow`
      SELECT id, participants FROM conversations 
      WHERE id = ${req.conversation_id} AND ${userId} = ANY(participants)
    `;

    if (!conversation) {
      throw APIError.notFound("Conversation not found or access denied");
    }

    // Insert message
    const message = await db.queryRow<Message>`
      INSERT INTO messages (conversation_id, sender_id, content, message_type, attachments)
      VALUES (${req.conversation_id}, ${userId}, ${req.content}, ${req.message_type || 'text'}, ${req.attachments || []})
      RETURNING id, conversation_id, sender_id, content, message_type, attachments, created_at
    `;

    if (!message) {
      throw APIError.internal("Failed to create message");
    }

    // Mark as read for sender automatically
    await db.exec`
      INSERT INTO message_read_status (message_id, user_id)
      VALUES (${message.id}, ${userId})
      ON CONFLICT (message_id, user_id) DO NOTHING
    `;

    return {
      ...message,
      is_read_by_current_user: true,
      read_by_count: 1
    };
  }
);

export const markMessagesAsRead = api<MarkAsReadRequest, void>(
  { auth: true, expose: true, method: "POST", path: "/messages/mark-read" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    if (req.message_ids.length === 0) {
      return;
    }

    // Verify user has access to all messages
    const messageCount = await db.queryRow`
      SELECT COUNT(DISTINCT m.id) as count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = ANY(${req.message_ids}) AND ${userId} = ANY(c.participants)
    `;

    if (messageCount?.count !== req.message_ids.length) {
      throw APIError.forbidden("Access denied to some messages");
    }

    // Mark messages as read
    await db.exec`
      INSERT INTO message_read_status (message_id, user_id)
      SELECT unnest(${req.message_ids}), ${userId}
      ON CONFLICT (message_id, user_id) DO NOTHING
    `;
  }
);

export const getConversationMessages = api<{ conversation_id: number }, { messages: Message[] }>(
  { auth: true, expose: true, method: "GET", path: "/conversations/:conversation_id/messages" },
  async ({ conversation_id }) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Verify user is participant
    const conversation = await db.queryRow`
      SELECT id FROM conversations 
      WHERE id = ${conversation_id} AND ${userId} = ANY(participants)
    `;

    if (!conversation) {
      throw APIError.notFound("Conversation not found or access denied");
    }

    // Get messages with read status
    const messagesQuery = db.query<Message>`
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.content,
        m.message_type,
        m.attachments,
        m.created_at,
        EXISTS(
          SELECT 1 FROM message_read_status mrs 
          WHERE mrs.message_id = m.id AND mrs.user_id = ${userId}
        ) as is_read_by_current_user,
        (
          SELECT COUNT(*) FROM message_read_status mrs 
          WHERE mrs.message_id = m.id
        ) as read_by_count
      FROM messages m
      WHERE m.conversation_id = ${conversation_id}
      ORDER BY m.created_at ASC
    `;

    const messages: Message[] = [];
    for await (const message of messagesQuery) {
      messages.push(message);
    }

    return { messages };
  }
);

export const getConversations = api<void, { conversations: ConversationSummary[] }>(
  { auth: true, expose: true, method: "GET", path: "/conversations" },
  async () => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    const conversationsQuery = db.query<ConversationSummary>`
      WITH conversation_data AS (
        SELECT 
          c.id,
          c.project_id,
          c.title,
          c.type,
          c.participants,
          c.updated_at,
          (
            SELECT m.content 
            FROM messages m 
            WHERE m.conversation_id = c.id 
            ORDER BY m.created_at DESC 
            LIMIT 1
          ) as last_message,
          (
            SELECT m.created_at 
            FROM messages m 
            WHERE m.conversation_id = c.id 
            ORDER BY m.created_at DESC 
            LIMIT 1
          ) as last_message_at,
          (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.conversation_id = c.id
            AND NOT EXISTS (
              SELECT 1 FROM message_read_status mrs
              WHERE mrs.message_id = m.id AND mrs.user_id = ${userId}
            )
          ) as unread_count
        FROM conversations c
        WHERE ${userId} = ANY(c.participants) AND c.is_active = true
      )
      SELECT * FROM conversation_data
      ORDER BY 
        CASE WHEN last_message_at IS NOT NULL THEN last_message_at ELSE updated_at END DESC
    `;

    const conversations: ConversationSummary[] = [];
    for await (const conversation of conversationsQuery) {
      conversations.push(conversation);
    }

    return { conversations };
  }
);

export const createConversation = api<{
  project_id?: number;
  title?: string;
  type?: string;
  participant_ids: number[];
}, { conversation_id: number }>(
  { auth: true, expose: true, method: "POST", path: "/conversations" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Add current user to participants if not included
    const participants = [...new Set([userId, ...req.participant_ids])];

    // Validate all participants exist
    const userCount = await db.queryRow`
      SELECT COUNT(*) as count FROM users WHERE id = ANY(${participants})
    `;

    if (userCount?.count !== participants.length) {
      throw APIError.badRequest("Some participants do not exist");
    }

    const conversation = await db.queryRow`
      INSERT INTO conversations (project_id, title, type, participants)
      VALUES (${req.project_id}, ${req.title}, ${req.type || 'general'}, ${participants})
      RETURNING id
    `;

    if (!conversation) {
      throw APIError.internal("Failed to create conversation");
    }

    return { conversation_id: conversation.id };
  }
);