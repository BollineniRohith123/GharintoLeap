-- GHARINTO LEAP INTERIOR DESIGN MARKETPLACE - COMPLETE DATABASE SCHEMA ANALYSIS
-- Production-Ready Database Schema for Enterprise Interior Design Platform
-- Generated for comprehensive architecture review

-- =====================================================================================
-- CORE AUTHENTICATION & AUTHORIZATION TABLES
-- =====================================================================================

-- Users (Core entity for all user types)
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  referral_code VARCHAR(20) UNIQUE,
  referred_by BIGINT REFERENCES users(id),
  marketing_consent_given BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(100),
  phone_verification_token VARCHAR(10),
  last_login_at TIMESTAMP,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Roles (Dynamic role management)
CREATE TABLE roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Permissions (Granular permission system)
CREATE TABLE permissions (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Role-Permission Junction (Many-to-many)
CREATE TABLE role_permissions (
  id BIGSERIAL PRIMARY KEY,
  role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id BIGINT REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- User-Role Junction (Many-to-many with audit trail)
CREATE TABLE user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by BIGINT REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- =====================================================================================
-- MENU & NAVIGATION SYSTEM
-- =====================================================================================

-- Hierarchical menu system
CREATE TABLE menus (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  icon VARCHAR(50),
  path VARCHAR(200),
  parent_id BIGINT REFERENCES menus(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Role-based menu access control
CREATE TABLE role_menus (
  id BIGSERIAL PRIMARY KEY,
  role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
  menu_id BIGINT REFERENCES menus(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, menu_id)
);

-- =====================================================================================
-- BUSINESS CORE TABLES
-- =====================================================================================

-- Lead Management
CREATE TABLE leads (
  id BIGSERIAL PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  city VARCHAR(100) NOT NULL,
  budget_min BIGINT,
  budget_max BIGINT,
  project_type VARCHAR(50),
  property_type VARCHAR(50),
  timeline VARCHAR(50),
  description TEXT,
  score INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'new',
  assigned_to BIGINT REFERENCES users(id),
  converted_to_project BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Lead Sources Management
CREATE TABLE lead_sources (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  cost_per_lead DECIMAL(10,2),
  conversion_rate DECIMAL(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project Management (Core business entity)
CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  client_id BIGINT REFERENCES users(id) NOT NULL,
  designer_id BIGINT REFERENCES users(id),
  project_manager_id BIGINT REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'planning',
  priority VARCHAR(10) DEFAULT 'medium',
  budget BIGINT NOT NULL,
  estimated_cost BIGINT,
  actual_cost BIGINT DEFAULT 0,
  start_date DATE,
  end_date DATE,
  estimated_end_date DATE,
  progress_percentage INTEGER DEFAULT 0,
  city VARCHAR(100),
  address TEXT,
  area_sqft INTEGER,
  property_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Milestones
CREATE TABLE project_milestones (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  budget BIGINT DEFAULT 0,
  actual_cost BIGINT DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Tasks Management
CREATE TABLE project_tasks (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_to BIGINT REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  dependencies BIGINT[], -- Array of task IDs
  created_by BIGINT REFERENCES users(id),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Team Members
CREATE TABLE project_team_members (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  team_member_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,
  responsibilities TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  added_by BIGINT REFERENCES users(id),
  removed_by BIGINT REFERENCES users(id),
  removed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, team_member_id, role)
);

-- Change Orders Management
CREATE TABLE change_orders (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  change_order_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  reason TEXT,
  cost_impact BIGINT DEFAULT 0,
  time_impact_days INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'implemented')),
  requested_by BIGINT REFERENCES users(id),
  approved_by BIGINT REFERENCES users(id),
  requested_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  implemented_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================================================
-- VENDOR & MATERIALS MANAGEMENT
-- =====================================================================================

-- Vendor Management
CREATE TABLE vendors (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  company_name VARCHAR(200) NOT NULL,
  business_type VARCHAR(50),
  gst_number VARCHAR(20),
  pan_number VARCHAR(10),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  is_verified BOOLEAN DEFAULT FALSE,
  rating DOUBLE PRECISION DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Materials Catalog
CREATE TABLE materials (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT REFERENCES vendors(id),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  brand VARCHAR(100),
  model VARCHAR(100),
  description TEXT,
  unit VARCHAR(20) NOT NULL,
  price BIGINT NOT NULL,
  discounted_price BIGINT,
  stock_quantity INTEGER DEFAULT 0,
  min_order_quantity INTEGER DEFAULT 1,
  lead_time_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  images TEXT[], -- JSON array of image URLs
  specifications TEXT, -- JSON specifications
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bill of Materials
CREATE TABLE bom_items (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  material_id BIGINT REFERENCES materials(id),
  quantity DOUBLE PRECISION NOT NULL,
  unit_price BIGINT NOT NULL,
  total_price BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  ordered_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================================================
-- FINANCIAL MANAGEMENT SYSTEM
-- =====================================================================================

-- Digital Wallet System
CREATE TABLE wallets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) UNIQUE,
  balance BIGINT DEFAULT 0,
  total_earned BIGINT DEFAULT 0,
  total_spent BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transaction Management
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  wallet_id BIGINT REFERENCES wallets(id),
  type VARCHAR(20) NOT NULL, -- credit, debit
  amount BIGINT NOT NULL,
  description TEXT,
  reference_type VARCHAR(50), -- project, lead, commission
  reference_id BIGINT,
  status VARCHAR(20) DEFAULT 'completed',
  payment_method VARCHAR(50),
  gateway_transaction_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quotations Management
CREATE TABLE quotations (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  client_id BIGINT REFERENCES users(id) NOT NULL,
  quotation_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  subtotal BIGINT NOT NULL DEFAULT 0,
  tax_amount BIGINT NOT NULL DEFAULT 0,
  discount_amount BIGINT NOT NULL DEFAULT 0,
  total_amount BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  valid_until DATE,
  terms_and_conditions TEXT,
  notes TEXT,
  created_by BIGINT REFERENCES users(id),
  sent_at TIMESTAMP,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Quotation Line Items
CREATE TABLE quotation_items (
  id BIGSERIAL PRIMARY KEY,
  quotation_id BIGINT REFERENCES quotations(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL, -- material, service, labor
  item_id BIGINT, -- references materials.id for materials
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  unit_price BIGINT NOT NULL,
  total_price BIGINT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices Management
CREATE TABLE invoices (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  quotation_id BIGINT REFERENCES quotations(id),
  client_id BIGINT REFERENCES users(id) NOT NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  subtotal BIGINT NOT NULL DEFAULT 0,
  tax_amount BIGINT NOT NULL DEFAULT 0,
  discount_amount BIGINT NOT NULL DEFAULT 0,
  total_amount BIGINT NOT NULL DEFAULT 0,
  paid_amount BIGINT NOT NULL DEFAULT 0,
  balance_amount BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled')),
  due_date DATE NOT NULL,
  payment_terms VARCHAR(100),
  notes TEXT,
  created_by BIGINT REFERENCES users(id),
  sent_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Invoice Line Items
CREATE TABLE invoice_items (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT REFERENCES invoices(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL, -- material, service, labor
  item_id BIGINT, -- references materials.id for materials
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  unit_price BIGINT NOT NULL,
  total_price BIGINT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Purchase Orders Management
CREATE TABLE purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  vendor_id BIGINT REFERENCES vendors(id) NOT NULL,
  po_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  subtotal BIGINT NOT NULL DEFAULT 0,
  tax_amount BIGINT NOT NULL DEFAULT 0,
  total_amount BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'partially_received', 'completed', 'cancelled')),
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  terms_and_conditions TEXT,
  notes TEXT,
  created_by BIGINT REFERENCES users(id),
  sent_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Purchase Order Line Items
CREATE TABLE purchase_order_items (
  id BIGSERIAL PRIMARY KEY,
  purchase_order_id BIGINT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_id BIGINT REFERENCES materials(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  unit_price BIGINT NOT NULL,
  total_price BIGINT NOT NULL,
  received_quantity DECIMAL(10,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tax Management
CREATE TABLE tax_rates (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  rate DECIMAL(5,2) NOT NULL,
  type VARCHAR(50) NOT NULL, -- gst, vat, service_tax
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================================================
-- EMPLOYEE & HR MANAGEMENT
-- =====================================================================================

-- Employee Profiles
CREATE TABLE employee_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  employee_id VARCHAR(20) UNIQUE NOT NULL,
  department VARCHAR(100),
  designation VARCHAR(100),
  reporting_manager_id BIGINT REFERENCES users(id),
  joining_date DATE NOT NULL,
  salary BIGINT,
  employment_type VARCHAR(50) DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')),
  work_location VARCHAR(100),
  skills TEXT[],
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  bank_account_number VARCHAR(50),
  bank_ifsc_code VARCHAR(20),
  pan_number VARCHAR(10),
  aadhar_number VARCHAR(12),
  is_active BOOLEAN DEFAULT TRUE,
  termination_date DATE,
  termination_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project Manager Profiles
CREATE TABLE project_manager_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  specializations TEXT[] DEFAULT '{}',
  max_projects INTEGER DEFAULT 10,
  experience_years INTEGER DEFAULT 0,
  certifications TEXT[] DEFAULT '{}',
  salary BIGINT,
  joining_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Designer Profiles
CREATE TABLE designer_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  experience_years INTEGER DEFAULT 0,
  specializations TEXT[],
  qualifications TEXT[],
  hourly_rate BIGINT,
  service_areas TEXT[],
  availability JSONB DEFAULT '{}',
  portfolio_images TEXT[],
  certifications TEXT[],
  bank_account_number VARCHAR(50),
  bank_ifsc_code VARCHAR(20),
  bank_account_holder VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  verification_documents TEXT[],
  rating DECIMAL(3,2) DEFAULT 0.0,
  total_projects INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Employee Attendance
CREATE TABLE employee_attendance (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  date DATE NOT NULL,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  total_hours DECIMAL(4,2),
  status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'leave', 'holiday')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Employee Leave Management
CREATE TABLE employee_leaves (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('casual', 'sick', 'earned', 'maternity', 'paternity', 'compensatory')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  applied_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Performance Reviews
CREATE TABLE performance_reviews (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES users(id),
  reviewer_id INTEGER NOT NULL REFERENCES users(id),
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  goals JSONB NOT NULL DEFAULT '[]',
  strengths TEXT[] NOT NULL DEFAULT '{}',
  areas_for_improvement TEXT[] NOT NULL DEFAULT '{}',
  manager_comments TEXT NOT NULL,
  employee_self_assessment TEXT,
  next_review_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Salary Adjustments
CREATE TABLE salary_adjustments (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES users(id),
  previous_salary DECIMAL(12,2) NOT NULL,
  new_salary DECIMAL(12,2) NOT NULL,
  adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('increment', 'decrement', 'bonus', 'deduction')),
  reason TEXT NOT NULL,
  effective_date DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  adjusted_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Payroll Management
CREATE TABLE payroll_batches (
  id SERIAL PRIMARY KEY,
  month VARCHAR(2) NOT NULL,
  year INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  processed_employees INTEGER NOT NULL DEFAULT 0,
  generated_by INTEGER NOT NULL REFERENCES users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(month, year)
);

CREATE TABLE payroll_records (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES payroll_batches(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES users(id),
  month VARCHAR(2) NOT NULL,
  year INTEGER NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  earned_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  pf_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
  esi_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  attendance_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  working_days INTEGER NOT NULL DEFAULT 0,
  present_days DECIMAL(4,1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(batch_id, employee_id)
);
