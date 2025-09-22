// Simple development server for local testing
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { join } from 'path';

const app = express();
const PORT = 4000;

// Middleware - Configure CORS to allow credentials from frontend
app.use(cors({
  origin: 'http://localhost:5173', // Specific origin for frontend
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Auth middleware with proper JWT validation
const authenticateToken = (req: any, res: any, next: any) => {
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

  // For mock server, validate token format (in production, use proper JWT verification)
  if (token === 'mock-jwt-token-for-development') {
    req.user = { id: 1, email: 'admin@gharinto.com' };
    next();
  } else {
    // Reject any token that's not the expected mock token
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Enhanced login validation
const validateCredentials = (email: string, password: string): boolean => {
  // For mock server, validate against known test users
  const validUsers = [
    'admin@gharinto.com',
    'superadmin@gharinto.com', 
    'pm@gharinto.com',
    'designer@gharinto.com',
    'customer@gharinto.com',
    'vendor@gharinto.com'
  ];
  
  return validUsers.includes(email) && password === 'password123';
};
const mockResponses = {
  '/auth/login': {
    token: 'mock-jwt-token-for-development',
    user: {
      id: 1,
      email: 'admin@gharinto.com',
      firstName: 'Admin',
      lastName: 'User',
      roles: ['super_admin'],
      permissions: ['*']
    }
  },
  '/users/profile': {
    id: 1,
    email: 'admin@gharinto.com',
    firstName: 'Admin',
    lastName: 'User',
    roles: ['super_admin'],
    permissions: ['*'],
    menus: [
      { name: 'dashboard', displayName: 'Dashboard', path: '/dashboard', icon: 'Home' },
      { name: 'leads', displayName: 'Leads', path: '/leads', icon: 'Users' },
      { name: 'projects', displayName: 'Projects', path: '/projects', icon: 'Briefcase' },
      { name: 'analytics', displayName: 'Analytics', path: '/analytics', icon: 'BarChart3' },
      { name: 'users', displayName: 'Users', path: '/users', icon: 'Shield' },
      { name: 'settings', displayName: 'Settings', path: '/settings', icon: 'Settings' }
    ]
  },
  '/leads': {
    leads: [
      {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+91 98765 43210',
        city: 'Mumbai',
        projectType: 'Full Home Interior',
        budgetRange: '₹10-20 Lakhs',
        score: 85,
        status: 'new',
        createdAt: '2024-01-15'
      }
    ],
    total: 1,
    page: 1,
    limit: 20
  },
  '/analytics/dashboard': {
    totalLeads: 150,
    totalProjects: 45,
    totalRevenue: 2500000,
    activeProjects: 23,
    conversionRate: 32.5,
    leadsThisMonth: 42,
    projectsThisMonth: 12,
    revenueThisMonth: 850000
  },
  '/rbac/user-permissions': {
    permissions: ['*', 'admin_access', 'user_management', 'project_management', 'lead_management']
  },
  '/menus/user': {
    menus: [
      { name: 'dashboard', displayName: 'Dashboard', path: '/dashboard', icon: 'Home' },
      { name: 'leads', displayName: 'Leads', path: '/leads', icon: 'Users' },
      { name: 'projects', displayName: 'Projects', path: '/projects', icon: 'Briefcase' },
      { name: 'analytics', displayName: 'Analytics', path: '/analytics', icon: 'BarChart3' },
      { name: 'users', displayName: 'Users', path: '/users', icon: 'Shield' },
      { name: 'settings', displayName: 'Settings', path: '/settings', icon: 'Settings' }
    ]
  }
};

// Routes
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email, password });
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  // Validate credentials against known test users
  if (validateCredentials(email, password)) {
    // Return role-specific data based on email
    const userRoles = {
      'admin@gharinto.com': ['admin'],
      'superadmin@gharinto.com': ['super_admin'],
      'pm@gharinto.com': ['project_manager'],
      'designer@gharinto.com': ['interior_designer'],
      'customer@gharinto.com': ['customer'],
      'vendor@gharinto.com': ['vendor']
    };
    
    const roles = userRoles[email] || ['customer'];
    
    res.json({
      ...mockResponses['/auth/login'],
      user: {
        ...mockResponses['/auth/login'].user,
        email: email,
        roles: roles
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/users/profile', authenticateToken, (req, res) => {
  res.json(mockResponses['/users/profile']);
});

app.get('/leads', authenticateToken, (req, res) => {
  res.json(mockResponses['/leads']);
});

app.get('/analytics/dashboard', authenticateToken, (req, res) => {
  res.json(mockResponses['/analytics/dashboard']);
});

// System/RBAC endpoints
app.get('/rbac/user-permissions', authenticateToken, (req, res) => {
  res.json(mockResponses['/rbac/user-permissions']);
});

// Menu endpoints
app.get('/menus/user', authenticateToken, (req, res) => {
  res.json(mockResponses['/menus/user']);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check (mock)
app.get('/health/db', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: 'mock',
    timestamp: new Date().toISOString() 
  });
});

// Catch all
app.use((req, res) => {
  console.log('Unhandled request:', req.method, req.originalUrl);
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`🚀 Development server running on http://localhost:${PORT}`);
  console.log('📝 Available endpoints:');
  console.log('  POST /auth/login');
  console.log('  GET  /users/profile');
  console.log('  GET  /leads');
  console.log('  GET  /analytics/dashboard');
  console.log('  GET  /rbac/user-permissions');
  console.log('  GET  /menus/user');
  console.log('  GET  /health');
  console.log('\\n✨ Frontend should connect to: http://localhost:4000');
});