// PostgreSQL-based production server
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'gharinto_db',
  user: 'postgres',
  password: '1234',
  ssl: false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10
});

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully');
  }
});

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
        roles: user.roles?.filter(r => r) || [],
        permissions: user.permissions?.filter(p => p) || []
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
    const { email, password, firstName, lastName, phone, city } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, city, is_active, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, true, true) RETURNING *`,
      [email, passwordHash, firstName, lastName, phone, city]
    );

    const user = userResult.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        city: user.city
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== USER ENDPOINTS ====================

// Get user profile
app.get('/users/profile', authenticateToken, async (req, res) => {
  try {
    const userQuery = `
      SELECT u.*, 
             ARRAY_AGG(DISTINCT r.name) as roles,
             ARRAY_AGG(DISTINCT p.name) as permissions,
             ARRAY_AGG(DISTINCT jsonb_build_object(
               'name', m.name,
               'displayName', m.display_name,
               'icon', m.icon,
               'path', m.path,
               'sortOrder', m.sort_order
             )) as menus
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN role_menus rm ON r.id = rm.role_id
      LEFT JOIN menus m ON rm.menu_id = m.id AND m.is_active = true
      WHERE u.id = $1
      GROUP BY u.id
    `;

    const result = await pool.query(userQuery, [req.user.id]);
    
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
      roles: user.roles?.filter(r => r) || [],
      permissions: user.permissions?.filter(p => p) || [],
      menus: user.menus?.filter(m => m.name) || []
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== USER MANAGEMENT ENDPOINTS ====================

// Get all users (for user management page)
app.get('/users', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, city } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (search && search !== 'undefined') {
      whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (role && role !== 'undefined') {
      whereClause += ` AND r.name = $${paramIndex}`;
      queryParams.push(role);
      paramIndex++;
    }

    if (city && city !== 'undefined') {
      whereClause += ` AND u.city ILIKE $${paramIndex}`;
      queryParams.push(`%${city}%`);
      paramIndex++;
    }

    const usersQuery = `
      SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.phone, u.city,
             u.is_active, u.created_at,
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

    queryParams.push(limit, offset);

    const [usersResult, countResult] = await Promise.all([
      pool.query(usersQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2))
    ]);

    res.json({
      users: usersResult.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    });

  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (SuperAdmin only)
