import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import db from "../db";

export interface SearchRequest {
  query: string;
  filters?: {
    entity_types?: string[];
    date_range?: {
      start: Date;
      end: Date;
    };
    status?: string[];
    assigned_to?: number[];
    city?: string[];
    min_amount?: number;
    max_amount?: number;
    tags?: string[];
  };
  sort?: {
    field: string;
    direction: 'ASC' | 'DESC';
  };
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: number;
  entity_type: string;
  title: string;
  description?: string;
  status?: string;
  created_at: Date;
  updated_at?: Date;
  metadata?: Record<string, any>;
  relevance_score?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  facets: {
    entity_types: { type: string; count: number }[];
    statuses: { status: string; count: number }[];
    cities: { city: string; count: number }[];
    date_ranges: { range: string; count: number }[];
  };
  suggestions?: string[];
}

export interface FilterOptions {
  entity_type: string;
  available_filters: {
    statuses?: string[];
    cities?: string[];
    users?: { id: number; name: string }[];
    date_ranges?: string[];
    amount_ranges?: { min: number; max: number; label: string }[];
  };
}

export const globalSearch = api<SearchRequest, SearchResponse>(
  { auth: true, expose: true, method: "POST", path: "/search" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = parseInt(auth.userID);

    if (!req.query || req.query.trim().length < 2) {
      throw APIError.badRequest("Search query must be at least 2 characters");
    }

    const searchTerm = req.query.trim();
    const limit = req.limit || 20;
    const offset = req.offset || 0;

    // Build search query based on user permissions and filters
    const searchResults: SearchResult[] = [];
    const facets = {
      entity_types: [] as { type: string; count: number }[],
      statuses: [] as { status: string; count: number }[],
      cities: [] as { city: string; count: number }[],
      date_ranges: [] as { range: string; count: number }[]
    };

    // Search Users (if permitted)
    if (auth.permissions.includes('users.view') && 
        (!req.filters?.entity_types || req.filters.entity_types.includes('users'))) {
      
      const userResults = await searchUsers(searchTerm, req.filters, userId);
      searchResults.push(...userResults);
    }

    // Search Projects
    if (auth.permissions.includes('projects.view') && 
        (!req.filters?.entity_types || req.filters.entity_types.includes('projects'))) {
      
      const projectResults = await searchProjects(searchTerm, req.filters, userId, auth);
      searchResults.push(...projectResults);
    }

    // Search Leads
    if (auth.permissions.includes('leads.view') && 
        (!req.filters?.entity_types || req.filters.entity_types.includes('leads'))) {
      
      const leadResults = await searchLeads(searchTerm, req.filters, userId, auth);
      searchResults.push(...leadResults);
    }

    // Search Materials
    if ((!req.filters?.entity_types || req.filters.entity_types.includes('materials'))) {
      const materialResults = await searchMaterials(searchTerm, req.filters, userId);
      searchResults.push(...materialResults);
    }

    // Sort results by relevance or specified field
    if (req.sort) {
      searchResults.sort((a, b) => {
        const aVal = (a as any)[req.sort!.field];
        const bVal = (b as any)[req.sort!.field];
        
        if (req.sort!.direction === 'DESC') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
    } else {
      // Sort by relevance score (if available) then by created_at
      searchResults.sort((a, b) => {
        if (a.relevance_score !== undefined && b.relevance_score !== undefined) {
          return b.relevance_score - a.relevance_score;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    // Generate facets
    const entityTypeCounts = new Map<string, number>();
    const statusCounts = new Map<string, number>();
    const cityCounts = new Map<string, number>();

    searchResults.forEach(result => {
      // Entity type facets
      entityTypeCounts.set(result.entity_type, (entityTypeCounts.get(result.entity_type) || 0) + 1);
      
      // Status facets
      if (result.status) {
        statusCounts.set(result.status, (statusCounts.get(result.status) || 0) + 1);
      }
      
      // City facets
      if (result.metadata?.city) {
        cityCounts.set(result.metadata.city, (cityCounts.get(result.metadata.city) || 0) + 1);
      }
    });

    facets.entity_types = Array.from(entityTypeCounts.entries()).map(([type, count]) => ({ type, count }));
    facets.statuses = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }));
    facets.cities = Array.from(cityCounts.entries()).map(([city, count]) => ({ city, count }));

    // Paginate results
    const paginatedResults = searchResults.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      total_count: searchResults.length,
      facets,
      suggestions: generateSearchSuggestions(searchTerm)
    };
  }
);

export const getFilterOptions = api<{ entity_type: string }, FilterOptions>(
  { auth: true, expose: true, method: "GET", path: "/search/filters/:entity_type" },
  async ({ entity_type }) => {
    const auth = getAuthData()!;

    const filterOptions: FilterOptions = {
      entity_type,
      available_filters: {}
    };

    switch (entity_type) {
      case 'projects':
        if (auth.permissions.includes('projects.view')) {
          const statuses = await db.queryAll<{ status: string }>`
            SELECT DISTINCT status FROM projects WHERE status IS NOT NULL
          `;
          const cities = await db.queryAll<{ city: string }>`
            SELECT DISTINCT city FROM projects WHERE city IS NOT NULL
          `;
          
          filterOptions.available_filters.statuses = statuses.map(s => s.status);
          filterOptions.available_filters.cities = cities.map(c => c.city);
          filterOptions.available_filters.amount_ranges = [
            { min: 0, max: 100000, label: 'Under ₹1L' },
            { min: 100000, max: 500000, label: '₹1L - ₹5L' },
            { min: 500000, max: 1000000, label: '₹5L - ₹10L' },
            { min: 1000000, max: 5000000, label: '₹10L - ₹50L' },
            { min: 5000000, max: Number.MAX_SAFE_INTEGER, label: 'Above ₹50L' }
          ];
        }
        break;

      case 'leads':
        if (auth.permissions.includes('leads.view')) {
          const statuses = await db.queryAll<{ status: string }>`
            SELECT DISTINCT status FROM leads WHERE status IS NOT NULL
          `;
          const cities = await db.queryAll<{ city: string }>`
            SELECT DISTINCT city FROM leads WHERE city IS NOT NULL
          `;
          
          filterOptions.available_filters.statuses = statuses.map(s => s.status);
          filterOptions.available_filters.cities = cities.map(c => c.city);
        }
        break;

      case 'materials':
        const categories = await db.queryAll<{ category: string }>`
          SELECT DISTINCT category FROM materials WHERE category IS NOT NULL AND is_active = true
        `;
        const cities = await db.queryAll<{ city: string }>`
          SELECT DISTINCT v.city FROM vendors v 
          JOIN materials m ON v.id = m.vendor_id 
          WHERE v.city IS NOT NULL AND m.is_active = true
        `;
        
        filterOptions.available_filters.statuses = categories.map(c => c.category);
        filterOptions.available_filters.cities = cities.map(c => c.city);
        break;

      default:
        throw APIError.badRequest("Unsupported entity type");
    }

    return filterOptions;
  }
);

async function searchUsers(
  searchTerm: string, 
  filters: any, 
  userId: number
): Promise<SearchResult[]> {
  let whereConditions = ["u.is_active = true"];
  let params: any[] = [];
  let paramIndex = 1;

  // Text search
  whereConditions.push(`(u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
  params.push(`%${searchTerm}%`);
  paramIndex++;

  // Apply filters
  if (filters?.city?.length) {
    whereConditions.push(`u.city = ANY($${paramIndex++})`);
    params.push(filters.city);
  }

  const query = `
    SELECT 
      u.id,
      'users'::text as entity_type,
      u.first_name || ' ' || u.last_name as title,
      u.email as description,
      CASE WHEN u.is_active THEN 'active' ELSE 'inactive' END as status,
      u.created_at,
      u.updated_at,
      json_build_object('city', u.city, 'phone', u.phone) as metadata
    FROM users u
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY u.created_at DESC
  `;

  return await db.rawQueryAll<SearchResult>(query, ...params);
}

async function searchProjects(
  searchTerm: string, 
  filters: any, 
  userId: number, 
  auth: any
): Promise<SearchResult[]> {
  let whereConditions = ["1=1"];
  let params: any[] = [];
  let paramIndex = 1;

  // Text search
  whereConditions.push(`(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
  params.push(`%${searchTerm}%`);
  paramIndex++;

  // User access control
  if (!auth.permissions.includes('projects.manage')) {
    whereConditions.push(`(p.client_id = $${paramIndex} OR p.designer_id = $${paramIndex} OR p.project_manager_id = $${paramIndex})`);
    params.push(userId);
    paramIndex++;
  }

  // Apply filters
  if (filters?.status?.length) {
    whereConditions.push(`p.status = ANY($${paramIndex++})`);
    params.push(filters.status);
  }

  if (filters?.city?.length) {
    whereConditions.push(`p.city = ANY($${paramIndex++})`);
    params.push(filters.city);
  }

  if (filters?.min_amount !== undefined) {
    whereConditions.push(`p.budget >= $${paramIndex++}`);
    params.push(filters.min_amount);
  }

  if (filters?.max_amount !== undefined) {
    whereConditions.push(`p.budget <= $${paramIndex++}`);
    params.push(filters.max_amount);
  }

  const query = `
    SELECT 
      p.id,
      'projects' as entity_type,
      p.title,
      p.description,
      p.status,
      p.created_at,
      p.updated_at,
      json_build_object(
        'city', p.city, 
        'budget', p.budget, 
        'progress', p.progress_percentage,
        'client_name', (SELECT first_name || ' ' || last_name FROM users WHERE id = p.client_id)
      ) as metadata
    FROM projects p
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY p.created_at DESC
  `;

  return await db.rawQueryAll<SearchResult>(query, ...params);
}

async function searchLeads(
  searchTerm: string, 
  filters: any, 
  userId: number, 
  auth: any
): Promise<SearchResult[]> {
  let whereConditions = ["1=1"];
  let params: any[] = [];
  let paramIndex = 1;

  // Text search
  whereConditions.push(`(l.first_name ILIKE $${paramIndex} OR l.last_name ILIKE $${paramIndex} OR l.email ILIKE $${paramIndex})`);
  params.push(`%${searchTerm}%`);
  paramIndex++;

  // User access control
  if (!auth.permissions.includes('leads.view') || auth.roles.includes('interior_designer')) {
    whereConditions.push(`l.assigned_to = $${paramIndex++}`);
    params.push(userId);
  }

  // Apply filters
  if (filters?.status?.length) {
    whereConditions.push(`l.status = ANY($${paramIndex++})`);
    params.push(filters.status);
  }

  if (filters?.city?.length) {
    whereConditions.push(`l.city = ANY($${paramIndex++})`);
    params.push(filters.city);
  }

  const query = `
    SELECT 
      l.id,
      'leads' as entity_type,
      l.first_name || ' ' || l.last_name as title,
      l.description,
      l.status,
      l.created_at,
      l.updated_at,
      json_build_object(
        'city', l.city, 
        'email', l.email, 
        'phone', l.phone, 
        'score', l.score,
        'source', l.source
      ) as metadata
    FROM leads l
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY l.score DESC, l.created_at DESC
  `;

  return await db.rawQueryAll<SearchResult>(query, ...params);
}

async function searchMaterials(
  searchTerm: string, 
  filters: any, 
  userId: number
): Promise<SearchResult[]> {
  let whereConditions = ["m.is_active = true"];
  let params: any[] = [];
  let paramIndex = 1;

  // Text search
  whereConditions.push(`(m.name ILIKE $${paramIndex} OR m.description ILIKE $${paramIndex} OR m.brand ILIKE $${paramIndex})`);
  params.push(`%${searchTerm}%`);
  paramIndex++;

  // Apply filters
  if (filters?.status?.length) {  // Using status as category filter for materials
    whereConditions.push(`m.category = ANY($${paramIndex++})`);
    params.push(filters.status);
  }

  if (filters?.city?.length) {
    whereConditions.push(`v.city = ANY($${paramIndex++})`);
    params.push(filters.city);
  }

  if (filters?.min_amount !== undefined) {
    whereConditions.push(`m.price >= $${paramIndex++}`);
    params.push(filters.min_amount);
  }

  if (filters?.max_amount !== undefined) {
    whereConditions.push(`m.price <= $${paramIndex++}`);
    params.push(filters.max_amount);
  }

  const query = `
    SELECT 
      m.id,
      'materials' as entity_type,
      m.name as title,
      m.description,
      CASE WHEN m.stock_quantity > 0 THEN 'available' ELSE 'out_of_stock' END as status,
      m.created_at,
      m.updated_at,
      json_build_object(
        'city', v.city, 
        'price', m.price, 
        'vendor', v.company_name, 
        'category', m.category,
        'brand', m.brand,
        'stock', m.stock_quantity
      ) as metadata
    FROM materials m
    JOIN vendors v ON m.vendor_id = v.id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY m.created_at DESC
  `;

  return await db.rawQueryAll<SearchResult>(query, ...params);
}

function generateSearchSuggestions(searchTerm: string): string[] {
  // Simple suggestion generation - in a real app, you might use a more sophisticated approach
  const suggestions: string[] = [];
  
  if (searchTerm.length >= 2) {
    suggestions.push(
      `${searchTerm} project`,
      `${searchTerm} design`,
      `${searchTerm} materials`,
      `${searchTerm} vendor`
    );
  }

  return suggestions;
}