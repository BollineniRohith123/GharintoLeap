import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { Query } from "encore.dev/api";
import db from "../db";

export interface Portfolio {
  id: number;
  user_id: number;
  project_id?: number;
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  is_featured: boolean;
  is_public: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface PortfolioImage {
  id: number;
  portfolio_id: number;
  image_url: string;
  caption?: string;
  is_primary: boolean;
  sort_order: number;
  created_at: Date;
}

interface CreatePortfolioRequest {
  project_id?: number;
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  is_public?: boolean;
  images: {
    image_url: string;
    caption?: string;
    is_primary?: boolean;
  }[];
}

interface UpdatePortfolioRequest {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  is_public?: boolean;
  is_featured?: boolean;
  display_order?: number;
  images?: {
    id?: number;
    image_url: string;
    caption?: string;
    is_primary?: boolean;
  }[];
}

interface PortfolioListParams {
  page?: Query<number>;
  limit?: Query<number>;
  user_id?: Query<number>;
  category?: Query<string>;
  is_featured?: Query<boolean>;
  is_public?: Query<boolean>;
  tags?: Query<string>;
}

// Create new portfolio
export const createPortfolio = api<CreatePortfolioRequest, { portfolio: Portfolio; images: PortfolioImage[] }>(
  { auth: true, expose: true, method: "POST", path: "/users/portfolios" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Validate required fields
    if (!req.title || !req.images?.length) {
      throw APIError.badRequest("Title and at least one image are required");
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

      // Check if user has access to this project
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
      // Get next display order
      const maxOrder = await db.queryRow`
        SELECT COALESCE(MAX(display_order), 0) as max_order
        FROM portfolios 
        WHERE user_id = ${auth.userID}
      `;

      const displayOrder = (maxOrder?.max_order || 0) + 1;

      // Create portfolio
      const portfolio = await db.queryRow<Portfolio>`
        INSERT INTO portfolios (
          user_id, project_id, title, description, category, tags,
          is_public, display_order
        ) VALUES (
          ${auth.userID}, ${req.project_id || null}, ${req.title}, ${req.description || null}, 
          ${req.category || null}, ${req.tags || []}, ${req.is_public !== false}, ${displayOrder}
        )
        RETURNING *
      `;

      // Create portfolio images
      const images: PortfolioImage[] = [];
      let hasPrimary = false;

      for (let i = 0; i < req.images.length; i++) {
        const imageReq = req.images[i];
        const isPrimary = imageReq.is_primary || (!hasPrimary && i === 0);
        
        if (isPrimary) hasPrimary = true;

        const image = await db.queryRow<PortfolioImage>`
          INSERT INTO portfolio_images (
            portfolio_id, image_url, caption, is_primary, sort_order
          ) VALUES (
            ${portfolio.id}, ${imageReq.image_url}, ${imageReq.caption || null}, 
            ${isPrimary}, ${i + 1}
          )
          RETURNING *
        `;
        
        images.push(image);
      }

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'create', 'portfolio', ${portfolio.id}, ${JSON.stringify(portfolio)})
      `;

      return { portfolio, images };

    } catch (error) {
      console.error('Portfolio creation error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to create portfolio");
    }
  }
);

// Get portfolio by ID
export const getPortfolio = api<{ id: number }, { portfolio: Portfolio; images: PortfolioImage[] }>(
  { auth: true, expose: true, method: "GET", path: "/users/portfolios/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Get portfolio
    const portfolio = await db.queryRow<Portfolio>`
      SELECT p.*, u.first_name || ' ' || u.last_name as owner_name
      FROM portfolios p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ${id}
    `;

    if (!portfolio) {
      throw APIError.notFound("Portfolio not found");
    }

    // Check access permissions
    const userId = parseInt(auth.userID);
    const hasAccess = portfolio.user_id === userId || 
                     portfolio.is_public ||
                     auth.permissions.includes('portfolios.view');

    if (!hasAccess) {
      throw APIError.forbidden("Access denied to this portfolio");
    }

    // Get portfolio images
    const imagesQuery = db.query<PortfolioImage>`
      SELECT * FROM portfolio_images 
      WHERE portfolio_id = ${id} 
      ORDER BY is_primary DESC, sort_order
    `;

    const images: PortfolioImage[] = [];
    for await (const image of imagesQuery) {
      images.push(image);
    }

    return { portfolio, images };
  }
);

// List portfolios with filtering
export const listPortfolios = api<PortfolioListParams, { portfolios: any[]; total: number; page: number; limit: number }>(
  { auth: true, expose: true, method: "GET", path: "/users/portfolios" },
  async (params) => {
    const auth = getAuthData()!;
    
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // User filter
    if (params.user_id) {
      whereClause += ` AND p.user_id = $${paramIndex}`;
      queryParams.push(params.user_id);
      paramIndex++;
    } else {
      // If no specific user, only show public portfolios unless user has admin permissions
      const userId = parseInt(auth.userID);
      if (!auth.permissions.includes('portfolios.view')) {
        whereClause += ` AND (p.is_public = true OR p.user_id = $${paramIndex})`;
        queryParams.push(userId);
        paramIndex++;
      }
    }

    // Category filter
    if (params.category) {
      whereClause += ` AND p.category = $${paramIndex}`;
      queryParams.push(params.category);
      paramIndex++;
    }

    // Featured filter
    if (params.is_featured !== undefined) {
      whereClause += ` AND p.is_featured = $${paramIndex}`;
      queryParams.push(params.is_featured);
      paramIndex++;
    }

    // Public filter
    if (params.is_public !== undefined) {
      whereClause += ` AND p.is_public = $${paramIndex}`;
      queryParams.push(params.is_public);
      paramIndex++;
    }

    // Tags filter
    if (params.tags) {
      whereClause += ` AND $${paramIndex} = ANY(p.tags)`;
      queryParams.push(params.tags);
      paramIndex++;
    }

    try {
      // Get portfolios with primary image
      const portfoliosQuery = `
        SELECT 
          p.*,
          u.first_name || ' ' || u.last_name as owner_name,
          u.city as owner_city,
          pi.image_url as primary_image,
          pi.caption as primary_image_caption,
          proj.title as project_title
        FROM portfolios p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN portfolio_images pi ON p.id = pi.portfolio_id AND pi.is_primary = true
        LEFT JOIN projects proj ON p.project_id = proj.id
        ${whereClause}
        ORDER BY p.is_featured DESC, p.display_order, p.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const portfoliosResult = await db.query(portfoliosQuery, ...queryParams);
      const portfolios: any[] = [];
      for await (const portfolio of portfoliosResult) {
        portfolios.push({
          id: portfolio.id,
          user_id: portfolio.user_id,
          project_id: portfolio.project_id,
          title: portfolio.title,
          description: portfolio.description,
          category: portfolio.category,
          tags: portfolio.tags,
          is_featured: portfolio.is_featured,
          is_public: portfolio.is_public,
          display_order: portfolio.display_order,
          created_at: portfolio.created_at,
          updated_at: portfolio.updated_at,
          owner_name: portfolio.owner_name,
          owner_city: portfolio.owner_city,
          primary_image: portfolio.primary_image,
          primary_image_caption: portfolio.primary_image_caption,
          project_title: portfolio.project_title
        });
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM portfolios p JOIN users u ON p.user_id = u.id ${whereClause}`;
      const countResult = await db.query(countQuery, ...queryParams.slice(0, -2));
      let total = 0;
      for await (const row of countResult) {
        total = parseInt(row.total);
        break;
      }

      return {
        portfolios,
        total,
        page,
        limit
      };

    } catch (error) {
      console.error('List portfolios error:', error);
      throw APIError.internal("Failed to fetch portfolios");
    }
  }
);

// Update portfolio
export const updatePortfolio = api<{ id: number } & UpdatePortfolioRequest, { portfolio: Portfolio; images: PortfolioImage[] }>(
  { auth: true, expose: true, method: "PUT", path: "/users/portfolios/:id" },
  async ({ id, ...req }) => {
    const auth = getAuthData()!;
    
    // Get existing portfolio
    const existingPortfolio = await db.queryRow<Portfolio>`
      SELECT * FROM portfolios WHERE id = ${id}
    `;

    if (!existingPortfolio) {
      throw APIError.notFound("Portfolio not found");
    }

    // Check permissions
    const userId = parseInt(auth.userID);
    const canEdit = existingPortfolio.user_id === userId || 
                   auth.permissions.includes('portfolios.manage');

    if (!canEdit) {
      throw APIError.forbidden("Access denied to edit this portfolio");
    }

    // Only admins can set featured status
    if (req.is_featured !== undefined && !auth.permissions.includes('portfolios.admin')) {
      delete req.is_featured;
    }

    try {
      // Update images if provided
      if (req.images) {
        // Delete existing images
        await db.exec`DELETE FROM portfolio_images WHERE portfolio_id = ${id}`;
        
        // Create new images
        let hasPrimary = false;
        for (let i = 0; i < req.images.length; i++) {
          const imageReq = req.images[i];
          const isPrimary = imageReq.is_primary || (!hasPrimary && i === 0);
          
          if (isPrimary) hasPrimary = true;

          await db.exec`
            INSERT INTO portfolio_images (
              portfolio_id, image_url, caption, is_primary, sort_order
            ) VALUES (
              ${id}, ${imageReq.image_url}, ${imageReq.caption || null}, 
              ${isPrimary}, ${i + 1}
            )
          `;
        }
      }

      // Update portfolio
      const portfolio = await db.queryRow<Portfolio>`
        UPDATE portfolios SET
          title = COALESCE(${req.title}, title),
          description = COALESCE(${req.description}, description),
          category = COALESCE(${req.category}, category),
          tags = COALESCE(${req.tags}, tags),
          is_public = COALESCE(${req.is_public}, is_public),
          is_featured = COALESCE(${req.is_featured}, is_featured),
          display_order = COALESCE(${req.display_order}, display_order),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Get updated images
      const imagesQuery = db.query<PortfolioImage>`
        SELECT * FROM portfolio_images 
        WHERE portfolio_id = ${id} 
        ORDER BY is_primary DESC, sort_order
      `;

      const images: PortfolioImage[] = [];
      for await (const image of imagesQuery) {
        images.push(image);
      }

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES (${auth.userID}, 'update', 'portfolio', ${id}, ${JSON.stringify(existingPortfolio)}, ${JSON.stringify(portfolio)})
      `;

      return { portfolio, images };

    } catch (error) {
      console.error('Portfolio update error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to update portfolio");
    }
  }
);

// Delete portfolio
export const deletePortfolio = api<{ id: number }, { success: boolean; message: string }>(
  { auth: true, expose: true, method: "DELETE", path: "/users/portfolios/:id" },
  async ({ id }) => {
    const auth = getAuthData()!;
    
    // Get portfolio
    const portfolio = await db.queryRow<Portfolio>`
      SELECT * FROM portfolios WHERE id = ${id}
    `;

    if (!portfolio) {
      throw APIError.notFound("Portfolio not found");
    }

    // Check permissions
    const userId = parseInt(auth.userID);
    const canDelete = portfolio.user_id === userId || 
                     auth.permissions.includes('portfolios.manage');

    if (!canDelete) {
      throw APIError.forbidden("Access denied to delete this portfolio");
    }

    try {
      // Delete portfolio (images will be deleted by CASCADE)
      await db.exec`DELETE FROM portfolios WHERE id = ${id}`;

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values)
        VALUES (${auth.userID}, 'delete', 'portfolio', ${id}, ${JSON.stringify(portfolio)})
      `;

      return {
        success: true,
        message: "Portfolio deleted successfully"
      };

    } catch (error) {
      console.error('Portfolio deletion error:', error);
      throw APIError.internal("Failed to delete portfolio");
    }
  }
);

// Get portfolio categories
export const getPortfolioCategories = api<{}, { categories: string[] }>(
  { auth: true, expose: true, method: "GET", path: "/users/portfolios/categories" },
  async () => {
    try {
      const categoriesQuery = db.query`
        SELECT DISTINCT category
        FROM portfolios 
        WHERE category IS NOT NULL AND is_public = true
        ORDER BY category
      `;

      const categories: string[] = [];
      for await (const row of categoriesQuery) {
        if (row.category) {
          categories.push(row.category);
        }
      }

      return { categories };

    } catch (error) {
      console.error('Get portfolio categories error:', error);
      throw APIError.internal("Failed to fetch portfolio categories");
    }
  }
);

// Get popular tags
export const getPopularTags = api<{}, { tags: { tag: string; count: number }[] }>(
  { auth: true, expose: true, method: "GET", path: "/users/portfolios/tags" },
  async () => {
    try {
      const tagsQuery = `
        SELECT 
          unnest(tags) as tag,
          COUNT(*) as count
        FROM portfolios 
        WHERE is_public = true AND array_length(tags, 1) > 0
        GROUP BY unnest(tags)
        ORDER BY count DESC, tag
        LIMIT 50
      `;

      const tagsResult = await db.query(tagsQuery);
      const tags: { tag: string; count: number }[] = [];

      for await (const row of tagsResult) {
        tags.push({
          tag: row.tag,
          count: parseInt(row.count || '0')
        });
      }

      return { tags };

    } catch (error) {
      console.error('Get popular tags error:', error);
      throw APIError.internal("Failed to fetch popular tags");
    }
  }
);

// Reorder portfolios
export const reorderPortfolios = api<{ portfolio_orders: { id: number; display_order: number }[] }, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/users/portfolios/reorder" },
  async (req) => {
    const auth = getAuthData()!;
    
    if (!req.portfolio_orders?.length) {
      throw APIError.badRequest("Portfolio orders are required");
    }

    try {
      // Update display orders
      for (const order of req.portfolio_orders) {
        // Verify user owns this portfolio
        const portfolio = await db.queryRow`
          SELECT user_id FROM portfolios WHERE id = ${order.id}
        `;

        if (!portfolio || portfolio.user_id !== parseInt(auth.userID)) {
          throw APIError.forbidden("Access denied to reorder this portfolio");
        }

        await db.exec`
          UPDATE portfolios 
          SET display_order = ${order.display_order}, updated_at = NOW()
          WHERE id = ${order.id}
        `;
      }

      // Log activity
      await db.exec`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES (${auth.userID}, 'reorder', 'portfolio', 0, ${JSON.stringify(req.portfolio_orders)})
      `;

      return { success: true };

    } catch (error) {
      console.error('Reorder portfolios error:', error);
      throw error instanceof APIError ? error : APIError.internal("Failed to reorder portfolios");
    }
  }
);
