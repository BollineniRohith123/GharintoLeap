// CRITICAL MISSING API ENDPOINTS - Add to server.ts

// ==================== REGISTRATION ====================
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, city, userType = 'customer' } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, city)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [email, passwordHash, firstName, lastName, phone, city]);

    const token = jwt.sign({ id: userResult.rows[0].id, email }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: userResult.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== WALLET & TRANSACTIONS ====================
app.get('/wallet', authenticateToken, async (req: any, res) => {
  try {
    let wallet = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [req.user.id]);
    if (wallet.rows.length === 0) {
      const newWallet = await pool.query('INSERT INTO wallets (user_id) VALUES ($1) RETURNING *', [req.user.id]);
      wallet = newWallet;
    }
    res.json(wallet.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/wallet/transactions', authenticateToken, async (req: any, res) => {
  try {
    const transactions = await pool.query(`
      SELECT * FROM transactions t 
      JOIN wallets w ON t.wallet_id = w.id 
      WHERE w.user_id = $1 ORDER BY t.created_at DESC LIMIT 50
    `, [req.user.id]);
    res.json({ transactions: transactions.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== FINANCIAL MANAGEMENT ====================
app.get('/quotations', authenticateToken, async (req: any, res) => {
  try {
    const quotations = await pool.query(`
      SELECT q.*, u.first_name, u.last_name, p.title as project_title
      FROM quotations q 
      JOIN users u ON q.client_id = u.id 
      LEFT JOIN projects p ON q.project_id = p.id
      WHERE q.client_id = $1 OR $2 = ANY(ARRAY['admin', 'finance_manager'])
      ORDER BY q.created_at DESC
    `, [req.user.id, req.user.roles?.[0] || 'customer']);
    res.json({ quotations: quotations.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/invoices', authenticateToken, async (req: any, res) => {
  try {
    const invoices = await pool.query(`
      SELECT i.*, u.first_name, u.last_name, p.title as project_title
      FROM invoices i 
      JOIN users u ON i.client_id = u.id 
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE i.client_id = $1 OR $2 = ANY(ARRAY['admin', 'finance_manager'])
      ORDER BY i.created_at DESC
    `, [req.user.id, req.user.roles?.[0] || 'customer']);
    res.json({ invoices: invoices.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== EMPLOYEE MANAGEMENT ====================
app.get('/employees', authenticateToken, requirePermission('employees.view'), async (req: any, res) => {
  try {
    const employees = await pool.query(`
      SELECT u.*, ep.employee_id, ep.department, ep.designation, ep.joining_date
      FROM users u 
      JOIN employee_profiles ep ON u.id = ep.user_id
      WHERE ep.is_active = true
      ORDER BY ep.joining_date DESC
    `);
    res.json({ employees: employees.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/employees/attendance', authenticateToken, async (req: any, res) => {
  try {
    const { userId, date, checkInTime, checkOutTime, status } = req.body;
    const empId = userId || req.user.id;
    
    const attendance = await pool.query(`
      INSERT INTO employee_attendance (user_id, date, check_in_time, check_out_time, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, date) DO UPDATE SET
      check_in_time = $3, check_out_time = $4, status = $5
      RETURNING *
    `, [empId, date, checkInTime, checkOutTime, status]);
    
    res.json(attendance.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== COMPLAINTS ====================
app.get('/complaints', authenticateToken, async (req: any, res) => {
  try {
    const complaints = await pool.query(`
      SELECT c.*, p.title as project_title
      FROM complaints c 
      LEFT JOIN projects p ON c.project_id = p.id
      WHERE c.complainant_id = $1 OR $2 = ANY(ARRAY['admin', 'support'])
      ORDER BY c.created_at DESC
    `, [req.user.id, req.user.roles?.[0] || 'customer']);
    res.json({ complaints: complaints.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/complaints', authenticateToken, async (req: any, res) => {
  try {
    const { title, description, priority = 'medium', projectId } = req.body;
    const complaintNumber = `COMP-${Date.now()}`;
    
    const complaint = await pool.query(`
      INSERT INTO complaints (complaint_number, title, description, priority, project_id, 
                            complainant_id, complainant_name, complainant_email)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [complaintNumber, title, description, priority, projectId, req.user.id, 
        `${req.user.firstName} ${req.user.lastName}`, req.user.email]);
    
    res.status(201).json(complaint.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== PASSWORD RESET ====================
app.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (user.rows.length > 0) {
      const resetToken = jwt.sign({ userId: user.rows[0].id }, JWT_SECRET, { expiresIn: '1h' });
      await pool.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', 
        [user.rows[0].id, resetToken, new Date(Date.now() + 3600000)]);
      console.log(`Reset token: ${resetToken}`); // In production, send email
    }
    
    res.json({ message: 'Reset link sent if email exists' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, decoded.userId]);
    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1', [token]);
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// ==================== NOTIFICATIONS ====================
app.get('/notifications', authenticateToken, async (req: any, res) => {
  try {
    const notifications = await pool.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 AND is_archived = false
      ORDER BY created_at DESC LIMIT 50
    `, [req.user.id]);
    res.json({ notifications: notifications.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/notifications/:id/read', authenticateToken, async (req: any, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2', 
      [req.params.id, req.user.id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default app;