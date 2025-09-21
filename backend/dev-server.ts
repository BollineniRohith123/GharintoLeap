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

// Mock database responses for development
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
  
  if (email && password) {
    res.json(mockResponses['/auth/login']);
  } else {
    res.status(400).json({ error: 'Email and password required' });
  }
});

app.get('/users/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    res.json(mockResponses['/users/profile']);
  } else {
    res.status(401).json({ error: 'Authorization required' });
  }
});

app.get('/leads', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    res.json(mockResponses['/leads']);
  } else {
    res.status(401).json({ error: 'Authorization required' });
  }
});

app.get('/analytics/dashboard', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    res.json(mockResponses['/analytics/dashboard']);
  } else {
    res.status(401).json({ error: 'Authorization required' });
  }
});

// System/RBAC endpoints
app.get('/rbac/user-permissions', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    res.json(mockResponses['/rbac/user-permissions']);
  } else {
    res.status(401).json({ error: 'Authorization required' });
  }
});

// Menu endpoints
app.get('/menus/user', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    res.json(mockResponses['/menus/user']);
  } else {
    res.status(401).json({ error: 'Authorization required' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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