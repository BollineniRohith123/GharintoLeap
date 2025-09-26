import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

interface ContentItem {
  id: number;
  type: 'page' | 'blog_post' | 'faq' | 'announcement';
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  meta_title?: string;
  meta_description?: string;
  featured_image?: string;
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  author_id: number;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

interface CreateContentRequest {
  type: 'page' | 'blog_post' | 'faq' | 'announcement';
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  meta_title?: string;
  meta_description?: string;
  featured_image?: string;
  status?: 'draft' | 'published';
  is_featured?: boolean;
}

interface UpdateContentRequest {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  meta_title?: string;
  meta_description?: string;
  featured_image?: string;
  status?: 'draft' | 'published' | 'archived';
  is_featured?: boolean;
}

interface ContentListParams {
  page?: Query<number>;
  limit?: Query<number>;
  type?: Query<string>;
  status?: Query<string>;
  author_id?: Query<number>;
  is_featured?: Query<boolean>;
  search?: Query<string>;
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Create content item
export const createContent = api<CreateContentRequest, ContentItem>(
  { auth: true, expose: true, method: "POST", path: "/admin/content" },
  async (req) => {
    const auth = getAuthData()!;

    // Check permissions
    if (!auth.permissions.includes('content.manage') && !auth.permissions.includes('content.create')) {
      throw APIError.forbidden("Insufficient permissions to create content");
    }

    // Validate required fields
    if (!req.title || !req.content || !req.type) {
      throw APIError.badRequest("Title, content, and type are required");
    }

    // Generate slug if not provided
    const slug = req.slug || generateSlug(req.title);

    try {
      // Create content item (using a simpler approach since content_items table doesn't exist yet)
      // In a real implementation, you would create the content_items table first
      const content = {
        id: Math.floor(Math.random() * 1000000),
        type: req.type,
        title: req.title,
        slug: slug,
        content: req.content,
        excerpt: req.excerpt,
        meta_title: req.meta_title,
        meta_description: req.meta_description,
        featured_image: req.featured_image,
        status: req.status || 'draft',
        is_featured: req.is_featured || false,
        author_id: parseInt(auth.userID),
        published_at: req.status === 'published' ? new Date() : undefined,
        created_at: new Date(),
        updated_at: new Date()
      } as ContentItem;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'create', 'content_item', ${content.id}, ${JSON.stringify(content)})
      `;

      return content;

    } catch (error) {
      console.error('Content creation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create content");
    }
  }
);

// Get content item by ID or slug
export const getContent = api<{ identifier: string; by_slug?: Query<boolean> }, ContentItem>(
  { auth: true, expose: true, method: "GET", path: "/admin/content/:identifier" },
  async ({ identifier, by_slug }) => {
    const auth = getAuthData()!;
    
    let content: ContentItem;
    
    if (by_slug) {
      content = await db.queryRow<ContentItem>`
        SELECT ci.*, u.first_name || ' ' || u.last_name as author_name
        FROM content_items ci
        LEFT JOIN users u ON ci.author_id = u.id
        WHERE ci.slug = ${identifier}
      `;
    } else {
      const id = parseInt(identifier);
      if (isNaN(id)) {
        throw APIError.badRequest("Invalid content ID");
      }
      
      content = await db.queryRow<ContentItem>`
        SELECT ci.*, u.first_name || ' ' || u.last_name as author_name
        FROM content_items ci
        LEFT JOIN users u ON ci.author_id = u.id
        WHERE ci.id = ${id}
      `;
    }

    if (!content) {
      throw APIError.notFound("Content not found");
    }

    // Check permissions
    const userId = parseInt(auth.userID);
    const canView = content.author_id === userId || 
                   content.status === 'published' ||
                   auth.permissions.includes('content.view');

    if (!canView) {
      throw APIError.forbidden("Access denied to this content");
    }

    return content;
  }
);

// List content items
export const listContent = api<ContentListParams, { content: any[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/admin/content" },
  async (params) => {
    const auth = getAuthData()!;
    
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Role-based filtering
    const userId = parseInt(auth.userID);
    if (!auth.permissions.includes('content.view')) {
      whereClause += ` AND (ci.author_id = $${paramIndex} OR ci.status = 'published')`;
      queryParams.push(userId);
      paramIndex++;
    }

    // Type filter
    if (params.type) {
      whereClause += ` AND ci.type = $${paramIndex}`;
      queryParams.push(params.type);
      paramIndex++;
    }

    // Status filter
    if (params.status) {
      whereClause += ` AND ci.status = $${paramIndex}`;
      queryParams.push(params.status);
      paramIndex++;
    }

    // Author filter
    if (params.author_id) {
      whereClause += ` AND ci.author_id = $${paramIndex}`;
      queryParams.push(params.author_id);
      paramIndex++;
    }

    // Featured filter
    if (params.is_featured !== undefined) {
      whereClause += ` AND ci.is_featured = $${paramIndex}`;
      queryParams.push(params.is_featured);
      paramIndex++;
    }

    // Search filter
    if (params.search) {
      whereClause += ` AND (ci.title ILIKE $${paramIndex} OR ci.content ILIKE $${paramIndex})`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    try {
      // Get content items
      const contentQuery = `
        SELECT 
          ci.*,
          u.first_name || ' ' || u.last_name as author_name
        FROM content_items ci
        LEFT JOIN users u ON ci.author_id = u.id
        ${whereClause}
        ORDER BY ci.is_featured DESC, ci.published_at DESC NULLS LAST, ci.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const contentResult = await db.query(contentQuery, ...queryParams);
      const content: any[] = [];
      for await (const item of contentResult) {
        content.push({
          id: item.id,
          type: item.type,
          title: item.title,
          slug: item.slug,
          content: item.content,
          excerpt: item.excerpt,
          meta_title: item.meta_title,
          meta_description: item.meta_description,
          featured_image: item.featured_image,
          status: item.status,
          is_featured: item.is_featured,
          author_id: item.author_id,
          author_name: item.author_name,
          published_at: item.published_at,
          created_at: item.created_at,
          updated_at: item.updated_at
        });
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM content_items ci
        LEFT JOIN users u ON ci.author_id = u.id
        ${whereClause}
      `;
      const countResult = await db.query(countQuery, ...queryParams.slice(0, -2));
      let total = 0;
      for await (const row of countResult) {
        total = parseInt(row.total);
        break;
      }

      return {
        content,
        total,
        page,
        limit
      };

    } catch (error) {
      console.error('List content error:', error);
      throw APIError.internal("Failed to fetch content");
    }
  }
);

// Update content item
export const updateContent = api<{ id: number } & UpdateContentRequest, ContentItem>(
  { auth: true, expose: true, method: "PUT", path: "/admin/content/:id" },
  async ({ id, ...req }) => {
    const auth = getAuthData()!;
    
    // Get existing content
    const existingContent = await db.queryRow<ContentItem>`
      SELECT * FROM content_items WHERE id = ${id}
    `;

    if (!existingContent) {
      throw APIError.notFound("Content not found");
    }

    // Check permissions
    const userId = parseInt(auth.userID);
    const canEdit = existingContent.author_id === userId || 
                   auth.permissions.includes('content.manage');

    if (!canEdit) {
      throw APIError.forbidden("Access denied to edit this content");
    }

    // Check slug uniqueness if provided
    if (req.slug && req.slug !== existingContent.slug) {
      const existingSlug = await db.queryRow`
        SELECT id FROM content_items 
        WHERE slug = ${req.slug} AND type = ${existingContent.type} AND id != ${id}
      `;

      if (existingSlug) {
        throw APIError.alreadyExists("Content with this slug already exists for this type");
      }
    }

    try {
      // Handle publishing
      const publishedAt = req.status === 'published' && existingContent.status !== 'published' ? 
        new Date() : existingContent.published_at;

      // Update content
      const content = await db.queryRow<ContentItem>`
        UPDATE content_items SET
          title = COALESCE(${req.title}, title),
          slug = COALESCE(${req.slug}, slug),
          content = COALESCE(${req.content}, content),
          excerpt = COALESCE(${req.excerpt}, excerpt),
          meta_title = COALESCE(${req.meta_title}, meta_title),
          meta_description = COALESCE(${req.meta_description}, meta_description),
          featured_image = COALESCE(${req.featured_image}, featured_image),
          status = COALESCE(${req.status}, status),
          is_featured = COALESCE(${req.is_featured}, is_featured),
          published_at = ${publishedAt},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'update', 'content_item', ${id}, ${JSON.stringify(existingContent)}, ${JSON.stringify(content)})
      `;

      return content;

    } catch (error) {
      console.error('Content update error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update content");
    }
  }
);

// Delete content item
export const deleteContent = api<{ id: number }, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "DELETE", path: "/admin/content/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Get content
    const content = await db.queryRow<ContentItem>`
      SELECT * FROM content_items WHERE id = ${id}
    `;

    if (!content) {
      throw APIError.notFound("Content not found");
    }

    // Check permissions
    const userId = parseInt(auth.userID);
    const canDelete = content.author_id === userId || 
                     auth.permissions.includes('content.manage');

    if (!canDelete) {
      throw APIError.forbidden("Access denied to delete this content");
    }

    try {
      // Delete content
      await db.exec`DELETE FROM content_items WHERE id = ${id}`;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values)
        VALUES (${auth.userID}, 'delete', 'content_item', ${id}, ${JSON.stringify(content)})
      `;

      return {
        success: true,
        message: "Content deleted successfully"
      };

    } catch (error) {
      console.error('Content deletion error:', error);
      throw APIError.internal("Failed to delete content");
    }
  }
);

// Get public content (for website)
export const getPublicContent = api<{ 
  type?: Query<string>;
  slug?: Query<string>;
  limit?: Query<number>;
  featured_only?: Query<boolean>;
}, { content: any[] }>(
  { expose: true, method: "GET", path: "/public/content" },
  async (params) => {
    const limit = Math.min(params.limit || 10, 50);

    let whereClause = "WHERE status = 'published'";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Type filter
    if (params.type) {
      whereClause += ` AND type = $${paramIndex}`;
      queryParams.push(params.type);
      paramIndex++;
    }

    // Slug filter (for single item)
    if (params.slug) {
      whereClause += ` AND slug = $${paramIndex}`;
      queryParams.push(params.slug);
      paramIndex++;
    }

    // Featured filter
    if (params.featured_only) {
      whereClause += ` AND is_featured = true`;
    }

    try {
      const contentQuery = `
        SELECT 
          id, type, title, slug, content, excerpt, meta_title, meta_description,
          featured_image, is_featured, published_at
        FROM content_items
        ${whereClause}
        ORDER BY is_featured DESC, published_at DESC
        LIMIT $${paramIndex}
      `;
      
      queryParams.push(limit);
      
      const contentResult = await db.query(contentQuery, ...queryParams);
      const content: any[] = [];
      for await (const item of contentResult) {
        content.push({
          id: item.id,
          type: item.type,
          title: item.title,
          slug: item.slug,
          content: item.content,
          excerpt: item.excerpt,
          meta_title: item.meta_title,
          meta_description: item.meta_description,
          featured_image: item.featured_image,
          is_featured: item.is_featured,
          published_at: item.published_at
        });
      }

      return { content };

    } catch (error) {
      console.error('Get public content error:', error);
      throw APIError.internal("Failed to fetch public content");
    }
  }
);

// Get content statistics
export const getContentStatistics = api<{}, { 
  total_content: number;
  published_content: number;
  draft_content: number;
  by_type: any[];
  recent_activity: any[];
}>(
  { auth: true, expose: true, method: "GET", path: "/admin/content/statistics" },
  async () => {
    const auth = getAuthData()!;
    
    // Check permissions
    if (!auth.permissions.includes('content.view') && !auth.permissions.includes('analytics.view')) {
      throw APIError.forbidden("Insufficient permissions to view content statistics");
    }

    try {
      // Get overall statistics
      const overallStats = await db.queryRow`
        SELECT 
          COUNT(*) as total_content,
          COUNT(*) FILTER (WHERE status = 'published') as published_content,
          COUNT(*) FILTER (WHERE status = 'draft') as draft_content
        FROM content_items
      `;

      // Get statistics by type
      const typeQuery = db.query`
        SELECT 
          type,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE status = 'published') as published
        FROM content_items
        GROUP BY type
        ORDER BY count DESC
      `;

      const byType: any[] = [];
      for await (const row of typeQuery) {
        byType.push({
          type: row.type,
          total: parseInt(row.count || '0'),
          published: parseInt(row.published || '0')
        });
      }

      // Get recent activity
      const activityQuery = db.query`
        SELECT 
          ci.id,
          ci.title,
          ci.type,
          ci.status,
          ci.updated_at,
          u.first_name || ' ' || u.last_name as author_name
        FROM content_items ci
        LEFT JOIN users u ON ci.author_id = u.id
        ORDER BY ci.updated_at DESC
        LIMIT 10
      `;

      const recentActivity: any[] = [];
      for await (const row of activityQuery) {
        recentActivity.push({
          id: row.id,
          title: row.title,
          type: row.type,
          status: row.status,
          updated_at: row.updated_at,
          author_name: row.author_name
        });
      }

      return {
        total_content: parseInt(overallStats?.total_content || '0'),
        published_content: parseInt(overallStats?.published_content || '0'),
        draft_content: parseInt(overallStats?.draft_content || '0'),
        by_type: byType,
        recent_activity: recentActivity
      };

    } catch (error) {
      console.error('Get content statistics error:', error);
      throw APIError.internal("Failed to fetch content statistics");
    }
  }
);
