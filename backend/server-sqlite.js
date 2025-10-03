// SQLite-based server for development and testing
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Database connection
const db = new Database(path.join(__dirname, '..', 'gharinto_dev.db'));

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token missing or invalid format' });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token || token.trim() === '') {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// ==================== AUTHENTICATION ENDPOINTS ====================

// Login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', { email });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get user with roles
    const user = db.prepare(`
      SELECT u.*, 
             GROUP_CONCAT(DISTINCT r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.email = ? AND u.is_active = 1
      GROUP BY u.id
    `).get(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get permissions
    const permissions = db.prepare(`
      SELECT DISTINCT p.name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `).all(user.id).map(p => p.name);

    const roles = user.roles ? user.roles.split(',').filter(r => r) : [];

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        roles: roles,
        permissions: permissions
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
        roles: roles,
        permissions: permissions
      }
    });

  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Registration endpoint
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, city, userType = 'customer' } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, city, is_active, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
    `).run(email, passwordHash, firstName, lastName, phone, city);

    const userId = result.lastInsertRowid;

    // Assign default role
    const role = db.prepare('SELECT id FROM roles WHERE name = ?').get(userType);
    if (role) {
      db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)').run(userId, role.id);
    }

    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        firstName,
        lastName,
        phone,
        city,
        roles: [userType],
        permissions: []
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== USER MANAGEMENT ENDPOINTS ====================

app.get('/users/profile', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT u.*,
             GROUP_CONCAT(DISTINCT r.name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = ?
      GROUP BY u.id
    `).get(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const permissions = db.prepare(`
      SELECT DISTINCT p.name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `).all(user.id).map(p => p.name);

    const menus = db.prepare(`
      SELECT DISTINCT m.name, m.display_name, m.icon, m.path, m.sort_order
      FROM menus m
      JOIN role_menus rm ON m.id = rm.menu_id
      JOIN user_roles ur ON rm.role_id = ur.role_id
      WHERE ur.user_id = ? AND m.is_active = 1 AND rm.can_view = 1
      ORDER BY m.sort_order, m.display_name
    `).all(user.id);

    const roles = user.roles ? user.roles.split(',').filter(r => r) : [];

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      city: user.city,
      avatarUrl: user.avatar_url,
      roles: roles,
      permissions: permissions,
      menus: menus.map(menu => ({
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

// ==================== HEALTH CHECK ENDPOINTS ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected (SQLite)'
  });
});

app.get('/health/db', (req, res) => {
  try {
    const result = db.prepare('SELECT datetime("now") as now').get();
    res.json({
      status: 'ok',
      database: 'connected (SQLite)',
      timestamp: result.now
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
});

// ==================== ERROR HANDLING ====================

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 SQLite Development Server running on http://localhost:${PORT}`);
  console.log('📝 Available endpoints:');
  console.log('  🔐 Authentication:');
  console.log('    POST /auth/login');
  console.log('    POST /auth/register');
  console.log('  👥 User Management:');
  console.log('    GET  /users/profile');
  console.log('  ❤️  Health:');
  console.log('    GET  /health');
  console.log('    GET  /health/db');
  console.log('');
  console.log('✨ Frontend should connect to: http://localhost:4000');
  console.log('💾 Database: SQLite (gharinto_dev.db)');
});

