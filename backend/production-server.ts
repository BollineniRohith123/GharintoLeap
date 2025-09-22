// Production-ready server with comprehensive API coverage for Gharinto Interior Design Marketplace
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Auth middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token missing or invalid format' });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token || token.trim() === '') {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as any;
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Permission check middleware
const requirePermission = (permission: string) => {
  return (req: any, res: any, next: any) => {
    if (!req.user.permissions.includes(permission) && !req.user.permissions.includes('*')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// ==================== AUTHENTICATION ENDPOINTS ====================

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', { email });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

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

    const result = await pool.query(userQuery, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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

// ==================== USER MANAGEMENT ENDPOINTS ====================

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

app.get('/users', authenticateToken, requirePermission('users.view'), async (req: any, res) => {
  try {
    const { page = 1, limit = 20, role, city, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE u.id IS NOT NULL';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (role) {
      whereClause += ` AND r.name = $${paramIndex}`;
      queryParams.push(role);
      paramIndex++;
    }

    if (city) {
      whereClause += ` AND u.city ILIKE $${paramIndex}`;
      queryParams.push(`%${city}%`);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const usersQuery = `
      SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.phone, u.city, u.is_active, u.created_at,
             ARRAY_AGG(DISTINCT r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.phone, u.city, u.is_active, u.created_at
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
    `;

    const [usersResult, countResult] = await Promise.all([
      pool.query(usersQuery, [...queryParams, limit, offset]),
      pool.query(countQuery, queryParams)
    ]);

    res.json({
      users: usersResult.rows.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        city: user.city,
        isActive: user.is_active,
        roles: user.roles?.filter((r: any) => r) || [],
        createdAt: user.created_at
      })),
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/users', authenticateToken, requirePermission('users.create'), async (req: any, res) => {
  try {
    const { email, password, firstName, lastName, phone, city, roles } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, firstName, and lastName are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, city)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, phone, city, created_at
    `, [email, passwordHash, firstName, lastName, phone, city]);

    const newUser = userResult.rows[0];

    // Assign roles if provided
    if (roles && roles.length > 0) {
      for (const roleName of roles) {
        const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName]);
        if (roleResult.rows.length > 0) {
          await pool.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [newUser.id, roleResult.rows[0].id]
          );
        }
      }
    }

    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      phone: newUser.phone,
      city: newUser.city,
      roles: roles || [],
      createdAt: newUser.created_at
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/users/:id', authenticateToken, requirePermission('users.view'), async (req: any, res) => {
  try {
    const { id } = req.params;

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

    const result = await pool.query(userQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      city: user.city,
      avatarUrl: user.avatar_url,
      isActive: user.is_active,
      roles: user.roles?.filter((r: any) => r) || [],
      permissions: user.permissions?.filter((p: any) => p) || [],
      createdAt: user.created_at
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/users/:id', authenticateToken, requirePermission('users.edit'), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, city, isActive, roles } = req.body;

    // Update user basic info
    const updateResult = await pool.query(`
      UPDATE users 
      SET first_name = $1, last_name = $2, phone = $3, city = $4, is_active = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING id, email, first_name, last_name, phone, city, is_active, updated_at
    `, [firstName, lastName, phone, city, isActive, id]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = updateResult.rows[0];

    // Update roles if provided
    if (roles && Array.isArray(roles)) {
      // Remove existing roles
      await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
      
      // Add new roles
      for (const roleName of roles) {
        const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName]);
        if (roleResult.rows.length > 0) {
          await pool.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
            [id, roleResult.rows[0].id]
          );
        }
      }
    }

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      phone: updatedUser.phone,
      city: updatedUser.city,
      isActive: updatedUser.is_active,
      roles: roles || [],
      updatedAt: updatedUser.updated_at
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/users/:id', authenticateToken, requirePermission('users.delete'), async (req: any, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userExists = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (cascade will handle related records)
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PROJECT MANAGEMENT ENDPOINTS ====================

app.get('/projects', authenticateToken, requirePermission('projects.view'), async (req: any, res) => {
  try {
    const { page = 1, limit = 20, status, city, designerId, clientId } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Role-based filtering
    if (req.user.roles.includes('interior_designer')) {
      whereClause += ` AND p.designer_id = $${paramIndex}`;
      queryParams.push(req.user.id);
      paramIndex++;
    } else if (req.user.roles.includes('project_manager')) {
      whereClause += ` AND p.project_manager_id = $${paramIndex}`;
      queryParams.push(req.user.id);
      paramIndex++;
    } else if (req.user.roles.includes('customer')) {
      whereClause += ` AND p.client_id = $${paramIndex}`;
      queryParams.push(req.user.id);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (city) {
      whereClause += ` AND p.city = $${paramIndex}`;
      queryParams.push(city);
      paramIndex++;
    }

    if (designerId) {
      whereClause += ` AND p.designer_id = $${paramIndex}`;
      queryParams.push(designerId);
      paramIndex++;
    }

    if (clientId) {
      whereClause += ` AND p.client_id = $${paramIndex}`;
      queryParams.push(clientId);
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

    const countQuery = `
      SELECT COUNT(*) as total
      FROM projects p
      ${whereClause}
    `;

    const [projectsResult, countResult] = await Promise.all([
      pool.query(projectsQuery, [...queryParams, limit, offset]),
      pool.query(countQuery, queryParams)
    ]);

    res.json({
      projects: projectsResult.rows.map(project => ({
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
        estimatedEndDate: project.estimated_end_date,
        city: project.city,
        address: project.address,
        areaSqft: project.area_sqft,
        propertyType: project.property_type,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      })),
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Projects list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/projects', authenticateToken, requirePermission('projects.create'), async (req: any, res) => {
  try {
    const {
      title, description, clientId, designerId, budget, startDate, endDate,
      city, address, areaSqft, propertyType, leadId
    } = req.body;

    if (!title || !clientId || !budget) {
      return res.status(400).json({ error: 'Title, clientId, and budget are required' });
    }

    // Auto-assign project manager if not specified
    let projectManagerId = null;
    if (req.user.roles.includes('project_manager')) {
      projectManagerId = req.user.id;
    } else {
      const pm = await pool.query(`
        SELECT u.id, COUNT(p.id) as project_count
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        LEFT JOIN projects p ON u.id = p.project_manager_id AND p.status NOT IN ('completed', 'cancelled')
        WHERE r.name = 'project_manager' AND u.is_active = true
        GROUP BY u.id
        ORDER BY project_count ASC
        LIMIT 1
      `);
      projectManagerId = pm.rows[0]?.id;
    }

    const projectResult = await pool.query(`
      INSERT INTO projects (
        title, description, client_id, designer_id, project_manager_id,
        budget, start_date, end_date, city, address, area_sqft, property_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      title, description, clientId, designerId, projectManagerId,
      budget, startDate, endDate, city, address, areaSqft, propertyType
    ]);

    const newProject = projectResult.rows[0];

    // Mark lead as converted if leadId provided
    if (leadId) {
      await pool.query(
        'UPDATE leads SET status = $1, converted_to_project = $2 WHERE id = $3',
        ['converted', newProject.id, leadId]
      );
    }

    // Create default milestones
    const defaultMilestones = [
      { title: 'Design Planning', order: 1, budget: Math.floor(budget * 0.1) },
      { title: 'Material Selection', order: 2, budget: Math.floor(budget * 0.2) },
      { title: 'Execution Phase 1', order: 3, budget: Math.floor(budget * 0.3) },
      { title: 'Execution Phase 2', order: 4, budget: Math.floor(budget * 0.25) },
      { title: 'Final Touches', order: 5, budget: Math.floor(budget * 0.15) }
    ];

    for (const milestone of defaultMilestones) {
      await pool.query(`
        INSERT INTO project_milestones (project_id, title, budget, sort_order)
        VALUES ($1, $2, $3, $4)
      `, [newProject.id, milestone.title, milestone.budget, milestone.order]);
    }

    res.status(201).json({
      id: newProject.id,
      title: newProject.title,
      description: newProject.description,
      clientId: newProject.client_id,
      designerId: newProject.designer_id,
      projectManagerId: newProject.project_manager_id,
      status: newProject.status,
      priority: newProject.priority,
      budget: newProject.budget,
      startDate: newProject.start_date,
      endDate: newProject.end_date,
      city: newProject.city,
      address: newProject.address,
      areaSqft: newProject.area_sqft,
      propertyType: newProject.property_type,
      progressPercentage: newProject.progress_percentage,
      createdAt: newProject.created_at
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/projects/:id', authenticateToken, requirePermission('projects.view'), async (req: any, res) => {
  try {
    const { id } = req.params;

    const projectQuery = `
      SELECT 
        p.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.email as client_email,
        c.phone as client_phone,
        d.first_name as designer_first_name,
        d.last_name as designer_last_name,
        d.email as designer_email,
        pm.first_name as pm_first_name,
        pm.last_name as pm_last_name,
        pm.email as pm_email
      FROM projects p
      JOIN users c ON p.client_id = c.id
      LEFT JOIN users d ON p.designer_id = d.id
      LEFT JOIN users pm ON p.project_manager_id = pm.id
      WHERE p.id = $1
    `;

    const milestonesQuery = `
      SELECT * FROM project_milestones 
      WHERE project_id = $1 
      ORDER BY sort_order
    `;

    const [projectResult, milestonesResult] = await Promise.all([
      pool.query(projectQuery, [id]),
      pool.query(milestonesQuery, [id])
    ]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Role-based access control
    const hasAccess = req.user.roles.includes('admin') || 
                     req.user.roles.includes('super_admin') ||
                     project.client_id === parseInt(req.user.id) ||
                     project.designer_id === parseInt(req.user.id) ||
                     project.project_manager_id === parseInt(req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    res.json({
      id: project.id,
      title: project.title,
      description: project.description,
      client: {
        id: project.client_id,
        name: `${project.client_first_name} ${project.client_last_name}`,
        email: project.client_email,
        phone: project.client_phone
      },
      designer: project.designer_id ? {
        id: project.designer_id,
        name: `${project.designer_first_name} ${project.designer_last_name}`,
        email: project.designer_email
      } : null,
      projectManager: project.project_manager_id ? {
        id: project.project_manager_id,
        name: `${project.pm_first_name} ${project.pm_last_name}`,
        email: project.pm_email
      } : null,
      status: project.status,
      priority: project.priority,
      budget: project.budget,
      estimatedCost: project.estimated_cost,
      actualCost: project.actual_cost,
      progressPercentage: project.progress_percentage,
      startDate: project.start_date,
      endDate: project.end_date,
      estimatedEndDate: project.estimated_end_date,
      city: project.city,
      address: project.address,
      areaSqft: project.area_sqft,
      propertyType: project.property_type,
      milestones: milestonesResult.rows.map(milestone => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        plannedStartDate: milestone.planned_start_date,
        plannedEndDate: milestone.planned_end_date,
        actualStartDate: milestone.actual_start_date,
        actualEndDate: milestone.actual_end_date,
        status: milestone.status,
        budget: milestone.budget,
        actualCost: milestone.actual_cost,
        sortOrder: milestone.sort_order
      })),
      createdAt: project.created_at,
      updatedAt: project.updated_at
    });

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/projects/:id', authenticateToken, requirePermission('projects.edit'), async (req: any, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, designerId, status, priority, budget, estimatedCost,
      actualCost, progressPercentage, startDate, endDate, estimatedEndDate,
      city, address, areaSqft, propertyType
    } = req.body;

    const updateResult = await pool.query(`
      UPDATE projects SET
        title = $1, description = $2, designer_id = $3, status = $4, priority = $5,
        budget = $6, estimated_cost = $7, actual_cost = $8, progress_percentage = $9,
        start_date = $10, end_date = $11, estimated_end_date = $12,
        city = $13, address = $14, area_sqft = $15, property_type = $16,
        updated_at = NOW()
      WHERE id = $17
      RETURNING *
    `, [
      title, description, designerId, status, priority, budget, estimatedCost,
      actualCost, progressPercentage, startDate, endDate, estimatedEndDate,
      city, address, areaSqft, propertyType, id
    ]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updatedProject = updateResult.rows[0];

    res.json({
      id: updatedProject.id,
      title: updatedProject.title,
      description: updatedProject.description,
      designerId: updatedProject.designer_id,
      status: updatedProject.status,
      priority: updatedProject.priority,
      budget: updatedProject.budget,
      estimatedCost: updatedProject.estimated_cost,
      actualCost: updatedProject.actual_cost,
      progressPercentage: updatedProject.progress_percentage,
      startDate: updatedProject.start_date,
      endDate: updatedProject.end_date,
      estimatedEndDate: updatedProject.estimated_end_date,
      city: updatedProject.city,
      address: updatedProject.address,
      areaSqft: updatedProject.area_sqft,
      propertyType: updatedProject.property_type,
      updatedAt: updatedProject.updated_at
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/projects/:id', authenticateToken, requirePermission('projects.manage'), async (req: any, res) => {
  try {
    const { id } = req.params;

    const deleteResult = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Continue with more endpoints... (this is getting quite long, let me split it)