app.post('/users', authenticateToken, async (req, res) => {
  try {
    // Check if user is SuperAdmin
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const { email, firstName, lastName, phone, city, password, roles, isActive = true } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ error: 'Email, first name, last name, and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert user
      const insertUserQuery = `
        INSERT INTO users (email, first_name, last_name, phone, city, password_hash, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, false)
        RETURNING id, email, first_name, last_name, phone, city, is_active, created_at
      `;
      const userResult = await client.query(insertUserQuery, [
        email,
        firstName,
        lastName,
        phone || null,
        city || null,
        hashedPassword,
        isActive
      ]);

      const newUser = userResult.rows[0];

      // Assign roles if provided
      if (roles && Array.isArray(roles) && roles.length > 0) {
        // Get role IDs from role names
        const roleQuery = 'SELECT id FROM roles WHERE name = ANY($1)';
        const roleResult = await client.query(roleQuery, [roles]);

        if (roleResult.rows.length > 0) {
          const roleIds = roleResult.rows.map(r => r.id);

          // Insert user_roles
          for (const roleId of roleIds) {
            await client.query(
              'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
              [newUser.id, roleId]
            );
          }
        }
      }

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'CREATE',
          'user',
          newUser.id,
          JSON.stringify({ email, roles: roles || [], created_by: req.user.email })
        ]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          phone: newUser.phone,
          city: newUser.city,
          isActive: newUser.is_active,
          roles: roles || [],
          createdAt: newUser.created_at
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== FINANCIAL MANAGEMENT ENDPOINTS ====================

// Get all user wallets (SuperAdmin only)
app.get('/finance/wallets', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const { role, city, minBalance, maxBalance, search } = req.query;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (role && role !== 'undefined') {
      whereClause += ` AND r.name = $${paramIndex}`;
      queryParams.push(role);
      paramIndex++;
    }

    if (city && city !== 'undefined') {
      whereClause += ` AND u.city ILIKE $${paramIndex}`;
      queryParams.push(`%${city}%`);
      paramIndex++;
    }

    if (minBalance && minBalance !== 'undefined') {
      whereClause += ` AND w.balance >= $${paramIndex}`;
      queryParams.push(parseInt(minBalance));
      paramIndex++;
    }

    if (maxBalance && maxBalance !== 'undefined') {
      whereClause += ` AND w.balance <= $${paramIndex}`;
      queryParams.push(parseInt(maxBalance));
      paramIndex++;
    }

    if (search && search !== 'undefined') {
      whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const walletsQuery = `
      SELECT
        w.id as wallet_id,
        w.balance,
        w.total_earned,
        w.total_spent,
        w.is_active as wallet_active,
        w.created_at as wallet_created_at,
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.city,
        ARRAY_AGG(DISTINCT r.name) as roles,
        (
          SELECT t.created_at
          FROM transactions t
          WHERE t.wallet_id = w.id
          ORDER BY t.created_at DESC
          LIMIT 1
        ) as last_transaction_date
      FROM wallets w
      INNER JOIN users u ON w.user_id = u.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
      GROUP BY w.id, u.id
      ORDER BY w.balance DESC
    `;

    const result = await pool.query(walletsQuery, queryParams);

    // Calculate total platform balance
    const totalBalance = result.rows.reduce((sum, row) => sum + parseInt(row.balance || 0), 0);

    res.json({
      wallets: result.rows,
      total: result.rows.length,
      totalPlatformBalance: totalBalance
    });

  } catch (error) {
    console.error('Get wallets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add credits to user wallet (SuperAdmin only)
app.post('/finance/wallets/:userId/credit', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const { userId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      console.log('Credit request - userId:', userId, 'amount:', amount, 'reason:', reason);

      // Get or create wallet
      let walletResult = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1', [userId]);
      console.log('Wallet query result:', walletResult.rows);

      if (walletResult.rows.length === 0) {
        console.log('Creating new wallet');
        walletResult = await client.query(
          'INSERT INTO wallets (user_id, balance, total_earned) VALUES ($1, $2, $3) RETURNING id, balance',
          [userId, Math.floor(amount), Math.floor(amount)]
        );
      } else {
        console.log('Updating existing wallet');
        await client.query(
          'UPDATE wallets SET balance = balance + $1, total_earned = total_earned + $1, updated_at = NOW() WHERE user_id = $2',
          [Math.floor(amount), userId]
        );
        walletResult = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1', [userId]);
      }

      const walletId = walletResult.rows[0].id;
      const newBalance = parseInt(walletResult.rows[0].balance);
      console.log('Wallet ID:', walletId, 'New Balance:', newBalance);

      // Create transaction record
      console.log('Creating transaction record...');
      const transactionResult = await client.query(
        `INSERT INTO transactions (wallet_id, type, amount, description, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
        [walletId, 'credit', Math.floor(amount), reason, 'completed']
      );
      console.log('Transaction created:', transactionResult.rows[0]);

      // Create audit log
      console.log('Creating audit log...');
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'CREDIT',
          'wallet',
          walletId,
          JSON.stringify({ amount, reason, userId, transactionId: transactionResult.rows[0].id })
        ]
      );
      console.log('Audit log created');

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Credits added successfully',
        transaction: {
          id: transactionResult.rows[0].id,
          amount,
          newBalance,
          createdAt: transactionResult.rows[0].created_at
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Add credits error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Deduct credits from user wallet (SuperAdmin only)
app.post('/finance/wallets/:userId/debit', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const { userId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get wallet
      const walletResult = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1', [userId]);

      if (walletResult.rows.length === 0) {
        return res.status(404).json({ error: 'Wallet not found for this user' });
      }

      const walletId = walletResult.rows[0].id;
      const currentBalance = parseInt(walletResult.rows[0].balance);

      if (currentBalance < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Update wallet
      await client.query(
        'UPDATE wallets SET balance = balance - $1, total_spent = total_spent + $1, updated_at = NOW() WHERE id = $2',
        [amount, walletId]
      );

      const updatedWallet = await client.query('SELECT balance FROM wallets WHERE id = $1', [walletId]);
      const newBalance = parseInt(updatedWallet.rows[0].balance);

      // Create transaction record
      const transactionResult = await client.query(
        `INSERT INTO transactions (wallet_id, type, amount, description, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
        [walletId, 'debit', Math.floor(amount), reason, 'completed']
      );

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'DEBIT',
          'wallet',
          walletId,
          JSON.stringify({ amount, reason, userId, transactionId: transactionResult.rows[0].id })
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Credits deducted successfully',
        transaction: {
          id: transactionResult.rows[0].id,
          amount,
          newBalance,
          createdAt: transactionResult.rows[0].created_at
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Deduct credits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transaction history (SuperAdmin only)
app.get('/finance/transactions', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const {
      page = 1,
      limit = 20,
      userId,
      type,
      status,
      startDate,
      endDate,
      minAmount,
      maxAmount
    } = req.query;

    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (userId && userId !== 'undefined') {
      whereClause += ` AND w.user_id = $${paramIndex}`;
      queryParams.push(userId);
      paramIndex++;
    }

    if (type && type !== 'undefined') {
      whereClause += ` AND t.type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    if (status && status !== 'undefined') {
      whereClause += ` AND t.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (startDate && startDate !== 'undefined') {
      whereClause += ` AND t.created_at >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate && endDate !== 'undefined') {
      whereClause += ` AND t.created_at <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    if (minAmount && minAmount !== 'undefined') {
      whereClause += ` AND t.amount >= $${paramIndex}`;
      queryParams.push(parseInt(minAmount));
      paramIndex++;
    }

    if (maxAmount && maxAmount !== 'undefined') {
      whereClause += ` AND t.amount <= $${paramIndex}`;
      queryParams.push(parseInt(maxAmount));
      paramIndex++;
    }

    const transactionsQuery = `
      SELECT
        t.id,
        t.type,
        t.amount,
        t.description,
        t.status,
        t.created_at,
        w.balance as balance_after,
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name
      FROM transactions t
      INNER JOIN wallets w ON t.wallet_id = w.id
      INNER JOIN users u ON w.user_id = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      INNER JOIN wallets w ON t.wallet_id = w.id
      ${whereClause}
    `;

    queryParams.push(limit, offset);

    const [transactionsResult, countResult] = await Promise.all([
      pool.query(transactionsQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2))
    ]);

    res.json({
      transactions: transactionsResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent transactions (real-time feed)
app.get('/finance/transactions/recent', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const { limit = 10 } = req.query;

    const query = `
      SELECT
        t.id,
        t.type,
        t.amount,
        t.description,
        t.status,
        t.created_at,
        u.email,
        u.first_name,
        u.last_name
      FROM transactions t
      INNER JOIN wallets w ON t.wallet_id = w.id
      INNER JOIN users u ON w.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    res.json({
      transactions: result.rows
    });

  } catch (error) {
    console.error('Get recent transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get flagged transactions (amounts > 50000)
app.get('/finance/transactions/flagged', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const query = `
      SELECT
        t.id,
        t.type,
        t.amount,
        t.description,
        t.status,
        t.created_at,
        u.email,
        u.first_name,
        u.last_name,
        w.balance as current_balance
      FROM transactions t
      INNER JOIN wallets w ON t.wallet_id = w.id
      INNER JOIN users u ON w.user_id = u.id
      WHERE t.amount > 50000
      ORDER BY t.created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query);

    res.json({
      transactions: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get flagged transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PARTNER APPROVAL ENDPOINTS ====================

// Get pending vendor approvals
app.get('/approvals/vendors/pending', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const query = `
      SELECT
        v.id,
        v.company_name,
        v.business_type,
        v.gst_number,
        v.pan_number,
        v.address,
        v.city,
        v.state,
        v.pincode,
        v.created_at,
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone
      FROM vendors v
      INNER JOIN users u ON v.user_id = u.id
      WHERE v.is_verified = false
      ORDER BY v.created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      vendors: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get pending vendors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve vendor
app.post('/approvals/vendors/:id/approve', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update vendor
      const updateResult = await client.query(
        'UPDATE vendors SET is_verified = true, updated_at = NOW() WHERE id = $1 RETURNING user_id, company_name',
        [id]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Vendor not found' });
      }

      const vendor = updateResult.rows[0];

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'APPROVE',
          'vendor',
          id,
          JSON.stringify({ company_name: vendor.company_name, approved_by: req.user.email })
        ]
      );

      await client.query('COMMIT');

      // TODO: Send email notification
      console.log(`Email notification: Vendor ${vendor.company_name} approved`);

      res.json({
        success: true,
        message: 'Vendor approved successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Approve vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject vendor
app.post('/approvals/vendors/:id/reject', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.length < 20) {
      return res.status(400).json({ error: 'Rejection reason must be at least 20 characters' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get vendor details
      const vendorResult = await client.query(
        'SELECT user_id, company_name FROM vendors WHERE id = $1',
        [id]
      );

      if (vendorResult.rows.length === 0) {
        return res.status(404).json({ error: 'Vendor not found' });
      }

      const vendor = vendorResult.rows[0];

      // Delete vendor record (rejection)
      await client.query('DELETE FROM vendors WHERE id = $1', [id]);

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'REJECT',
          'vendor',
          id,
          JSON.stringify({ company_name: vendor.company_name, reason, rejected_by: req.user.email })
        ]
      );

      await client.query('COMMIT');

      // TODO: Send email notification
      console.log(`Email notification: Vendor ${vendor.company_name} rejected. Reason: ${reason}`);

      res.json({
        success: true,
        message: 'Vendor rejected successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Reject vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending interior designer approvals
app.get('/approvals/designers/pending', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const query = `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.city,
        u.created_at
      FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE r.name = 'interior_designer' AND u.email_verified = false
      ORDER BY u.created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      designers: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get pending designers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve interior designer
app.post('/approvals/designers/:id/approve', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update user
      const updateResult = await client.query(
        'UPDATE users SET email_verified = true WHERE id = $1 RETURNING email, first_name, last_name',
        [id]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Designer not found' });
      }

      const designer = updateResult.rows[0];

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'APPROVE',
          'interior_designer',
          id,
          JSON.stringify({ name: `${designer.first_name} ${designer.last_name}`, email: designer.email, approved_by: req.user.email })
        ]
      );

      await client.query('COMMIT');

      // TODO: Send email notification
      console.log(`Email notification: Interior Designer ${designer.first_name} ${designer.last_name} approved`);

      res.json({
        success: true,
        message: 'Interior designer approved successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Approve designer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject interior designer
app.post('/approvals/designers/:id/reject', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.length < 20) {
      return res.status(400).json({ error: 'Rejection reason must be at least 20 characters' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get user details
      const userResult = await client.query(
        'SELECT email, first_name, last_name FROM users WHERE id = $1',
        [id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Designer not found' });
      }

      const designer = userResult.rows[0];

      // Deactivate user
      await client.query('UPDATE users SET is_active = false WHERE id = $1', [id]);

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'REJECT',
          'interior_designer',
          id,
          JSON.stringify({ name: `${designer.first_name} ${designer.last_name}`, email: designer.email, reason, rejected_by: req.user.email })
        ]
      );

      await client.query('COMMIT');

      // TODO: Send email notification
      console.log(`Email notification: Interior Designer ${designer.first_name} ${designer.last_name} rejected. Reason: ${reason}`);

      res.json({
        success: true,
        message: 'Interior designer rejected successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Reject designer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending project manager approvals
app.get('/approvals/project-managers/pending', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const query = `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.city,
        u.created_at
      FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE r.name = 'project_manager' AND u.email_verified = false
      ORDER BY u.created_at DESC
    `;

    const result = await pool.query(query);

    res.json({
      projectManagers: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get pending project managers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve project manager
app.post('/approvals/project-managers/:id/approve', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update user
      const updateResult = await client.query(
        'UPDATE users SET email_verified = true WHERE id = $1 RETURNING email, first_name, last_name',
        [id]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Project manager not found' });
      }

      const pm = updateResult.rows[0];

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'APPROVE',
          'project_manager',
          id,
          JSON.stringify({ name: `${pm.first_name} ${pm.last_name}`, email: pm.email, approved_by: req.user.email })
        ]
      );

      await client.query('COMMIT');

      // TODO: Send email notification
      console.log(`Email notification: Project Manager ${pm.first_name} ${pm.last_name} approved`);

      res.json({
        success: true,
        message: 'Project manager approved successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Approve project manager error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject project manager
app.post('/approvals/project-managers/:id/reject', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.length < 20) {
      return res.status(400).json({ error: 'Rejection reason must be at least 20 characters' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get user details
      const userResult = await pool.query(
        'SELECT email, first_name, last_name FROM users WHERE id = $1',
        [id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Project manager not found' });
      }

      const pm = userResult.rows[0];

      // Deactivate user
      await client.query('UPDATE users SET is_active = false WHERE id = $1', [id]);

      // Create audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          req.user.id,
          'REJECT',
          'project_manager',
          id,
          JSON.stringify({ name: `${pm.first_name} ${pm.last_name}`, email: pm.email, reason, rejected_by: req.user.email })
        ]
      );

      await client.query('COMMIT');

      // TODO: Send email notification
      console.log(`Email notification: Project Manager ${pm.first_name} ${pm.last_name} rejected. Reason: ${reason}`);

      res.json({
        success: true,
        message: 'Project manager rejected successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Reject project manager error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== LEAD MANAGEMENT ENDPOINTS ====================

// Get all leads (for lead management page)
app.get('/leads', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, city, assignedTo, minScore } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (status && status !== 'undefined') {
      whereClause += ` AND l.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (city && city !== 'undefined') {
      whereClause += ` AND l.city ILIKE $${paramIndex}`;
      queryParams.push(`%${city}%`);
      paramIndex++;
    }

    if (assignedTo && assignedTo !== 'undefined') {
      whereClause += ` AND l.assigned_to = $${paramIndex}`;
      queryParams.push(assignedTo);
      paramIndex++;
    }

    if (minScore && minScore !== 'undefined') {
      whereClause += ` AND l.score >= $${paramIndex}`;
      queryParams.push(minScore);
      paramIndex++;
    }

    const leadsQuery = `
      SELECT l.*,
             u.first_name as assigned_first_name,
             u.last_name as assigned_last_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM leads l
      ${whereClause}
    `;

    queryParams.push(limit, offset);

    const [leadsResult, countResult] = await Promise.all([
      pool.query(leadsQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2))
    ]);

    res.json({
      leads: leadsResult.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    });

  } catch (error) {
    console.error('Leads fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PROJECT MANAGEMENT ENDPOINTS ====================

// Get all projects (for project management page)
app.get('/projects', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, city, designerId, clientId } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (status && status !== 'undefined') {
      whereClause += ` AND p.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (city && city !== 'undefined') {
      whereClause += ` AND p.city ILIKE $${paramIndex}`;
      queryParams.push(`%${city}%`);
      paramIndex++;
    }

    if (designerId && designerId !== 'undefined') {
      whereClause += ` AND p.designer_id = $${paramIndex}`;
      queryParams.push(designerId);
      paramIndex++;
    }

    if (clientId && clientId !== 'undefined') {
      whereClause += ` AND p.client_id = $${paramIndex}`;
      queryParams.push(clientId);
      paramIndex++;
    }

    const projectsQuery = `
      SELECT p.*,
             c.first_name as client_first_name,
             c.last_name as client_last_name,
             d.first_name as designer_first_name,
             d.last_name as designer_last_name
      FROM projects p
      LEFT JOIN users c ON p.client_id = c.id
      LEFT JOIN users d ON p.designer_id = d.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM projects p
      ${whereClause}
    `;

    queryParams.push(limit, offset);

    const [projectsResult, countResult] = await Promise.all([
      pool.query(projectsQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2))
    ]);

    res.json({
      projects: projectsResult.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    });

  } catch (error) {
    console.error('Projects fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== COMMUNICATIONS ENDPOINTS ====================

// Get user conversations
app.get('/communications/conversations', authenticateToken, async (req, res) => {
  try {
    // Return mock conversations for now
    const conversations = [
      {
        id: 1,
        title: 'Project Discussion - Modern Villa',
        last_message: 'The materials have been ordered',
        last_message_at: new Date(Date.now() - 3600000).toISOString(),
        unread_count: 2,
        participants: 3
      },
      {
        id: 2,
        title: 'Vendor Communication - Premium Furniture',
        last_message: 'Delivery scheduled for next week',
        last_message_at: new Date(Date.now() - 7200000).toISOString(),
        unread_count: 0,
        participants: 2
      },
      {
        id: 3,
        title: 'Team Chat - Design Review',
        last_message: 'Client approved the final design',
        last_message_at: new Date(Date.now() - 86400000).toISOString(),
        unread_count: 1,
        participants: 5
      }
    ];

    res.json({
      conversations,
      total: conversations.length
    });
  } catch (error) {
    console.error('Conversations fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages for a conversation
app.get('/communications/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    // Return mock messages for now
    const messages = [
      {
        id: 1,
        conversation_id: conversationId,
        sender_id: 1,
        sender_name: 'John Designer',
        content: 'Hi team, I\'ve completed the initial design mockups.',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        is_read: true
      },
      {
        id: 2,
        conversation_id: conversationId,
        sender_id: 2,
        sender_name: 'Sarah Manager',
        content: 'Great work! Can you share them in the project folder?',
        created_at: new Date(Date.now() - 5400000).toISOString(),
        is_read: true
      },
      {
        id: 3,
        conversation_id: conversationId,
        sender_id: 1,
        sender_name: 'John Designer',
        content: 'Done! Check the latest folder.',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        is_read: false
      }
    ];

    res.json({
      messages,
      total: messages.length
    });
  } catch (error) {
    console.error('Messages fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send a message
app.post('/communications/messages', authenticateToken, async (req, res) => {
  try {
    const { conversation_id, content } = req.body;

    if (!conversation_id || !content) {
      return res.status(400).json({ error: 'Conversation ID and content are required' });
    }

    // Create mock message
    const message = {
      id: Math.floor(Math.random() * 1000000),
      conversation_id,
      sender_id: req.user.id,
      sender_name: `${req.user.firstName} ${req.user.lastName}`,
      content,
      created_at: new Date().toISOString(),
      is_read: false
    };

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== NOTIFICATIONS ENDPOINTS ====================

// Get user notifications
app.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const notificationsQuery = `
      SELECT n.id, n.user_id, n.title, n.content, n.type, n.reference_type, n.reference_id,
             false as is_read,
             null as read_at
      FROM notifications n
      WHERE n.user_id = $1 OR n.user_id IS NULL
      ORDER BY n.id DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications n
      WHERE n.user_id = $1 OR n.user_id IS NULL
    `;

    const [notificationsResult, countResult] = await Promise.all([
      pool.query(notificationsQuery, [req.user.id, limit, offset]),
      pool.query(countQuery, [req.user.id])
    ]);

    res.json({
      notifications: notificationsResult.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    });

  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ANALYTICS ENDPOINTS ====================

// Get SuperAdmin Dashboard
app.get('/dashboard/super-admin', authenticateToken, async (req, res) => {
  try {
    // Check super admin permissions
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied to super admin dashboard' });
    }

    // Users data
    const usersData = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN is_active THEN 1 END) as active,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END) as new_this_month
      FROM users
    `);

    const usersByRole = await pool.query(`
      SELECT
        r.name as role,
        COUNT(ur.user_id) as count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      LEFT JOIN users u ON ur.user_id = u.id AND u.is_active = true
      GROUP BY r.name
      ORDER BY count DESC
    `);

    // Projects data
    const projectsData = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('planning', 'in_progress', 'review') THEN 1 END) as active,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COALESCE(SUM(budget), 0) as total_value
      FROM projects
    `);

    const projectsByStatus = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM projects
      GROUP BY status
      ORDER BY count DESC
    `);

    // Leads data
    const leadsData = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END) as this_month,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted
      FROM leads
    `);

    // Revenue data (simplified)
    const revenueData = await pool.query(`
      SELECT
        COALESCE(SUM(budget), 0) as total,
        COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN budget ELSE 0 END), 0) as this_month
      FROM projects
      WHERE status = 'completed'
    `);

    const dashboard = {
      users: {
        total: parseInt(usersData.rows[0].total),
        active: parseInt(usersData.rows[0].active),
        new_this_month: parseInt(usersData.rows[0].new_this_month),
        by_role: usersByRole.rows
      },
      projects: {
        total: parseInt(projectsData.rows[0].total),
        active: parseInt(projectsData.rows[0].active),
        completed: parseInt(projectsData.rows[0].completed),
        total_value: parseFloat(projectsData.rows[0].total_value),
        by_status: projectsByStatus.rows
      },
      leads: {
        total: parseInt(leadsData.rows[0].total),
        this_month: parseInt(leadsData.rows[0].this_month),
        conversion_rate: leadsData.rows[0].total > 0 ?
          (parseInt(leadsData.rows[0].converted) / parseInt(leadsData.rows[0].total) * 100).toFixed(1) : 0,
        by_source: [] // Would need lead_source data
      },
      revenue: {
        total: parseFloat(revenueData.rows[0].total),
        this_month: parseFloat(revenueData.rows[0].this_month),
        pending: 0, // Would need pending payments data
        growth_rate: 0 // Would need historical data
      },
      system_health: {
        active_users_24h: parseInt(usersData.rows[0].active),
        database_size: '50MB', // Would need actual DB size query
        response_time: 150 // Would need actual metrics
      }
    };

    res.json(dashboard);

  } catch (error) {
    console.error('SuperAdmin dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== MENU ENDPOINTS ====================

// Get user's accessible menus
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
        display_name: row.display_name,
        icon: row.icon,
        path: row.path,
        parent_id: row.parent_id,
        sort_order: row.sort_order,
        is_active: row.is_active,
        children: []
      };
      menuMap.set(row.id, menuItem);
    });

    // Second pass: build hierarchy
    menuMap.forEach(menuItem => {
      if (menuItem.parent_id) {
        const parent = menuMap.get(menuItem.parent_id);
        if (parent) {
          parent.children.push(menuItem);
        }
      } else {
        rootMenus.push(menuItem);
      }
    });

    res.json({ menus: rootMenus });

  } catch (error) {
    console.error('Menu fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== HEALTH CHECK ENDPOINTS ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

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
      error: error.message
    });
  }
});

// ==================== SUPER ADMIN SYSTEM MANAGEMENT ENDPOINTS ====================

// System Health Check (Enhanced)
app.get('/system/admin/health', authenticateToken, async (req, res) => {
  try {
    // Check super admin permissions
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied to system health' });
    }

    // Basic database health check
    const dbStart = Date.now();
    const dbResult = await pool.query('SELECT NOW() as current_time');
    const dbResponseTime = Date.now() - dbStart;

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        response_time_ms: dbResponseTime,
        current_time: dbResult.rows[0].current_time
      },
      server: {
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage_mb: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
        node_version: process.version,
        platform: process.platform
      }
    };

    res.json(healthData);

  } catch (error) {
    console.error('System health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'System health check failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System Settings Management
app.get('/system/admin/settings', authenticateToken, async (req, res) => {
  try {
    // Check super admin permissions
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied to system settings' });
    }

    const { category } = req.query;

    let query = `
      SELECT key, value, description, category, updated_at, updated_by
      FROM system_settings
    `;
    let params = [];

    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }

    query += ' ORDER BY category, key';

    const result = await pool.query(query, params);

    // Group settings by category
    const settingsByCategory = {};
    result.rows.forEach(setting => {
      if (!settingsByCategory[setting.category]) {
        settingsByCategory[setting.category] = [];
      }
      settingsByCategory[setting.category].push(setting);
    });

    res.json({
      settings: result.rows,
      by_category: settingsByCategory,
      total: result.rows.length
    });

  } catch (error) {
    console.error('System settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

app.put('/system/admin/settings', authenticateToken, async (req, res) => {
  try {
    // Check super admin permissions
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied to system settings' });
    }

    const { key, value, description, category } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    // Check if setting exists
    const existingResult = await pool.query(
      'SELECT id FROM system_settings WHERE key = $1',
      [key]
    );

    let result;
    if (existingResult.rows.length > 0) {
      // Update existing setting
      result = await pool.query(`
        UPDATE system_settings
        SET value = $1, description = $2, category = $3, updated_at = NOW(), updated_by = $4
        WHERE key = $5
        RETURNING *
      `, [value, description, category || 'general', req.user.id, key]);
    } else {
      // Create new setting
      result = await pool.query(`
        INSERT INTO system_settings (key, value, description, category, updated_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [key, value, description, category || 'general', req.user.id]);
    }

    res.json({
      success: true,
      setting: result.rows[0]
    });

  } catch (error) {
    console.error('System settings update error:', error);
    res.status(500).json({ error: 'Failed to update system setting' });
  }
});

// Audit Logs
app.get('/system/admin/audit-logs', authenticateToken, async (req, res) => {
  try {
    // Check super admin permissions
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied to audit logs' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // Simple query to get audit logs
    const logsResult = await pool.query(`
      SELECT
        al.id,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.created_at,
        u.first_name,
        u.last_name,
        u.email,
        r.name as role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, (page - 1) * limit]);

    const countResult = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
    const totalLogs = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalLogs / limit);

    res.json({
      logs: logsResult.rows,
      pagination: {
        page,
        limit,
        total: totalLogs,
        pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    });

  } catch (error) {
    console.error('Audit logs fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch audit logs',
      details: error.message
    });
  }
});

// Bulk User Operations
app.post('/system/admin/bulk-user-operations', authenticateToken, async (req, res) => {
  try {
    // Check super admin permissions
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied to bulk user operations' });
    }

    const { operation, user_ids, data } = req.body;

    if (!operation || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'Operation and user_ids array are required' });
    }

    let processedCount = 0;
    let failedCount = 0;
    const errors = [];

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const userId of user_ids) {
        try {
          switch (operation) {
            case 'activate':
              await client.query(
                'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2',
                [true, userId]
              );
              break;

            case 'deactivate':
              await client.query(
                'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2',
                [false, userId]
              );
              break;

            case 'delete':
              // Soft delete - mark as inactive
              await client.query(
                'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2',
                [false, userId]
              );
              break;

            case 'assign_role':
              if (!data?.role) {
                throw new Error('Role is required for assign_role operation');
              }
              await client.query(
                'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
                [data.role, userId]
              );
              break;

            case 'update_city':
              if (!data?.city) {
                throw new Error('City is required for update_city operation');
              }
              await client.query(
                'UPDATE users SET city = $1, updated_at = NOW() WHERE id = $2',
                [data.city, userId]
              );
              break;

            default:
              throw new Error(`Unknown operation: ${operation}`);
          }

          // Log the action
          await client.query(`
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            req.user.id,
            `bulk_${operation}`,
            'user',
            userId,
            JSON.stringify({ operation, data }),
            req.ip
          ]);

          processedCount++;

        } catch (error) {
          console.error(`Failed to process user ${userId}:`, error);
          errors.push(`User ${userId}: ${error.message}`);
          failedCount++;
        }
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      processed_count: processedCount,
      failed_count: failedCount,
      errors: errors
    });

  } catch (error) {
    console.error('Bulk user operations error:', error);
    res.status(500).json({ error: 'Failed to perform bulk user operations' });
  }
});

// Vendors Management
app.get('/vendors', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const city = req.query.city;
    const search = req.query.search;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (city) {
      whereConditions.push(`v.city = $${paramIndex}`);
      params.push(city);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(v.company_name ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const vendorsQuery = `
      SELECT
        v.id,
        v.company_name,
        v.business_type,
        v.gst_number,
        v.pan_number,
        v.address,
        v.city,
        v.state,
        v.pincode,
        v.is_verified,
        u.first_name,
        u.last_name,
        u.email as user_email
      FROM vendors v
      LEFT JOIN users u ON v.user_id = u.id
      ${whereClause}
      ORDER BY v.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM vendors v
      LEFT JOIN users u ON v.user_id = u.id
      ${whereClause}
    `;

    const [vendorsResult, countResult] = await Promise.all([
      pool.query(vendorsQuery, params),
      pool.query(countQuery, params.slice(0, -2))
    ]);

    const totalVendors = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalVendors / limit);

    res.json({
      vendors: vendorsResult.rows,
      pagination: {
        page,
        limit,
        total: totalVendors,
        pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    });

  } catch (error) {
    console.error('Vendors fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// ==================== START SERVER ====================

// ==================== ROLES & PERMISSIONS MANAGEMENT ====================

// Get all roles with their permissions
app.get('/system/roles', authenticateToken, async (req, res) => {
  try {
    // Check super admin permissions
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied to roles management' });
    }

    const rolesQuery = `
      SELECT
        r.id,
        r.name,
        r.display_name,
        r.description,
        r.is_active,
        r.created_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', p.id,
              'name', p.name,
              'display_name', p.display_name,
              'resource', p.resource,
              'action', p.action
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as permissions,
        COUNT(DISTINCT ur.user_id) as user_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      LEFT JOIN user_roles ur ON r.id = ur.role_id
      GROUP BY r.id, r.name, r.display_name, r.description, r.is_active, r.created_at
      ORDER BY r.display_name
    `;

    const result = await pool.query(rolesQuery);

    res.json({
      roles: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all permissions
app.get('/system/permissions', authenticateToken, async (req, res) => {
  try {
    // Check super admin permissions
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied to permissions management' });
    }

    const permissionsQuery = `
      SELECT
        id,
        name,
        display_name,
        description,
        resource,
        action,
        created_at
      FROM permissions
      ORDER BY resource, action, display_name
    `;

    const result = await pool.query(permissionsQuery);

    res.json({
      permissions: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get permissions for a specific role
app.get('/system/roles/:roleId/permissions', authenticateToken, async (req, res) => {
  try {
    // Check super admin permissions
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied to role permissions' });
    }

    const { roleId } = req.params;

    const permissionsQuery = `
      SELECT
        p.id,
        p.name,
        p.display_name,
        p.description,
        p.resource,
        p.action
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.resource, p.action
    `;

    const result = await pool.query(permissionsQuery, [roleId]);

    res.json({
      permissions: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update permissions for a role
app.put('/system/roles/:roleId/permissions', authenticateToken, async (req, res) => {
  try {
    // Check super admin permissions
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied to manage role permissions' });
    }

    const { roleId } = req.params;
    const { permission_ids } = req.body;

    if (!Array.isArray(permission_ids)) {
      return res.status(400).json({ error: 'permission_ids must be an array' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete existing permissions for this role
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

      // Insert new permissions
      if (permission_ids.length > 0) {
        const values = permission_ids.map((permId, idx) =>
          `($1, $${idx + 2})`
        ).join(', ');

        const insertQuery = `
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ${values}
        `;

        await client.query(insertQuery, [roleId, ...permission_ids]);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Role permissions updated successfully',
        permission_count: permission_ids.length
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Update role permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new role
app.post('/system/roles', authenticateToken, async (req, res) => {
  try {
    // Check super admin permissions
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied to create roles' });
    }

    const { name, display_name, description, permission_ids = [] } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({ error: 'Name and display_name are required' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if role name already exists
      const existingRole = await client.query(
        'SELECT id FROM roles WHERE name = $1',
        [name]
      );

      if (existingRole.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Role name already exists' });
      }

      // Insert new role
      const insertRoleQuery = `
        INSERT INTO roles (name, display_name, description, is_active, created_at)
        VALUES ($1, $2, $3, true, NOW())
        RETURNING id, name, display_name, description, is_active, created_at
      `;

      const roleResult = await client.query(insertRoleQuery, [name, display_name, description]);
      const newRole = roleResult.rows[0];

      // Insert permissions if provided
      if (permission_ids.length > 0) {
        const values = permission_ids.map((permId, idx) =>
          `($1, $${idx + 2})`
        ).join(', ');

        const insertPermissionsQuery = `
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ${values}
        `;

        await client.query(insertPermissionsQuery, [newRole.id, ...permission_ids]);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        role: newRole,
        message: 'Role created successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a role
app.put('/system/roles/:roleId', authenticateToken, async (req, res) => {
  try {
    // Check super admin permissions
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied to update roles' });
    }

    const { roleId } = req.params;
    const { display_name, description, is_active } = req.body;

    const updateQuery = `
      UPDATE roles
      SET
        display_name = COALESCE($1, display_name),
        description = COALESCE($2, description),
        is_active = COALESCE($3, is_active),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, name, display_name, description, is_active, created_at, updated_at
    `;

    const result = await pool.query(updateQuery, [display_name, description, is_active, roleId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({
      success: true,
      role: result.rows[0],
      message: 'Role updated successfully'
    });

  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a role (soft delete by setting is_active to false)
app.delete('/system/roles/:roleId', authenticateToken, async (req, res) => {
  try {
    // Check super admin permissions
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Access denied to delete roles' });
    }

    const { roleId } = req.params;

    // Check if role has users assigned
    const userCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1',
      [roleId]
    );

    const userCount = parseInt(userCountResult.rows[0].count);

    if (userCount > 0) {
      return res.status(400).json({
        error: `Cannot delete role with ${userCount} assigned user(s). Please reassign users first.`
      });
    }

    // Soft delete by setting is_active to false
    const deleteQuery = `
      UPDATE roles
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, display_name
    `;

    const result = await pool.query(deleteQuery, [roleId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({
      success: true,
      message: 'Role deleted successfully',
      role: result.rows[0]
    });

  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== FINANCE/WALLET ENDPOINTS ====================

// Get current user's wallet
app.get('/wallet', authenticateToken, async (req, res) => {
  try {
    const walletQuery = `
      SELECT * FROM wallets WHERE user_id = $1
    `;

    const result = await pool.query(walletQuery, [req.user.id]);

    if (result.rows.length === 0) {
      // Create wallet if it doesn't exist
      const createResult = await pool.query(
        'INSERT INTO wallets (user_id, balance, total_earned, total_spent) VALUES ($1, 0, 0, 0) RETURNING *',
        [req.user.id]
      );
      return res.json(createResult.rows[0]);
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get quotations
app.get('/quotations', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    // For now, return empty array as quotations table may not exist
    // This prevents the page from crashing
    res.json({
      quotations: [],
      total: 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: 0
    });

  } catch (error) {
    console.error('Get quotations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invoices
app.get('/invoices', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    // For now, return empty array as invoices table may not exist
    // This prevents the page from crashing
    res.json({
      invoices: [],
      total: 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: 0
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== CITY MANAGEMENT ENDPOINTS (CRITICAL FEATURE 1) ====================

// Get all cities
app.get('/cities', authenticateToken, async (req, res) => {
  try {
    const { is_active, is_operational, state } = req.query;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (is_active !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      queryParams.push(is_active === 'true');
      paramIndex++;
    }

    if (is_operational !== undefined) {
      whereClause += ` AND is_operational = $${paramIndex}`;
      queryParams.push(is_operational === 'true');
      paramIndex++;
    }

    if (state) {
      whereClause += ` AND state = $${paramIndex}`;
      queryParams.push(state);
      paramIndex++;
    }

    const citiesQuery = `
      SELECT c.*, cs.*
      FROM cities c
      LEFT JOIN city_settings cs ON c.id = cs.city_id
      ${whereClause}
      ORDER BY c.display_name
    `;

    const result = await pool.query(citiesQuery, queryParams);

    res.json({
      cities: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single city by ID
app.get('/cities/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const cityQuery = `
      SELECT c.*, cs.*
      FROM cities c
      LEFT JOIN city_settings cs ON c.id = cs.city_id
      WHERE c.id = $1
    `;

    const result = await pool.query(cityQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get city error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new city (SuperAdmin only)
app.post('/cities', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const {
      name,
      display_name,
      state,
      state_code,
      country = 'India',
      timezone = 'Asia/Kolkata',
      is_active = true,
      is_operational = false,
      launch_date,
      settings = {}
    } = req.body;

    if (!name || !display_name || !state) {
      return res.status(400).json({ error: 'Name, display_name, and state are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert city
      const cityResult = await client.query(
        `INSERT INTO cities (name, display_name, state, state_code, country, timezone, is_active, is_operational, launch_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [name.toLowerCase(), display_name, state, state_code, country, timezone, is_active, is_operational, launch_date]
      );

      const city = cityResult.rows[0];

      // Insert default city settings
      const settingsResult = await client.query(
        `INSERT INTO city_settings (
          city_id, currency, currency_symbol, date_format, time_format, language,
          gst_rate, cgst_rate, sgst_rate, igst_rate, tds_rate, service_charge_rate,
          min_project_value, max_project_value, default_lead_assignment_mode
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          city.id,
          settings.currency || 'INR',
          settings.currency_symbol || '₹',
          settings.date_format || 'DD/MM/YYYY',
          settings.time_format || '12h',
          settings.language || 'en',
          settings.gst_rate || 18.00,
          settings.cgst_rate || 9.00,
          settings.sgst_rate || 9.00,
          settings.igst_rate || 18.00,
          settings.tds_rate || 1.00,
          settings.service_charge_rate || 0.00,
          settings.min_project_value || 50000,
          settings.max_project_value || 10000000,
          settings.default_lead_assignment_mode || 'auto'
        ]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'City created successfully',
        city: { ...city, settings: settingsResult.rows[0] }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create city error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'City with this name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update city (SuperAdmin only)
app.put('/cities/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { id } = req.params;
    const {
      display_name,
      state,
      state_code,
      country,
      timezone,
      is_active,
      is_operational,
      launch_date
    } = req.body;

    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    if (display_name !== undefined) {
      updateFields.push(`display_name = $${paramIndex}`);
      queryParams.push(display_name);
      paramIndex++;
    }
    if (state !== undefined) {
      updateFields.push(`state = $${paramIndex}`);
      queryParams.push(state);
      paramIndex++;
    }
    if (state_code !== undefined) {
      updateFields.push(`state_code = $${paramIndex}`);
      queryParams.push(state_code);
      paramIndex++;
    }
    if (country !== undefined) {
      updateFields.push(`country = $${paramIndex}`);
      queryParams.push(country);
      paramIndex++;
    }
    if (timezone !== undefined) {
      updateFields.push(`timezone = $${paramIndex}`);
      queryParams.push(timezone);
      paramIndex++;
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      queryParams.push(is_active);
      paramIndex++;
    }
    if (is_operational !== undefined) {
      updateFields.push(`is_operational = $${paramIndex}`);
      queryParams.push(is_operational);
      paramIndex++;
    }
    if (launch_date !== undefined) {
      updateFields.push(`launch_date = $${paramIndex}`);
      queryParams.push(launch_date);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = NOW()`);
    queryParams.push(id);

    const updateQuery = `
      UPDATE cities
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    res.json({
      success: true,
      message: 'City updated successfully',
      city: result.rows[0]
    });

  } catch (error) {
    console.error('Update city error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete city (SuperAdmin only)
app.delete('/cities/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM cities WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    res.json({
      success: true,
      message: 'City deleted successfully',
      city: result.rows[0]
    });

  } catch (error) {
    console.error('Delete city error:', error);
    if (error.code === '23503') {
      return res.status(400).json({ error: 'Cannot delete city. It is referenced by other records.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update city settings (SuperAdmin only)
app.put('/cities/:id/settings', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { id } = req.params;
    const settings = req.body;

    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    const allowedFields = [
      'currency', 'currency_symbol', 'date_format', 'time_format', 'language',
      'gst_rate', 'cgst_rate', 'sgst_rate', 'igst_rate', 'tds_rate', 'service_charge_rate',
      'min_project_value', 'max_project_value', 'default_lead_assignment_mode'
    ];

    allowedFields.forEach(field => {
      if (settings[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        queryParams.push(settings[field]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = NOW()`);
    queryParams.push(id);

    const updateQuery = `
      UPDATE city_settings
      SET ${updateFields.join(', ')}
      WHERE city_id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'City settings not found' });
    }

    res.json({
      success: true,
      message: 'City settings updated successfully',
      settings: result.rows[0]
    });

  } catch (error) {
    console.error('Update city settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== COMMISSION CONFIGURATION ENDPOINTS (CRITICAL FEATURE 2) ====================

// Get all commission configurations
app.get('/commission-config', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { role_name, tier, is_active, city_id } = req.query;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (role_name) {
      whereClause += ` AND cc.role_name = $${paramIndex}`;
      queryParams.push(role_name);
      paramIndex++;
    }

    if (tier) {
      whereClause += ` AND cc.tier = $${paramIndex}`;
      queryParams.push(tier);
      paramIndex++;
    }

    if (is_active !== undefined) {
      whereClause += ` AND cc.is_active = $${paramIndex}`;
      queryParams.push(is_active === 'true');
      paramIndex++;
    }

    if (city_id) {
      whereClause += ` AND (cc.city_id = $${paramIndex} OR cc.city_id IS NULL)`;
      queryParams.push(city_id);
      paramIndex++;
    }

    const configQuery = `
      SELECT cc.*, c.display_name as city_name,
             u.first_name || ' ' || u.last_name as created_by_name
      FROM commission_config cc
      LEFT JOIN cities c ON cc.city_id = c.id
      LEFT JOIN users u ON cc.created_by = u.id
      ${whereClause}
      ORDER BY cc.role_name, cc.tier, cc.effective_from DESC
    `;

    const result = await pool.query(configQuery, queryParams);

    res.json({
      configs: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get commission config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get commission history
app.get('/commission-config/history', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { commission_config_id, limit = 50 } = req.query;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (commission_config_id) {
      whereClause += ` AND ch.commission_config_id = $${paramIndex}`;
      queryParams.push(commission_config_id);
      paramIndex++;
    }

    queryParams.push(limit);

    const historyQuery = `
      SELECT ch.*,
             u.first_name || ' ' || u.last_name as changed_by_name,
             cc.name as config_name
      FROM commission_history ch
      LEFT JOIN users u ON ch.changed_by = u.id
      LEFT JOIN commission_config cc ON ch.commission_config_id = cc.id
      ${whereClause}
      ORDER BY ch.changed_at DESC
      LIMIT $${paramIndex}
    `;

    const result = await pool.query(historyQuery, queryParams);

    res.json({
      history: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get commission history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create commission configuration
app.post('/commission-config', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const {
      name,
      role_name,
      tier = 'standard',
      service_type,
      city_id,
      commission_type = 'percentage',
      commission_value,
      min_amount = 0,
      max_amount,
      is_active = true,
      effective_from,
      effective_to
    } = req.body;

    if (!name || !role_name || commission_value === undefined) {
      return res.status(400).json({ error: 'Name, role_name, and commission_value are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert commission config
      const configResult = await client.query(
        `INSERT INTO commission_config (
          name, role_name, tier, service_type, city_id, commission_type,
          commission_value, min_amount, max_amount, is_active, effective_from, effective_to, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [name, role_name, tier, service_type, city_id, commission_type, commission_value,
         min_amount, max_amount, is_active, effective_from || new Date(), effective_to, req.user.id]
      );

      const config = configResult.rows[0];

      // Log history
      await client.query(
        `INSERT INTO commission_history (commission_config_id, action, new_value, changed_by, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [config.id, 'created', JSON.stringify(config), req.user.id, 'Initial creation']
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Commission configuration created successfully',
        config
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create commission config error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Commission configuration with these parameters already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update commission configuration
app.put('/commission-config/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { id } = req.params;
    const updates = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get old value
      const oldResult = await client.query('SELECT * FROM commission_config WHERE id = $1', [id]);
      if (oldResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Commission configuration not found' });
      }
      const oldValue = oldResult.rows[0];

      // Build update query
      const updateFields = [];
      const queryParams = [];
      let paramIndex = 1;

      const allowedFields = [
        'name', 'commission_type', 'commission_value', 'min_amount', 'max_amount',
        'is_active', 'effective_from', 'effective_to'
      ];

      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          queryParams.push(updates[field]);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateFields.push(`updated_at = NOW()`);
      queryParams.push(id);

      const updateQuery = `
        UPDATE commission_config
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, queryParams);
      const newValue = result.rows[0];

      // Log history
      await client.query(
        `INSERT INTO commission_history (commission_config_id, action, old_value, new_value, changed_by, reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, 'updated', JSON.stringify(oldValue), JSON.stringify(newValue), req.user.id, updates.reason || 'Updated via API']
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Commission configuration updated successfully',
        config: newValue
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Update commission config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete commission configuration
app.delete('/commission-config/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get config before deletion
      const configResult = await client.query('SELECT * FROM commission_config WHERE id = $1', [id]);
      if (configResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Commission configuration not found' });
      }
      const config = configResult.rows[0];

      // Log history
      await client.query(
        `INSERT INTO commission_history (commission_config_id, action, old_value, changed_by, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, 'deleted', JSON.stringify(config), req.user.id, 'Deleted via API']
      );

      // Delete config
      await client.query('DELETE FROM commission_config WHERE id = $1', [id]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Commission configuration deleted successfully',
        config
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Delete commission config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Preview commission calculation
app.post('/commission-config/preview', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { role_name, tier, service_type, city_id, amount } = req.body;

    if (!role_name || !amount) {
      return res.status(400).json({ error: 'role_name and amount are required' });
    }

    // Find applicable commission config
    let whereClause = 'WHERE is_active = true AND role_name = $1';
    const queryParams = [role_name];
    let paramIndex = 2;

    if (tier) {
      whereClause += ` AND tier = $${paramIndex}`;
      queryParams.push(tier);
      paramIndex++;
    }

    if (service_type) {
      whereClause += ` AND (service_type = $${paramIndex} OR service_type IS NULL)`;
      queryParams.push(service_type);
      paramIndex++;
    }

    if (city_id) {
      whereClause += ` AND (city_id = $${paramIndex} OR city_id IS NULL)`;
      queryParams.push(city_id);
      paramIndex++;
    }

    whereClause += ` AND (effective_from <= CURRENT_DATE) AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)`;

    const configQuery = `
      SELECT * FROM commission_config
      ${whereClause}
      ORDER BY city_id DESC NULLS LAST, service_type DESC NULLS LAST
      LIMIT 1
    `;

    const result = await pool.query(configQuery, queryParams);

    if (result.rows.length === 0) {
      return res.json({
        applicable_config: null,
        commission_amount: 0,
        net_amount: amount,
        message: 'No applicable commission configuration found'
      });
    }

    const config = result.rows[0];
    let commissionAmount = 0;

    if (config.commission_type === 'percentage') {
      commissionAmount = Math.round((amount * config.commission_value) / 100);
    } else if (config.commission_type === 'fixed') {
      commissionAmount = config.commission_value;
    }

    res.json({
      applicable_config: config,
      commission_amount: commissionAmount,
      net_amount: amount - commissionAmount,
      calculation_details: {
        base_amount: amount,
        commission_type: config.commission_type,
        commission_rate: config.commission_value,
        commission_amount: commissionAmount
      }
    });

  } catch (error) {
    console.error('Preview commission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== ASSIGNMENT ALGORITHM CONFIGURATION ENDPOINTS (CRITICAL FEATURE 4) ====================

// Get all assignment rules
app.get('/assignment-rules', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { rule_type, is_active } = req.query;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (rule_type) {
      whereClause += ` AND rule_type = $${paramIndex}`;
      queryParams.push(rule_type);
      paramIndex++;
    }

    if (is_active !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`;
      queryParams.push(is_active === 'true');
      paramIndex++;
    }

    const rulesQuery = `
      SELECT ar.*, u.first_name || ' ' || u.last_name as created_by_name
      FROM assignment_rules ar
      LEFT JOIN users u ON ar.created_by = u.id
      ${whereClause}
      ORDER BY ar.priority ASC, ar.name
    `;

    const result = await pool.query(rulesQuery, queryParams);

    res.json({
      rules: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get assignment rules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get assignment algorithm settings
app.get('/assignment-config', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { category } = req.query;

    let whereClause = 'WHERE is_active = true';
    const queryParams = [];

    if (category) {
      whereClause += ' AND category = $1';
      queryParams.push(category);
    }

    const settingsQuery = `
      SELECT * FROM assignment_algorithm_settings
      ${whereClause}
      ORDER BY category, setting_key
    `;

    const result = await pool.query(settingsQuery, queryParams);

    res.json({
      settings: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get assignment config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update assignment algorithm settings
app.put('/assignment-config', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings array is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updatedSettings = [];

      for (const setting of settings) {
        const { setting_key, setting_value, description, category } = setting;

        const result = await client.query(
          `INSERT INTO assignment_algorithm_settings (setting_key, setting_value, description, category, updated_by)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (setting_key)
           DO UPDATE SET
             setting_value = EXCLUDED.setting_value,
             description = EXCLUDED.description,
             category = EXCLUDED.category,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()
           RETURNING *`,
          [setting_key, JSON.stringify(setting_value), description, category || 'general', req.user.id]
        );

        updatedSettings.push(result.rows[0]);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Assignment algorithm settings updated successfully',
        settings: updatedSettings
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Update assignment config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create assignment rule
app.post('/assignment-rules', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const {
      name,
      description,
      rule_type,
      priority = 0,
      is_active = true,
      config
    } = req.body;

    if (!name || !rule_type || !config) {
      return res.status(400).json({ error: 'Name, rule_type, and config are required' });
    }

    const result = await pool.query(
      `INSERT INTO assignment_rules (name, description, rule_type, priority, is_active, config, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description, rule_type, priority, is_active, JSON.stringify(config), req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Assignment rule created successfully',
      rule: result.rows[0]
    });

  } catch (error) {
    console.error('Create assignment rule error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Assignment rule with this name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update assignment rule
app.put('/assignment-rules/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { id } = req.params;
    const updates = req.body;

    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    const allowedFields = ['name', 'description', 'priority', 'is_active', 'config'];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'config') {
          updateFields.push(`${field} = $${paramIndex}`);
          queryParams.push(JSON.stringify(updates[field]));
        } else {
          updateFields.push(`${field} = $${paramIndex}`);
          queryParams.push(updates[field]);
        }
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = NOW()`);
    queryParams.push(id);

    const updateQuery = `
      UPDATE assignment_rules
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment rule not found' });
    }

    res.json({
      success: true,
      message: 'Assignment rule updated successfully',
      rule: result.rows[0]
    });

  } catch (error) {
    console.error('Update assignment rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete assignment rule
app.delete('/assignment-rules/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM assignment_rules WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment rule not found' });
    }

    res.json({
      success: true,
      message: 'Assignment rule deleted successfully',
      rule: result.rows[0]
    });

  } catch (error) {
    console.error('Delete assignment rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test assignment algorithm
app.post('/assignment-config/test', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { lead_data, designer_pool } = req.body;

    if (!lead_data) {
      return res.status(400).json({ error: 'lead_data is required' });
    }

    // Get active assignment rules
    const rulesResult = await pool.query(
      `SELECT * FROM assignment_rules
       WHERE rule_type = 'lead_assignment' AND is_active = true
       ORDER BY priority ASC`
    );

    // Get algorithm settings
    const settingsResult = await pool.query(
      `SELECT * FROM assignment_algorithm_settings
       WHERE category = 'lead_assignment' AND is_active = true`
    );

    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    // Simple scoring algorithm for testing
    const scores = [];
    const designers = designer_pool || [];

    designers.forEach(designer => {
      let score = 0;
      let breakdown = {};

      // Location matching
      if (lead_data.city === designer.city) {
        const locationWeight = settings.location_matching_weight?.weight || 0.4;
        score += locationWeight * 100;
        breakdown.location = locationWeight * 100;
      }

      // Expertise matching (simplified)
      if (designer.expertise && designer.expertise.includes(lead_data.project_type)) {
        const expertiseWeight = settings.expertise_matching_weight?.weight || 0.3;
        score += expertiseWeight * 100;
        breakdown.expertise = expertiseWeight * 100;
      }

      // Performance score
      if (designer.performance_score) {
        const performanceWeight = settings.performance_matching_weight?.weight || 0.2;
        score += (designer.performance_score / 5) * performanceWeight * 100;
        breakdown.performance = (designer.performance_score / 5) * performanceWeight * 100;
      }

      // Availability
      const maxLeads = settings.load_balancing_enabled?.max_leads_per_designer || 10;
      const currentLeads = designer.active_leads || 0;
      if (currentLeads < maxLeads) {
        const availabilityWeight = settings.availability_matching_weight?.weight || 0.1;
        score += ((maxLeads - currentLeads) / maxLeads) * availabilityWeight * 100;
        breakdown.availability = ((maxLeads - currentLeads) / maxLeads) * availabilityWeight * 100;
      }

      scores.push({
        designer_id: designer.id,
        designer_name: designer.name,
        total_score: Math.round(score),
        breakdown
      });
    });

    // Sort by score
    scores.sort((a, b) => b.total_score - a.total_score);

    res.json({
      success: true,
      lead_data,
      algorithm_settings: settings,
      active_rules: rulesResult.rows,
      designer_scores: scores,
      recommended_designer: scores[0] || null,
      message: 'Assignment algorithm test completed'
    });

  } catch (error) {
    console.error('Test assignment algorithm error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== MENU CONFIGURATION ENDPOINTS (CRITICAL FEATURE 3) ====================

// Get all menus with role assignments
app.get('/menus/all', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const menusQuery = `
      SELECT m.*,
             ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as assigned_roles
      FROM menus m
      LEFT JOIN role_menus rm ON m.id = rm.menu_id
      LEFT JOIN roles r ON rm.role_id = r.id
      GROUP BY m.id
      ORDER BY m.parent_id NULLS FIRST, m.sort_order
    `;

    const result = await pool.query(menusQuery);

    res.json({
      menus: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('Get all menus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new menu
app.post('/menus', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const {
      name,
      display_name,
      icon,
      path,
      parent_id,
      sort_order = 0,
      is_active = true
    } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({ error: 'Name and display_name are required' });
    }

    const result = await pool.query(
      `INSERT INTO menus (name, display_name, icon, path, parent_id, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, display_name, icon, path || null, parent_id || null, sort_order, is_active]
    );

    res.status(201).json({
      success: true,
      message: 'Menu created successfully',
      menu: result.rows[0]
    });

  } catch (error) {
    console.error('Create menu error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Menu with this name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update menu
app.put('/menus/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { id } = req.params;
    const updates = req.body;

    const updateFields = [];
    const queryParams = [];
    let paramIndex = 1;

    const allowedFields = ['display_name', 'icon', 'path', 'parent_id', 'sort_order', 'is_active'];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        queryParams.push(updates[field]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    queryParams.push(id);

    const updateQuery = `
      UPDATE menus
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    res.json({
      success: true,
      message: 'Menu updated successfully',
      menu: result.rows[0]
    });

  } catch (error) {
    console.error('Update menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete menu
app.delete('/menus/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { id } = req.params;

    // Check if menu has children
    const childrenCheck = await pool.query(
      'SELECT COUNT(*) as count FROM menus WHERE parent_id = $1',
      [id]
    );

    if (parseInt(childrenCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete menu with child items. Delete children first.' });
    }

    const result = await pool.query(
      'DELETE FROM menus WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    res.json({
      success: true,
      message: 'Menu deleted successfully',
      menu: result.rows[0]
    });

  } catch (error) {
    console.error('Delete menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign menu to roles
app.post('/menus/:id/assign-roles', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { id } = req.params;
    const { role_ids } = req.body;

    if (!Array.isArray(role_ids)) {
      return res.status(400).json({ error: 'role_ids must be an array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Remove existing role assignments
      await client.query('DELETE FROM role_menus WHERE menu_id = $1', [id]);

      // Add new role assignments
      for (const roleId of role_ids) {
        await client.query(
          'INSERT INTO role_menus (role_id, menu_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [roleId, id]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Menu roles assigned successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Assign menu roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder menus
app.put('/menus/reorder', authenticateToken, async (req, res) => {
  try {
    if (!req.user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Unauthorized. SuperAdmin access required.' });
    }

    const { menu_orders } = req.body;

    if (!Array.isArray(menu_orders)) {
      return res.status(400).json({ error: 'menu_orders must be an array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const item of menu_orders) {
        await client.query(
          'UPDATE menus SET sort_order = $1, parent_id = $2 WHERE id = $3',
          [item.sort_order, item.parent_id || null, item.id]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Menus reordered successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Reorder menus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== MATERIALS ENDPOINTS ====================

// Get all materials
app.get('/materials', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, vendorId, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE m.is_active = true';
    const queryParams = [];
    let paramIndex = 1;

    if (category && category !== 'undefined') {
      whereClause += ` AND m.category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    if (vendorId && vendorId !== 'undefined') {
      whereClause += ` AND m.vendor_id = $${paramIndex}`;
      queryParams.push(vendorId);
      paramIndex++;
    }

    if (search && search !== 'undefined') {
      whereClause += ` AND (m.name ILIKE $${paramIndex} OR m.description ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const materialsQuery = `
      SELECT
        m.*,
        v.company_name as vendor_name,
        v.rating as vendor_rating,
        v.city as vendor_city,
        v.is_verified as vendor_verified
      FROM materials m
      LEFT JOIN vendors v ON m.vendor_id = v.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM materials m
      ${whereClause}
    `;

    queryParams.push(limit, offset);

    const [materialsResult, countResult] = await Promise.all([
      pool.query(materialsQuery, queryParams),
      pool.query(countQuery, queryParams.slice(0, -2))
    ]);

    res.json({
      materials: materialsResult.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    });

  } catch (error) {
    console.error('Materials fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get material statistics
app.get('/materials/stats', authenticateToken, async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_materials,
        COUNT(*) FILTER (WHERE is_active = true) as active_materials,
        COUNT(DISTINCT category) as categories,
        SUM(price * stock_quantity) as total_value,
        COUNT(*) FILTER (WHERE stock_quantity < 10) as low_stock_count,
        COUNT(*) FILTER (WHERE stock_quantity = 0) as out_of_stock_count
      FROM materials
    `;

    const categoryStatsQuery = `
      SELECT
        category,
        COUNT(*) as count,
        SUM(stock_quantity) as total_stock
      FROM materials
      WHERE is_active = true
      GROUP BY category
      ORDER BY count DESC
    `;

    const [statsResult, categoryResult] = await Promise.all([
      pool.query(statsQuery),
      pool.query(categoryStatsQuery)
    ]);

    const stats = statsResult.rows[0];

    res.json({
      total_materials: parseInt(stats.total_materials || 0),
      active_materials: parseInt(stats.active_materials || 0),
      categories: parseInt(stats.categories || 0),
      total_value: parseFloat(stats.total_value || 0),
      low_stock_count: parseInt(stats.low_stock_count || 0),
      out_of_stock_count: parseInt(stats.out_of_stock_count || 0),
      by_category: categoryResult.rows
    });

  } catch (error) {
    console.error('Material stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get material categories
app.get('/materials/categories', authenticateToken, async (req, res) => {
  try {
    const categoriesQuery = `
      SELECT DISTINCT category
      FROM materials
      WHERE is_active = true AND category IS NOT NULL
      ORDER BY category
    `;

    const result = await pool.query(categoriesQuery);
    const categories = result.rows.map(row => row.category);

    res.json({ categories });

  } catch (error) {
    console.error('Material categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
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
  console.log('💾 Database: PostgreSQL (gharinto_dev)');
});

module.exports = app;

