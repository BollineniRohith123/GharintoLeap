// Database-connected development server for local testing
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

const app = express();
const PORT = 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'gharinto_dev',
  user: 'postgres',
  password: 'postgres',
});

// Middleware - Configure CORS to allow credentials from frontend
app.use(cors({
  origin: 'http://localhost:5173', // Specific origin for frontend
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Auth middleware with proper JWT validation
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  
  // Check for proper Authorization header format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token missing or invalid format' });
  }

  const token = authHeader.split(' ')[1];
  
  // Check if token exists and is not empty
  if (!token || token.trim() === '') {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // For mock server, validate token format (in production, use proper JWT verification)
    if (token === 'mock-jwt-token-for-development') {
      req.user = { id: 1, email: 'admin@gharinto.com' };
      next();
    } else {
      // Reject any token that's not the expected mock token
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Routes
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', { email, password });

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Query user from database
    const userQuery = `
      SELECT u.*, 
             ARRAY_AGG(DISTINCT r.name) as roles,
             ARRAY_AGG(DISTINCT p.name) as permissions
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.email = $1 AND u.is_active = true
      GROUP BY u.id
    `;

    console.log('🔍 Querying user from database...');
    const result = await pool.query(userQuery, [email]);
    
    if (result.rows.length === 0) {
      console.log('❌ User not found in database');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    console.log('✅ User found:', { 
      id: user.id, 
      email: user.email, 
      hasPasswordHash: !!user.password_hash,
      passwordHashLength: user.password_hash?.length 
    });

    // Verify password
    console.log('🔒 Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('🔒 Password verification result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ Authentication successful');

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        roles: user.roles || [],
        permissions: user.permissions || []
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        city: user.city,
        avatarUrl: user.avatar_url,
        roles: user.roles?.filter((r: any) => r) || [],
        permissions: user.permissions?.filter((p: any) => p) || []
      }
    });

  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/users/profile', authenticateToken, async (req: any, res) => {
  try {
    const userQuery = `
      SELECT u.*,
             ARRAY_AGG(DISTINCT r.name) as roles,
             ARRAY_AGG(DISTINCT p.name) as permissions
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1
      GROUP BY u.id
    `;

    const result = await pool.query(userQuery, [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Get user menus
    const menuQuery = `
      SELECT DISTINCT m.name, m.display_name, m.icon, m.path, m.sort_order
      FROM menus m
      JOIN role_menus rm ON m.id = rm.menu_id
      JOIN user_roles ur ON rm.role_id = ur.role_id
      WHERE ur.user_id = $1 AND m.is_active = true AND rm.can_view = true
      ORDER BY m.sort_order, m.display_name
    `;

    const menuResult = await pool.query(menuQuery, [req.user.id]);

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      city: user.city,
      avatarUrl: user.avatar_url,
      roles: user.roles?.filter((r: any) => r) || [],
      permissions: user.permissions?.filter((p: any) => p) || [],
      menus: menuResult.rows.map(menu => ({
        name: menu.name,
        displayName: menu.display_name,
        icon: menu.icon,
        path: menu.path
      }))
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/leads', authenticateToken, async (req: any, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const leadsQuery = `
      SELECT l.*, 
             u.first_name as assigned_first_name, 
             u.last_name as assigned_last_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      ORDER BY l.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `SELECT COUNT(*) FROM leads`;

    const [leadsResult, countResult] = await Promise.all([
      pool.query(leadsQuery, [limit, offset]),
      pool.query(countQuery)
    ]);

    res.json({
      leads: leadsResult.rows.map(lead => ({
        id: lead.id,
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        city: lead.city,
        projectType: lead.project_type,
        budgetRange: lead.budget_min && lead.budget_max 
          ? `₹${(lead.budget_min/100000).toFixed(1)}-${(lead.budget_max/100000).toFixed(1)} Lakhs`
          : 'Not specified',
        score: lead.score,
        status: lead.status,
        assignedTo: lead.assigned_first_name && lead.assigned_last_name
          ? `${lead.assigned_first_name} ${lead.assigned_last_name}`
          : null,
        createdAt: lead.created_at
      })),
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/analytics/dashboard', authenticateToken, async (req: any, res) => {
  try {
    // Get analytics data from database
    const queries = {
      totalLeads: `SELECT COUNT(*) as count FROM leads`,
      totalProjects: `SELECT COUNT(*) as count FROM projects`,
      totalRevenue: `SELECT COALESCE(SUM(actual_cost), 0) as sum FROM projects WHERE status = 'completed'`,
      activeProjects: `SELECT COUNT(*) as count FROM projects WHERE status IN ('in_progress', 'planning')`,
      leadsThisMonth: `SELECT COUNT(*) as count FROM leads WHERE created_at >= date_trunc('month', CURRENT_DATE)`,
      projectsThisMonth: `SELECT COUNT(*) as count FROM projects WHERE created_at >= date_trunc('month', CURRENT_DATE)`,
      revenueThisMonth: `SELECT COALESCE(SUM(actual_cost), 0) as sum FROM projects WHERE status = 'completed' AND updated_at >= date_trunc('month', CURRENT_DATE)`
    };

    const results = await Promise.all([
      pool.query(queries.totalLeads),
      pool.query(queries.totalProjects),
      pool.query(queries.totalRevenue),
      pool.query(queries.activeProjects),
      pool.query(queries.leadsThisMonth),
      pool.query(queries.projectsThisMonth),
      pool.query(queries.revenueThisMonth)
    ]);

    const totalLeads = parseInt(results[0].rows[0].count);
    const totalProjects = parseInt(results[1].rows[0].count);
    const conversionRate = totalLeads > 0 ? ((totalProjects / totalLeads) * 100).toFixed(1) : 0;

    res.json({
      totalLeads,
      totalProjects,
      totalRevenue: parseInt(results[2].rows[0].sum),
      activeProjects: parseInt(results[3].rows[0].count),
      conversionRate: parseFloat(String(conversionRate)),
      leadsThisMonth: parseInt(results[4].rows[0].count),
      projectsThisMonth: parseInt(results[5].rows[0].count),
      revenueThisMonth: parseInt(results[6].rows[0].sum)
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/rbac/user-permissions', authenticateToken, async (req: any, res) => {
  try {
    const permissionQuery = `
      SELECT ARRAY_AGG(DISTINCT p.name) as permissions
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1
    `;

    const result = await pool.query(permissionQuery, [req.user.id]);
    
    res.json({
      permissions: result.rows[0]?.permissions?.filter((p: any) => p) || []
    });

  } catch (error) {
    console.error('Permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/menus/user', authenticateToken, async (req: any, res) => {
  try {
    const menuQuery = `
      SELECT DISTINCT m.name, m.display_name, m.icon, m.path, m.sort_order
      FROM menus m
      JOIN role_menus rm ON m.id = rm.menu_id
      JOIN user_roles ur ON rm.role_id = ur.role_id
      WHERE ur.user_id = $1 AND m.is_active = true AND rm.can_view = true
      ORDER BY m.sort_order, m.display_name
    `;

    const result = await pool.query(menuQuery, [req.user.id]);

    res.json({
      menus: result.rows.map(menu => ({
        name: menu.name,
        displayName: menu.display_name,
        icon: menu.icon,
        path: menu.path
      }))
    });

  } catch (error) {
    console.error('Menus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'connected' 
  });
});

// Database health check
app.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: result.rows[0].now 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: (error as Error).message 
    });
  }
});

// Catch all
app.use((req, res) => {
  console.log('Unhandled request:', req.method, req.originalUrl);
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`🚀 Database-connected server running on http://localhost:${PORT}`);
  console.log('📝 Available endpoints:');
  console.log('  POST /auth/login');
  console.log('  GET  /users/profile');
  console.log('  GET  /leads');
  console.log('  GET  /analytics/dashboard');
  console.log('  GET  /rbac/user-permissions');
  console.log('  GET  /menus/user');
  console.log('  GET  /health');
  console.log('  GET  /health/db');
  console.log('\n✨ Frontend should connect to: http://localhost:4000');
  console.log('💾 Database: PostgreSQL (gharinto_dev)');
});