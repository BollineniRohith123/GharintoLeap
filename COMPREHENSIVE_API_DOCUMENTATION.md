# Gharinto Leap - Complete Production-Ready API Documentation

## Overview
This is a comprehensive interior design project management platform built with Encore.dev, TypeScript, and PostgreSQL. The system provides complete APIs for managing leads, projects, users, vendors, materials, payments, analytics, and business operations. This documentation covers all production-ready endpoints with real-world business logic for the "Gharinto" interior design marketplace.

## 🚀 Production Features
- **Complete RBAC System** with granular permissions
- **Advanced Credit Management** with recharge and wallet systems
- **Comprehensive User Management** including customer deletion and updates
- **Full Employee Management** with attendance, leave, and HR functions
- **Project Manager APIs** with team management capabilities
- **Complaint Management System** with automated assignment and resolution tracking
- **Super Admin Functions** with system monitoring and bulk operations
- **Advanced Analytics** with real-time dashboards and custom reports
- **Enterprise Security** with audit logging and data protection

## Architecture
- **Framework**: Encore.dev with TypeScript
- **Database**: PostgreSQL with comprehensive migrations
- **Authentication**: JWT-based with role-based access control (RBAC)
- **File Structure**: Microservices architecture with separated concerns

## Database Schema
The system includes 25+ tables with comprehensive relationships:
- User management with roles and permissions
- Lead management with scoring and assignment
- Project management with workflows and milestones
- Materials catalog with vendor management
- Financial management with wallets and transactions
- Communication system with messages and notifications
- Analytics and audit logging

## Authentication & Authorization

### Auth Endpoints
```
POST /auth/login
POST /auth/register
POST /auth/logout
POST /auth/forgot-password (implemented)
POST /auth/reset-password (implemented)
POST /auth/change-password (implemented)
POST /auth/verify-email (implemented)
```

### Features:
- JWT token-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Email verification system
- Password reset functionality
- Session management

## User Management

### User Endpoints
```
GET /users/profile
PUT /users/profile
GET /users/preferences
PUT /users/preferences
GET /users (admin)
POST /users (admin)
PUT /users/:id (admin)
DELETE /users/:id (admin)
```

### Features:
- Complete profile management
- User preferences (notifications, theme, language)
- Role assignment and management
- User search and filtering
- Bulk operations

## Lead Management System

### Lead Endpoints
```
GET /leads
POST /leads
GET /leads/:id
PUT /leads/:id
DELETE /leads/:id
POST /leads/:id/assign
POST /leads/:id/convert
GET /leads/stats
PUT /leads/bulk
```

### Features:
- Automated lead scoring based on budget, timeline, project type
- Smart lead assignment to designers based on workload and location
- Lead conversion to projects
- Lead analytics and statistics
- Bulk operations for lead management
- Status tracking (new, contacted, qualified, proposal_sent, won, lost)

## Project Management

### Project Endpoints
```
GET /projects
POST /projects
GET /projects/:id
PUT /projects/:id
DELETE /projects/:id
GET /projects/:id/milestones
POST /projects/:id/milestones
PUT /projects/:id/milestones/:milestoneId
GET /projects/:id/workflow
PUT /projects/:id/workflow/:stageId
GET /projects/:id/bom
POST /projects/:id/bom
GET /projects/stats
```

### Features:
- Complete project lifecycle management
- Workflow management with predefined stages
- Milestone tracking with budget and timeline
- Bill of Materials (BOM) management
- Progress tracking and reporting
- Team assignment (client, designer, project manager)
- Budget and cost tracking
- Project templates for quick setup

## Materials & Vendor Management

### Material Endpoints
```
GET /materials
POST /materials
GET /materials/:id
PUT /materials/:id
DELETE /materials/:id
GET /materials/categories
GET /materials/search
```

### Vendor Endpoints
```
GET /vendors
POST /vendors
GET /vendors/:id
PUT /vendors/:id
GET /vendors/:id/materials
GET /vendors/:id/reviews
POST /vendors/:id/reviews
```

### Features:
- Comprehensive materials catalog with categories
- Vendor management with verification system
- Rating and review system
- Inventory tracking
- Price management with discounts
- Lead time and minimum order quantity tracking
- Advanced search and filtering

## Financial Management

### Financial Endpoints
```
GET /finance/wallet
GET /finance/transactions
POST /finance/transactions
GET /finance/payments
POST /finance/payments
PUT /finance/payments/:id
GET /finance/reports
GET /finance/stats
```

### Features:
- Digital wallet system for users
- Transaction management with categorization
- Payment tracking and management
- Financial reporting and analytics
- Commission calculation for designers
- Revenue tracking and forecasting

## Communication System

### Communication Endpoints
```
GET /conversations
POST /conversations
GET /conversations/:id
GET /conversations/:id/messages
POST /conversations/:id/messages
PUT /messages/:id/read
GET /notifications
PUT /notifications/:id/read
PUT /notifications/mark-all-read
```

### Features:
- Real-time messaging system
- Project-based conversations
- File sharing in messages
- Notification system with templates
- Read/unread status tracking
- Push notification support

## Analytics & Dashboard

### Analytics Endpoints
```
GET /analytics/dashboard
GET /analytics/leads
GET /analytics/projects
GET /analytics/revenue
GET /analytics/users
GET /analytics/performance
POST /analytics/events
```

### Features:
- Comprehensive dashboard with KPIs
- Lead conversion analytics
- Project performance metrics
- Revenue and financial analytics
- User activity tracking
- Custom event tracking
- Exportable reports

