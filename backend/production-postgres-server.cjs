// Production PostgreSQL Server for Gharinto Leap (JavaScript version)
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 4000;

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'gharinto_db',
  password: 'postgres',
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database:', err);
    process.exit(1);
  } else {
    console.log('✅ Connected to PostgreSQL database successfully');
    release();
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secure_jwt_secret_change_in_production';

// Auth middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token missing or invalid format' });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token || token.trim() === '') {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user with roles and permissions from database
    const userQuery = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        array_agg(DISTINCT r.name) as roles,
        array_agg(DISTINCT p.name) as permissions
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1 AND u.is_active = true
      GROUP BY u.id, u.email, u.first_name, u.last_name
    `;
    
    const result = await pool.query(userQuery, [decoded.userID]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }
    
    req.user = {
      ...result.rows[0],
      roles: result.rows[0].roles?.filter(Boolean) || [],
      permissions: result.rows[0].permissions?.filter(Boolean) || []
    };
    
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'postgresql',
    version: '1.0.0'
  });
});

app.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    res.json({ 
      status: 'ok', 
      database: 'postgresql',
      timestamp: new Date().toISOString(),
      db_time: result.rows[0].current_time,
      pg_version: result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'postgresql',
      error: error.message 
    });
  }
});

// Authentication endpoints
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user from database
    const userQuery = `
      SELECT 
        u.id,
        u.email,
        u.password_hash,
        u.first_name,
        u.last_name,
        u.is_active
      FROM users u
      WHERE u.email = $1
    `;
    
    const userResult = await pool.query(userQuery, [email.toLowerCase().trim()]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is disabled' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Get user roles
    const rolesQuery = `
      SELECT r.name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
    `;
    
    const rolesResult = await pool.query(rolesQuery, [user.id]);
    const roles = rolesResult.rows.map(row => row.name);
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userID: user.id.toString(),
        email: user.email,
        roles: roles
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Log login event
    await pool.query(
      `INSERT INTO analytics_events (event_type, user_id, properties, created_at)
       VALUES ('user_login', $1, $2, NOW())`,
      [user.id, JSON.stringify({ method: 'email', ip: req.ip })]
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: roles
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User profile endpoint
app.get('/users/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: user.roles,
      permissions: user.permissions,
      isActive: true
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User menus endpoint
app.get('/menus/user', authenticateToken, async (req, res) => {
  try {
    const menusQuery = `
      SELECT DISTINCT 
        m.id,
        m.name,
        m.display_name,
        m.icon,
        m.path,
        m.parent_id,
        m.sort_order,
        m.is_active
      FROM menus m
      INNER JOIN role_menus rm ON m.id = rm.menu_id
      INNER JOIN user_roles ur ON rm.role_id = ur.role_id
      WHERE ur.user_id = $1
      AND m.is_active = true 
      AND rm.can_view = true
      ORDER BY m.sort_order, m.display_name
    `;
    
    const result = await pool.query(menusQuery, [req.user.id]);
    
    // Build hierarchical menu structure
    const menuMap = new Map();
    const rootMenus = [];
    
    // First pass: create all menu items
    result.rows.forEach(row => {
      const menuItem = {
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        icon: row.icon,
        path: row.path,
        parentId: row.parent_id,
        sortOrder: row.sort_order,
        children: []
      };
      menuMap.set(row.id, menuItem);
    });
    
    // Second pass: build hierarchy
    menuMap.forEach(menuItem => {
      if (menuItem.parentId) {
        const parent = menuMap.get(menuItem.parentId);
        if (parent) {
          parent.children.push(menuItem);
        }
      } else {
        rootMenus.push(menuItem);
      }
    });
    
    // Sort menus
    rootMenus.sort((a, b) => a.sortOrder - b.sortOrder);
    rootMenus.forEach(menu => {
      if (menu.children.length > 0) {
        menu.children.sort((a, b) => a.sortOrder - b.sortOrder);
      }
    });
    
    res.json({ menus: rootMenus });
  } catch (error) {
    console.error('Menus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User permissions endpoint
app.get('/rbac/user-permissions', authenticateToken, async (req, res) => {
  try {
    res.json({
      permissions: req.user.permissions
    });
  } catch (error) {
    console.error('Permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leads endpoint
app.get('/leads', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    // Role-based filtering
    if (req.user.roles.includes('interior_designer')) {
      whereClause += ` AND l.assigned_to = $${paramIndex}`;
      params.push(req.user.id);
      paramIndex++;
    }
    
    // Status filtering
    if (req.query.status) {
      whereClause += ` AND l.status = $${paramIndex}`;
      params.push(req.query.status);
      paramIndex++;
    }
    
    const leadsQuery = `
      SELECT 
        l.*,
        u.first_name as assigned_first_name,
        u.last_name as assigned_last_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      ${whereClause}
      ORDER BY l.score DESC, l.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const leadsResult = await pool.query(leadsQuery, params);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM leads l
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    
    const leads = leadsResult.rows.map(lead => ({
      id: lead.id,
      source: lead.source,
      firstName: lead.first_name,
      lastName: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      budgetMin: lead.budget_min,
      budgetMax: lead.budget_max,
      projectType: lead.project_type,
      propertyType: lead.property_type,
      timeline: lead.timeline,
      description: lead.description,
      score: lead.score,
      status: lead.status,
      assignedTo: lead.assigned_to ? {
        id: lead.assigned_to,
        name: `${lead.assigned_first_name} ${lead.assigned_last_name}`
      } : null,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at
    }));
    
    res.json({
      leads,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    });
  } catch (error) {
    console.error('Leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics dashboard endpoint
app.get('/analytics/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get basic stats
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM leads) as total_leads,
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COALESCE(SUM(budget), 0) FROM projects) as total_revenue,
        (SELECT COUNT(*) FROM projects WHERE status IN ('planning', 'design', 'execution')) as active_projects,
        (SELECT COUNT(*) FROM leads WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as leads_this_month,
        (SELECT COUNT(*) FROM projects WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as projects_this_month,
        (SELECT COALESCE(SUM(budget), 0) FROM projects WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as revenue_this_month
    `;
    
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];
    
    // Calculate conversion rate
    const totalLeads = parseInt(stats.total_leads) || 0;
    const totalProjects = parseInt(stats.total_projects) || 0;
    const conversionRate = totalLeads > 0 ? ((totalProjects / totalLeads) * 100).toFixed(1) : '0.0';
    
    res.json({
      totalLeads: parseInt(stats.total_leads) || 0,
      totalProjects: parseInt(stats.total_projects) || 0,
      totalRevenue: parseInt(stats.total_revenue) || 0,
      activeProjects: parseInt(stats.active_projects) || 0,
      conversionRate: parseFloat(conversionRate),
      leadsThisMonth: parseInt(stats.leads_this_month) || 0,
      projectsThisMonth: parseInt(stats.projects_this_month) || 0,
      revenueThisMonth: parseInt(stats.revenue_this_month) || 0
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enhanced Materials Management Endpoints
app.get('/materials/categories', authenticateToken, async (req, res) => {
  try {
    const categoriesQuery = `
      SELECT * FROM material_categories 
      ORDER BY name ASC
    `;
    const result = await pool.query(categoriesQuery);
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Material categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/materials', authenticateToken, async (req, res) => {
  try {
    const { 
      name, description, category_id, unit, base_price, 
      vendor_id, specifications, is_available 
    } = req.body;
    
    const insertQuery = `
      INSERT INTO materials (name, description, category_id, unit, base_price, vendor_id, specifications, is_available, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      name, description, category_id, unit, base_price,
      vendor_id, specifications, is_available, req.user.id
    ]);
    
    res.status(201).json({ material: result.rows[0] });
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/materials/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, description, category_id, unit, base_price, 
      vendor_id, specifications, is_available 
    } = req.body;
    
    const updateQuery = `
      UPDATE materials 
      SET name = $1, description = $2, category_id = $3, unit = $4, 
          base_price = $5, vendor_id = $6, specifications = $7, 
          is_available = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      name, description, category_id, unit, base_price,
      vendor_id, specifications, is_available, id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json({ material: result.rows[0] });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/materials/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const materialQuery = `
      SELECT m.*, mc.name as category_name, v.company_name as vendor_name
      FROM materials m
      LEFT JOIN material_categories mc ON m.category_id = mc.id
      LEFT JOIN vendors v ON m.vendor_id = v.id
      WHERE m.id = $1
    `;
    
    const result = await pool.query(materialQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json({ material: result.rows[0] });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vendor Management Endpoints
app.get('/vendors', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (req.query.category) {
      whereClause += ` AND v.category = $${paramIndex}`;
      params.push(req.query.category);
      paramIndex++;
    }
    
    if (req.query.is_active !== undefined) {
      whereClause += ` AND v.is_active = $${paramIndex}`;
      params.push(req.query.is_active === 'true');
      paramIndex++;
    }
    
    const vendorsQuery = `
      SELECT v.*, 
             COUNT(m.id) as material_count,
             AVG(vr.rating) as avg_rating,
             COUNT(vr.id) as review_count
      FROM vendors v
      LEFT JOIN materials m ON v.id = m.vendor_id
      LEFT JOIN vendor_reviews vr ON v.id = vr.vendor_id
      ${whereClause}
      GROUP BY v.id
      ORDER BY v.company_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    const result = await pool.query(vendorsQuery, params);
    
    const vendors = result.rows.map(vendor => ({
      id: vendor.id,
      companyName: vendor.company_name,
      contactPerson: vendor.contact_person,
      email: vendor.email,
      phone: vendor.phone,
      address: vendor.address,
      city: vendor.city,
      state: vendor.state,
      category: vendor.category,
      isActive: vendor.is_active,
      materialCount: parseInt(vendor.material_count) || 0,
      avgRating: vendor.avg_rating ? parseFloat(vendor.avg_rating).toFixed(1) : null,
      reviewCount: parseInt(vendor.review_count) || 0,
      createdAt: vendor.created_at
    }));
    
    res.json({ vendors });
  } catch (error) {
    console.error('Vendors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/vendors', authenticateToken, async (req, res) => {
  try {
    const {
      company_name, contact_person, email, phone, address,
      city, state, category, gst_number, pan_number
    } = req.body;
    
    const insertQuery = `
      INSERT INTO vendors (
        company_name, contact_person, email, phone, address,
        city, state, category, gst_number, pan_number, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      company_name, contact_person, email, phone, address,
      city, state, category, gst_number, pan_number, req.user.id
    ]);
    
    res.status(201).json({ vendor: result.rows[0] });
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/vendors/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const reviewsQuery = `
      SELECT vr.*, u.first_name, u.last_name
      FROM vendor_reviews vr
      JOIN users u ON vr.reviewer_id = u.id
      WHERE vr.vendor_id = $1
      ORDER BY vr.created_at DESC
    `;
    
    const result = await pool.query(reviewsQuery, [id]);
    
    const reviews = result.rows.map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      reviewer: `${review.first_name} ${review.last_name}`,
      createdAt: review.created_at
    }));
    
    res.json({ reviews });
  } catch (error) {
    console.error('Vendor reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/vendors/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    
    const insertQuery = `
      INSERT INTO vendor_reviews (vendor_id, reviewer_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [id, req.user.id, rating, comment]);
    
    res.status(201).json({ review: result.rows[0] });
  } catch (error) {
    console.error('Create vendor review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Projects endpoint
app.get('/projects', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    // Role-based filtering
    if (req.user.roles.includes('interior_designer')) {
      whereClause += ` AND p.designer_id = $${paramIndex}`;
      params.push(req.user.id);
      paramIndex++;
    } else if (req.user.roles.includes('project_manager')) {
      whereClause += ` AND p.project_manager_id = $${paramIndex}`;
      params.push(req.user.id);
      paramIndex++;
    } else if (req.user.roles.includes('customer')) {
      whereClause += ` AND p.client_id = $${paramIndex}`;
      params.push(req.user.id);
      paramIndex++;
    }
    
    const projectsQuery = `
      SELECT 
        p.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.email as client_email,
        d.first_name as designer_first_name,
        d.last_name as designer_last_name,
        pm.first_name as pm_first_name,
        pm.last_name as pm_last_name
      FROM projects p
      JOIN users c ON p.client_id = c.id
      LEFT JOIN users d ON p.designer_id = d.id
      LEFT JOIN users pm ON p.project_manager_id = pm.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const projectsResult = await pool.query(projectsQuery, params);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM projects p
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    
    const projects = projectsResult.rows.map(project => ({
      id: project.id,
      title: project.title,
      description: project.description,
      client: {
        id: project.client_id,
        name: `${project.client_first_name} ${project.client_last_name}`,
        email: project.client_email
      },
      designer: project.designer_id ? {
        id: project.designer_id,
        name: `${project.designer_first_name} ${project.designer_last_name}`
      } : null,
      projectManager: project.project_manager_id ? {
        id: project.project_manager_id,
        name: `${project.pm_first_name} ${project.pm_last_name}`
      } : null,
      status: project.status,
      priority: project.priority,
      budget: project.budget,
      estimatedCost: project.estimated_cost,
      actualCost: project.actual_cost,
      progressPercentage: project.progress_percentage,
      startDate: project.start_date,
      endDate: project.end_date,
      city: project.city,
      createdAt: project.created_at,
      updatedAt: project.updated_at
    }));
    
    res.json({
      projects,
      total: parseInt(countResult.rows[0].total),
      page,
      limit
    });
  } catch (error) {
    console.error('Projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Materials endpoint
app.get('/materials', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE m.is_active = true';
    const params = [];
    let paramIndex = 1;
    
    if (req.query.category) {
      whereClause += ` AND m.category = $${paramIndex}`;
      params.push(req.query.category);
      paramIndex++;
    }
    
    if (req.query.search) {
      whereClause += ` AND (m.name ILIKE $${paramIndex} OR m.description ILIKE $${paramIndex})`;
      params.push(`%${req.query.search}%`);
      paramIndex++;
    }
    
    const materialsQuery = `
      SELECT 
        m.*,
        v.company_name as vendor_name,
        v.rating as vendor_rating
      FROM materials m
      LEFT JOIN vendors v ON m.vendor_id = v.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const materialsResult = await pool.query(materialsQuery, params);
    
    const materials = materialsResult.rows.map(material => ({
      id: material.id,
      name: material.name,
      category: material.category,
      subcategory: material.subcategory,
      brand: material.brand,
      model: material.model,
      description: material.description,
      unit: material.unit,
      price: material.price,
      discountedPrice: material.discounted_price,
      stockQuantity: material.stock_quantity,
      minOrderQuantity: material.min_order_quantity,
      leadTimeDays: material.lead_time_days,
      vendor: material.vendor_id ? {
        id: material.vendor_id,
        name: material.vendor_name,
        rating: material.vendor_rating
      } : null,
      createdAt: material.created_at,
      updatedAt: material.updated_at
    }));
    
    res.json({
      materials,
      total: materials.length,
      page,
      limit
    });
  } catch (error) {
    console.error('Materials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Catch all other routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found', 
    path: req.originalUrl,
    method: req.method 
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  pool.end(() => {
    console.log('Database connection pool closed');
    process.exit(0);
  });
});

// Financial Management APIs
app.get('/wallets/balance', authenticateToken, async (req, res) => {
  try {
    const walletQuery = `
      SELECT * FROM user_wallets 
      WHERE user_id = $1
    `;
    
    const result = await pool.query(walletQuery, [req.user.id]);
    
    if (result.rows.length === 0) {
      // Create wallet if doesn't exist
      const createWalletQuery = `
        INSERT INTO user_wallets (user_id, balance)
        VALUES ($1, 0)
        RETURNING *
      `;
      const newWallet = await pool.query(createWalletQuery, [req.user.id]);
      return res.json({ wallet: newWallet.rows[0] });
    }
    
    res.json({ wallet: result.rows[0] });
  } catch (error) {
    console.error('Wallet balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const transactionsQuery = `
      SELECT * FROM wallet_transactions 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    const result = await pool.query(transactionsQuery, [req.user.id]);
    
    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Communication System APIs
app.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notificationsQuery = `
      SELECT * FROM notifications 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    const result = await pool.query(notificationsQuery, [req.user.id]);
    
    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Advanced Analytics APIs
app.get('/analytics/revenue', authenticateToken, async (req, res) => {
  try {
    const revenueQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(budget) as revenue,
        COUNT(*) as project_count
      FROM projects 
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `;
    
    const result = await pool.query(revenueQuery);
    
    res.json({ revenueData: result.rows });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/analytics/leads-funnel', authenticateToken, async (req, res) => {
  try {
    const funnelQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM leads 
      GROUP BY status
      ORDER BY 
        CASE status
          WHEN 'new' THEN 1
          WHEN 'contacted' THEN 2
          WHEN 'qualified' THEN 3
          WHEN 'proposal' THEN 4
          WHEN 'negotiation' THEN 5
          WHEN 'converted' THEN 6
          WHEN 'lost' THEN 7
        END
    `;
    
    const result = await pool.query(funnelQuery);
    
    res.json({ funnelData: result.rows });
  } catch (error) {
    console.error('Leads funnel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// RBAC Management APIs
app.get('/rbac/roles', authenticateToken, async (req, res) => {
  try {
    const rolesQuery = `
      SELECT r.*, COUNT(ur.user_id) as user_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      GROUP BY r.id
      ORDER BY r.name ASC
    `;
    
    const result = await pool.query(rolesQuery);
    
    res.json({ roles: result.rows });
  } catch (error) {
    console.error('Roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search API
app.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const results = { leads: [], projects: [], materials: [] };
    
    if (type === 'all' || type === 'leads') {
      const leadsQuery = `
        SELECT id, first_name, last_name, email, phone, status
        FROM leads 
        WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1
        LIMIT 10
      `;
      const leadsResult = await pool.query(leadsQuery, [`%${q}%`]);
      results.leads = leadsResult.rows;
    }
    
    if (type === 'all' || type === 'projects') {
      const projectsQuery = `
        SELECT p.id, p.title, p.description, p.status, u.first_name, u.last_name
        FROM projects p
        JOIN users u ON p.client_id = u.id
        WHERE p.title ILIKE $1 OR p.description ILIKE $1
        LIMIT 10
      `;
      const projectsResult = await pool.query(projectsQuery, [`%${q}%`]);
      results.projects = projectsResult.rows;
    }
    
    if (type === 'all' || type === 'materials') {
      const materialsQuery = `
        SELECT id, name, category, brand, model, price
        FROM materials 
        WHERE name ILIKE $1 OR brand ILIKE $1 OR model ILIKE $1
        LIMIT 10
      `;
      const materialsResult = await pool.query(materialsQuery, [`%${q}%`]);
      results.materials = materialsResult.rows;
    }
    
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  pool.end(() => {
    console.log('Database connection pool closed');
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PostgreSQL-powered server running on http://localhost:${PORT}`);
  console.log('📊 Database: PostgreSQL with real data');
  console.log('🔐 Authentication: JWT with database validation');
  console.log('📝 Available endpoints:');
  console.log('  GET  /health - API health check');
  console.log('  GET  /health/db - Database health check');
  console.log('  POST /auth/login - User authentication');
  console.log('  GET  /users/profile - User profile (authenticated)');
  console.log('  GET  /menus/user - User menus (authenticated)');
  console.log('  GET  /rbac/user-permissions - User permissions (authenticated)');
  console.log('  GET  /leads - Leads management (authenticated)');
  console.log('  GET  /projects - Projects management (authenticated)');
  console.log('  GET  /materials - Materials catalog (authenticated)');
  console.log('  GET  /analytics/dashboard - Analytics dashboard (authenticated)');
  console.log('\\n✅ Ready for production testing with PostgreSQL!');
});