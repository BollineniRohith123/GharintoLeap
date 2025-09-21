import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";
import * as crypto from "crypto";

export interface FileUpload {
  id: string;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  entity_type?: string;
  entity_id?: number;
  is_public: boolean;
  created_at: Date;
  download_url?: string;
}

export interface UploadRequest {
  filename: string;
  content_type: string;
  entity_type?: string;
  entity_id?: number;
  is_public?: boolean;
  file_data: string; // base64 encoded file data
}

export interface UploadResponse {
  file_id: string;
  file_path: string;
}

export const uploadFile = api<UploadRequest, UploadResponse>(
  { auth: true, expose: true, method: "POST", path: "/files/upload" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Generate unique file ID and path
    const fileId = crypto.randomUUID();
    const ext = req.filename.split('.').pop() || '';
    const filename = `${fileId}.${ext}`;
    const filePath = `uploads/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${filename}`;

    // For now, we'll just store metadata without actual file storage
    // In a real implementation, you would save the file_data to disk or cloud storage
    const fileSize = Math.floor(req.file_data.length * 0.75); // Rough base64 size calculation

    // Store file metadata in database
    await db.exec`
      INSERT INTO file_uploads (id, user_id, filename, original_name, file_path, file_size, mime_type, entity_type, entity_id, is_public)
      VALUES (${fileId}, ${userId}, ${filename}, ${req.filename}, ${filePath}, ${fileSize}, ${req.content_type}, ${req.entity_type}, ${req.entity_id}, ${req.is_public || false})
    `;

    return {
      file_id: fileId,
      file_path: filePath
    };
  }
);

export const getFile = api<{ file_id: string }, FileUpload>(
  { auth: true, expose: true, method: "GET", path: "/files/:file_id" },
  async ({ file_id }) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    const file = await db.queryRow<FileUpload & { user_id: number }>`
      SELECT id, user_id, filename, original_name, file_path, file_size, mime_type, entity_type, entity_id, is_public, created_at
      FROM file_uploads 
      WHERE id = ${file_id}
    `;

    if (!file) {
      throw APIError.notFound("File not found");
    }

    // Check permissions - user can access if they uploaded it, it's public, or they have access to the entity
    let hasAccess = file.user_id === userId || file.is_public;

    if (!hasAccess && file.entity_type && file.entity_id) {
      // Check entity-specific access
      if (file.entity_type === 'project') {
        const projectAccess = await db.queryRow`
          SELECT 1 FROM projects 
          WHERE id = ${file.entity_id} 
          AND (client_id = ${userId} OR designer_id = ${userId} OR project_manager_id = ${userId})
        `;
        if (projectAccess) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this file");
    }

    // Generate download URL (mock for now)
    const download_url = `/api/files/${file_id}/download`;

    return {
      ...file,
      download_url
    };
  }
);

export const getFilesByEntity = api<{ 
  entity_type: string; 
  entity_id: number;
}, { files: FileUpload[] }>(
  { auth: true, expose: true, method: "GET", path: "/files/entity/:entity_type/:entity_id" },
  async ({ entity_type, entity_id }) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    // Check entity access
    let hasAccess = false;
    if (entity_type === 'project') {
      const projectAccess = await db.queryRow`
        SELECT 1 FROM projects 
        WHERE id = ${entity_id} 
        AND (client_id = ${userId} OR designer_id = ${userId} OR project_manager_id = ${userId})
      `;
      hasAccess = !!projectAccess;
    } else if (entity_type === 'user') {
      hasAccess = entity_id === userId;
    }

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this entity");
    }

    const filesQuery = db.query<FileUpload>`
      SELECT id, filename, original_name, file_path, file_size, mime_type, entity_type, entity_id, is_public, created_at
      FROM file_uploads 
      WHERE entity_type = ${entity_type} AND entity_id = ${entity_id}
      ORDER BY created_at DESC
    `;

    const files: FileUpload[] = [];
    for await (const file of filesQuery) {
      files.push({
        ...file,
        download_url: `/api/files/${file.id}/download`
      });
    }

    return { files };
  }
);

export const deleteFile = api<{ file_id: string }, void>(
  { auth: true, expose: true, method: "DELETE", path: "/files/:file_id" },
  async ({ file_id }) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    const file = await db.queryRow<{ user_id: number }>`
      SELECT user_id FROM file_uploads WHERE id = ${file_id}
    `;

    if (!file) {
      throw APIError.notFound("File not found");
    }

    // Check permissions - only uploader or admin can delete
    const userRoles = auth.roles || [];
    const canDelete = file.user_id === userId || userRoles.includes('admin') || userRoles.includes('super_admin');

    if (!canDelete) {
      throw APIError.forbidden("Access denied to delete this file");
    }

    // Delete from database (in real implementation, also delete from storage)
    await db.exec`DELETE FROM file_uploads WHERE id = ${file_id}`;
  }
);

export const getUserFiles = api<{ 
  limit?: number; 
  offset?: number;
  entity_type?: string;
}, { files: FileUpload[]; total_count: number }>(
  { auth: true, expose: true, method: "GET", path: "/files" },
  async ({ limit = 20, offset = 0, entity_type }) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    let whereClause = "WHERE user_id = $1";
    const params = [userId, limit, offset];
    
    if (entity_type) {
      whereClause += " AND entity_type = $4";
      params.push(entity_type);
    }

    // Get files
    const filesQuery = db.rawQuery<FileUpload>(`
      SELECT id, filename, original_name, file_path, file_size, mime_type, entity_type, entity_id, is_public, created_at
      FROM file_uploads 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, ...params);

    const files: FileUpload[] = [];
    for await (const file of filesQuery) {
      files.push({
        ...file,
        download_url: `/api/files/${file.id}/download`
      });
    }

    // Get total count
    const countParams = entity_type ? [userId, entity_type] : [userId];
    const countWhereClause = entity_type ? "WHERE user_id = $1 AND entity_type = $2" : "WHERE user_id = $1";
    
    const totalResult = await db.rawQueryRow<{ count: number }>(`
      SELECT COUNT(*) as count FROM file_uploads ${countWhereClause}
    `, ...countParams);

    return {
      files,
      total_count: totalResult?.count || 0
    };
  }
);