import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface Conversation {
  id: string;
  title: string | null;
  projectId: string | null;
  participants: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  }>;
  lastMessage: {
    content: string;
    senderName: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  createdAt: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

// Retrieves conversations for the current user.
export const getConversations = api<void, ConversationsResponse>(
  { auth: true, expose: true, method: "GET", path: "/communications/conversations" },
  async () => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    const conversations = await db.queryAll<{
      id: number;
      title: string | null;
      project_id: number | null;
      participants: number[];
      created_at: string;
    }>`
      SELECT id, title, project_id, participants, created_at
      FROM conversations
      WHERE ${userId} = ANY(participants)
      ORDER BY created_at DESC
    `;

    const conversationsWithDetails = [];

    for (const conv of conversations) {
      // Get participant details
      const participants = await db.queryAll<{
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        avatar_url: string | null;
      }>`
        SELECT id, first_name, last_name, email, avatar_url
        FROM users
        WHERE id = ANY(${conv.participants})
      `;

      // Get last message
      const lastMessage = await db.queryRow<{
        content: string;
        sender_name: string;
        created_at: string;
      }>`
        SELECT m.content, u.first_name || ' ' || u.last_name as sender_name, m.created_at
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ${conv.id}
        ORDER BY m.created_at DESC
        LIMIT 1
      `;

      // Get unread count
      const unreadCount = await db.queryRow<{ count: number }>`
        SELECT COUNT(*) as count
        FROM messages m
        WHERE m.conversation_id = ${conv.id}
        AND m.sender_id != ${userId}
        AND m.created_at > COALESCE(
          (SELECT last_read_at FROM conversation_read_status WHERE conversation_id = ${conv.id} AND user_id = ${userId}),
          '1970-01-01'::timestamp
        )
      `;

      conversationsWithDetails.push({
        id: conv.id.toString(),
        title: conv.title,
        projectId: conv.project_id?.toString() || null,
        participants: participants.map(p => ({
          id: p.id.toString(),
          name: `${p.first_name} ${p.last_name}`,
          email: p.email,
          avatarUrl: p.avatar_url
        })),
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          senderName: lastMessage.sender_name,
          createdAt: lastMessage.created_at
        } : null,
        unreadCount: unreadCount?.count || 0,
        createdAt: conv.created_at
      });
    }

    return {
      conversations: conversationsWithDetails
    };
  }
);
