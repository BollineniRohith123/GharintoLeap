import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

export interface ChatRoom {
  id: number;
  name: string;
  type: 'project' | 'support' | 'general';
  project_id?: number;
  participants: number[];
  is_active: boolean;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id: number;
  room_id: number;
  sender_id: number;
  message: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  file_url?: string;
  file_name?: string;
  reply_to_id?: number;
  is_edited: boolean;
  edited_at?: Date;
  created_at: Date;
}

interface CreateChatRoomRequest {
  name: string;
  type: 'project' | 'support' | 'general';
  project_id?: number;
  participants: number[];
}

interface SendMessageRequest {
  room_id: number;
  message: string;
  message_type?: 'text' | 'image' | 'file';
  file_url?: string;
  file_name?: string;
  reply_to_id?: number;
}

interface ChatRoomListParams {
  page?: Query<number>;
  limit?: Query<number>;
  type?: Query<string>;
  project_id?: Query<number>;
}

interface MessageListParams {
  room_id: Query<number>;
  page?: Query<number>;
  limit?: Query<number>;
  before_message_id?: Query<number>;
}

// Create chat room
export const createChatRoom = api<CreateChatRoomRequest, ChatRoom>(
  { auth: true, expose: true, method: "POST", path: "/communications/chat/rooms" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Validate required fields
    if (!req.name || !req.participants?.length) {
      throw APIError.badRequest("Room name and participants are required");
    }

    // Verify all participants exist
    for (const participantId of req.participants) {
      const participant = await db.queryRow`
        SELECT id FROM users WHERE id = ${participantId} AND is_active = true
      `;
      if (!participant) {
        throw APIError.badRequest(`Invalid participant ID: ${participantId}`);
      }
    }

    // Verify project if provided
    if (req.project_id) {
      const project = await db.queryRow`
        SELECT id, client_id, designer_id, project_manager_id 
        FROM projects 
        WHERE id = ${req.project_id}
      `;

      if (!project) {
        throw APIError.badRequest("Invalid project ID");
      }

      // Check if user has access to the project
      const userId = parseInt(auth.userID);
      const hasAccess = project.client_id === userId || 
                       project.designer_id === userId || 
                       project.project_manager_id === userId ||
                       auth.permissions.includes('projects.view');

      if (!hasAccess) {
        throw APIError.forbidden("Access denied to this project");
      }
    }

    try {
      // Mock chat room creation
      const chatRoom: ChatRoom = {
        id: Math.floor(Math.random() * 1000000),
        name: req.name,
        type: req.type,
        project_id: req.project_id,
        participants: [...req.participants, parseInt(auth.userID)], // Add creator to participants
        is_active: true,
        created_by: parseInt(auth.userID),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Log room creation
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'create', 'chat_room', ${chatRoom.id}, ${JSON.stringify(chatRoom)})
      `;

      return chatRoom;

    } catch (error) {
      console.error('Chat room creation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create chat room");
    }
  }
);

// Get chat room by ID
export const getChatRoom = api<{ id: number }, { room: ChatRoom; participants: any[] }>(
  { auth: true, expose: true, method: "GET", path: "/communications/chat/rooms/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Mock chat room data
    const room: ChatRoom = {
      id: id,
      name: "Project Discussion",
      type: "project",
      project_id: 1,
      participants: [1, 2, 3],
      is_active: true,
      created_by: 1,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
      updated_at: new Date()
    };

    // Check if user is a participant
    const userId = parseInt(auth.userID);
    if (!room.participants.includes(userId) && !auth.permissions.includes('chat.admin')) {
      throw APIError.forbidden("Access denied to this chat room");
    }

    // Get participant details
    const participantsQuery = db.query`
      SELECT id, first_name, last_name, email, avatar_url
      FROM users 
      WHERE id = ANY(${room.participants})
    `;

    const participants: any[] = [];
    for await (const participant of participantsQuery) {
      participants.push({
        id: participant.id,
        name: `${participant.first_name} ${participant.last_name}`,
        email: participant.email,
        avatar_url: participant.avatar_url
      });
    }

    return { room, participants };
  }
);

// List chat rooms for user
export const listChatRooms = api<ChatRoomListParams, { rooms: any[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/communications/chat/rooms" },
  async (params) => {
    const auth = getAuthData()!;
    
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const userId = parseInt(auth.userID);

    // Mock chat rooms data
    const mockRooms = [
      {
        id: 1,
        name: "Modern Living Room Project",
        type: "project",
        project_id: 1,
        participants: [1, 2, 3],
        is_active: true,
        created_by: 1,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
        last_message: "The design looks great! When can we start?",
        last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
        unread_count: 2
      },
      {
        id: 2,
        name: "Customer Support",
        type: "support",
        project_id: null,
        participants: [1, 4],
        is_active: true,
        created_by: 4,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        last_message: "Thank you for your help!",
        last_message_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        unread_count: 0
      }
    ];

    // Filter rooms where user is a participant
    let filteredRooms = mockRooms.filter(room => 
      room.participants.includes(userId) || auth.permissions.includes('chat.admin')
    );

    // Apply filters
    if (params.type) {
      filteredRooms = filteredRooms.filter(room => room.type === params.type);
    }

    if (params.project_id) {
      filteredRooms = filteredRooms.filter(room => room.project_id === params.project_id);
    }

    const startIndex = (page - 1) * limit;
    const paginatedRooms = filteredRooms.slice(startIndex, startIndex + limit);

    return {
      rooms: paginatedRooms,
      total: filteredRooms.length,
      page,
      limit
    };
  }
);

// Send message to chat room
export const sendMessage = api<SendMessageRequest, ChatMessage>(
  { auth: true, expose: true, method: "POST", path: "/communications/chat/messages" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Validate required fields
    if (!req.room_id || !req.message) {
      throw APIError.badRequest("Room ID and message are required");
    }

    // Check if user has access to the room (mock check)
    const userId = parseInt(auth.userID);
    
    try {
      // Mock message creation
      const message: ChatMessage = {
        id: Math.floor(Math.random() * 1000000),
        room_id: req.room_id,
        sender_id: userId,
        message: req.message,
        message_type: req.message_type || 'text',
        file_url: req.file_url,
        file_name: req.file_name,
        reply_to_id: req.reply_to_id,
        is_edited: false,
        edited_at: undefined,
        created_at: new Date()
      };

      // Log message sending
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'send_message', 'chat_message', ${message.id}, ${JSON.stringify(message)})
      `;

      return message;

    } catch (error) {
      console.error('Send message error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to send message");
    }
  }
);

// Get messages for a chat room
export const getRoomMessages = api<MessageListParams, { messages: any[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/communications/chat/rooms/:room_id/messages" },
  async (params) => {
    const auth = getAuthData()!;
    
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100);
    const userId = parseInt(auth.userID);

    // Mock messages data
    const mockMessages = [
      {
        id: 1,
        room_id: params.room_id,
        sender_id: 2,
        sender_name: "John Designer",
        sender_avatar: null,
        message: "Hi! I've uploaded the initial design concepts for your living room.",
        message_type: "text",
        file_url: null,
        file_name: null,
        reply_to_id: null,
        is_edited: false,
        edited_at: null,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      {
        id: 2,
        room_id: params.room_id,
        sender_id: 1,
        sender_name: "Client User",
        sender_avatar: null,
        message: "Thank you! Let me take a look.",
        message_type: "text",
        file_url: null,
        file_name: null,
        reply_to_id: 1,
        is_edited: false,
        edited_at: null,
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        id: 3,
        room_id: params.room_id,
        sender_id: 1,
        sender_name: "Client User",
        sender_avatar: null,
        message: "The design looks great! When can we start implementation?",
        message_type: "text",
        file_url: null,
        file_name: null,
        reply_to_id: null,
        is_edited: false,
        edited_at: null,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];

    // Filter messages by room and apply pagination
    let filteredMessages = mockMessages.filter(msg => msg.room_id === params.room_id);

    if (params.before_message_id) {
      filteredMessages = filteredMessages.filter(msg => msg.id < params.before_message_id);
    }

    // Sort by creation time (newest first for pagination, but reverse for display)
    filteredMessages.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    const startIndex = (page - 1) * limit;
    const paginatedMessages = filteredMessages.slice(startIndex, startIndex + limit);

    // Reverse for chronological order
    paginatedMessages.reverse();

    return {
      messages: paginatedMessages,
      total: filteredMessages.length,
      page,
      limit
    };
  }
);

// Edit message
export const editMessage = api<{ id: number; message: string }, ChatMessage>(
  { auth: true, expose: true, method: "PUT", path: "/communications/chat/messages/:id" },
  async ({ id, message }) => {
    const auth = getAuthData()!;
    
    if (!message) {
      throw APIError.badRequest("Message content is required");
    }

    const userId = parseInt(auth.userID);

    try {
      // Mock message editing
      const editedMessage: ChatMessage = {
        id: id,
        room_id: 1,
        sender_id: userId,
        message: message,
        message_type: 'text',
        file_url: undefined,
        file_name: undefined,
        reply_to_id: undefined,
        is_edited: true,
        edited_at: new Date(),
        created_at: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      };

      // Log message editing
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'edit_message', 'chat_message', ${id}, ${JSON.stringify({ message, edited_at: new Date() })})
      `;

      return editedMessage;

    } catch (error) {
      console.error('Edit message error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to edit message");
    }
  }
);

// Delete message
export const deleteMessage = api<{ id: number }, { success: boolean }>(
  { auth: true, expose: true, method: "DELETE", path: "/communications/chat/messages/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    try {
      // Log message deletion
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'delete_message', 'chat_message', ${id}, '{"deleted_at": "${new Date().toISOString()}"}')
      `;

      return { success: true };

    } catch (error) {
      console.error('Delete message error:', error);
      throw APIError.internal("Failed to delete message");
    }
  }
);

// Add participant to chat room
export const addParticipant = api<{ room_id: number; user_id: number }, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/communications/chat/rooms/:room_id/participants" },
  async ({ room_id, user_id }) => {
    const auth = getAuthData()!;
    
    // Verify user exists
    const user = await db.queryRow`
      SELECT id FROM users WHERE id = ${user_id} AND is_active = true
    `;
    if (!user) {
      throw APIError.badRequest("Invalid user ID");
    }

    try {
      // Log participant addition
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'add_participant', 'chat_room', ${room_id}, ${JSON.stringify({ added_user_id: user_id })})
      `;

      return { success: true };

    } catch (error) {
      console.error('Add participant error:', error);
      throw APIError.internal("Failed to add participant");
    }
  }
);

// Remove participant from chat room
export const removeParticipant = api<{ room_id: number; user_id: number }, { success: boolean }>(
  { auth: true, expose: true, method: "DELETE", path: "/communications/chat/rooms/:room_id/participants/:user_id" },
  async ({ room_id, user_id }) => {
    const auth = getAuthData()!;
    
    try {
      // Log participant removal
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'remove_participant', 'chat_room', ${room_id}, ${JSON.stringify({ removed_user_id: user_id })})
      `;

      return { success: true };

    } catch (error) {
      console.error('Remove participant error:', error);
      throw APIError.internal("Failed to remove participant");
    }
  }
);