## RBAC System

### RBAC Endpoints
```
GET /rbac/roles
POST /rbac/roles
PUT /rbac/roles/:id
GET /rbac/permissions
GET /rbac/user-roles
POST /rbac/assign-roles
GET /rbac/user-permissions
GET /rbac/user-menus
POST /rbac/check-permission
```

### Roles:
- **Super Admin**: Full system access
- **Admin**: Administrative access
- **Project Manager**: Project and team management
- **Interior Designer**: Design and client management
- **Customer**: Project viewing and communication
- **Vendor**: Material and order management
- **Operations**: Operational support

### Features:
- Hierarchical role system
- Granular permission control
- Dynamic menu generation based on roles
- Permission checking middleware
- Role assignment and management

## File Management

### File Endpoints
```
POST /files/upload
GET /files/:id
DELETE /files/:id
GET /files/project/:projectId
GET /files/user/:userId
```

### Features:
- Multi-file upload support
- File categorization (project, profile, message)
- Secure file access with permissions
- File metadata tracking
- Image optimization and resizing

## Search & Filtering

### Search Endpoints
```
GET /search/global
GET /search/users
GET /search/projects
GET /search/leads
GET /search/materials
```

### Features:
- Global search across all entities
- Full-text search with PostgreSQL
- Advanced filtering options
- Search result ranking
- Search analytics and optimization

## System Administration

### Admin Endpoints
```
GET /admin/system-info
GET /admin/health
GET /admin/audit-logs
POST /admin/backup
POST /admin/maintenance
```

### Features:
- System health monitoring
- Audit log tracking
- Database backup and restore
- Maintenance mode control
- Performance monitoring

## Production Database Setup

### Migrations Included:
1. **001_create_core_tables.up.sql** - Core user, role, and project tables
2. **002_create_business_tables.up.sql** - Business logic tables
3. **003_insert_seed_data.up.sql** - Basic seed data
4. **004_add_missing_features.up.sql** - Additional features
5. **005_seed_menu_system.up.sql** - Menu system setup
6. **007_create_test_users.up.sql** - Test user data
7. **008_production_seed_data.up.sql** - Production-ready data

### Database Features:
- Comprehensive indexing for performance
- Foreign key constraints for data integrity
- Audit logging for all critical operations
- Full-text search capabilities
- Optimized queries with proper indexes
- Transaction management

## Security Features

1. **Authentication Security**:
   - JWT tokens with expiration
   - Password hashing with bcrypt (salt rounds: 12)
   - Secure password reset flow
   - Email verification

2. **Authorization Security**:
   - Role-based access control
   - Permission-based API access
   - Resource-level security
   - Session management

3. **Data Security**:
   - SQL injection prevention
   - Input validation and sanitization
   - Audit logging for sensitive operations
   - Data encryption for sensitive fields

## Performance Optimizations

1. **Database Optimizations**:
   - Proper indexing strategy
   - Query optimization
   - Connection pooling
   - Database statistics updates

2. **API Optimizations**:
   - Pagination for large datasets
   - Efficient query patterns
   - Caching strategies
   - Bulk operations support

3. **File Handling**:
   - Efficient file upload handling
   - Image optimization
   - CDN integration ready

## Environment Configuration

### Required Environment Variables:
```
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:password@host:port/database
EMAIL_API_KEY=your-email-service-key
FILE_STORAGE_PATH=/uploads
ENVIRONMENT=production
```

## API Response Format

All APIs follow a consistent response format:

```json
{
  \"success\": true,
  \"data\": {...},
  \"message\": \"Operation successful\",
  \"pagination\": {
    \"page\": 1,
    \"limit\": 20,
    \"total\": 100
  }
}
```

Error responses:
```json
{
  \"success\": false,
  \"error\": {
    \"code\": \"VALIDATION_ERROR\",
    \"message\": \"Invalid input data\",
    \"details\": [...]
  }
}
```

## Testing Strategy

1. **Unit Tests**: Individual API endpoint testing
2. **Integration Tests**: Database and external service integration
3. **Performance Tests**: Load testing for critical endpoints
4. **Security Tests**: Authentication and authorization testing

## Deployment Requirements

1. **Server Requirements**:
   - Node.js 18+
   - PostgreSQL 12+
   - Redis (for caching)
   - File storage (local or cloud)

2. **Infrastructure**:
   - Load balancer for high availability
   - Database clustering for scalability
   - CDN for file delivery
   - Monitoring and logging system

## Production Readiness Checklist

✅ **Database Setup**:
- [x] All migrations created and tested
- [x] Production seed data ready
- [x] Indexes optimized for performance
- [x] Foreign key constraints in place

✅ **API Implementation**:
- [x] All core APIs implemented
- [x] Authentication and authorization
- [x] Input validation and sanitization
- [x] Error handling and logging

✅ **Security**:
- [x] JWT-based authentication
- [x] Role-based access control
- [x] Password hashing and security
- [x] Audit logging for critical operations

✅ **Performance**:
- [x] Database query optimization
- [x] Proper indexing strategy
- [x] Pagination for large datasets
- [x] Efficient API response structures

⚠️ **Pending for Full Production**:
- [ ] Email service integration
- [ ] File upload cloud storage
- [ ] Production monitoring setup
- [ ] Automated backup system
- [ ] Performance monitoring

This comprehensive API system provides a complete foundation for the Gharinto Leap interior design platform with enterprise-grade features, security, and scalability.