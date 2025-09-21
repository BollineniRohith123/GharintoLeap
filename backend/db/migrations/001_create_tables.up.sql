-- Users and Authentication
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roles and Permissions
CREATE TABLE roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role_permissions (
  id BIGSERIAL PRIMARY KEY,
  role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id BIGINT REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

CREATE TABLE user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- Menu Configuration
CREATE TABLE menu_items (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  route VARCHAR(200),
  parent_id BIGINT REFERENCES menu_items(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role_menu_items (
  id BIGSERIAL PRIMARY KEY,
  role_id BIGINT REFERENCES roles(id) ON DELETE CASCADE,
  menu_item_id BIGINT REFERENCES menu_items(id) ON DELETE CASCADE,
  UNIQUE(role_id, menu_item_id)
);

-- Cities and Locations
CREATE TABLE cities (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles by Role
CREATE TABLE homeowner_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  city_id BIGINT REFERENCES cities(id),
  address TEXT,
  budget_range VARCHAR(50),
  project_timeline VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE designer_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  city_id BIGINT REFERENCES cities(id),
  business_name VARCHAR(200),
  experience_years INTEGER,
  specializations TEXT[],
  portfolio_url TEXT,
  rating DOUBLE PRECISION DEFAULT 0,
  total_projects INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  city_id BIGINT REFERENCES cities(id),
  company_name VARCHAR(200) NOT NULL,
  company_type VARCHAR(100),
  services TEXT[],
  gst_number VARCHAR(50),
  pan_number VARCHAR(20),
  rating DOUBLE PRECISION DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE manager_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  city_id BIGINT REFERENCES cities(id),
  department VARCHAR(100),
  reporting_to BIGINT REFERENCES users(id),
  access_cities BIGINT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  homeowner_id BIGINT REFERENCES homeowner_profiles(id),
  designer_id BIGINT REFERENCES designer_profiles(id),
  project_manager_id BIGINT REFERENCES manager_profiles(id),
  city_id BIGINT REFERENCES cities(id),
  project_type VARCHAR(100),
  budget DOUBLE PRECISION,
  estimated_cost DOUBLE PRECISION,
  actual_cost DOUBLE PRECISION,
  start_date DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  status VARCHAR(50) DEFAULT 'planning',
  priority VARCHAR(20) DEFAULT 'medium',
  progress_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Tasks and Timeline
CREATE TABLE project_tasks (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_to BIGINT REFERENCES users(id),
  start_date DATE,
  end_date DATE,
  dependencies BIGINT[],
  status VARCHAR(50) DEFAULT 'pending',
  progress_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads Management
CREATE TABLE leads (
  id BIGSERIAL PRIMARY KEY,
  source VARCHAR(100),
  lead_type VARCHAR(50),
  customer_name VARCHAR(200) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  city_id BIGINT REFERENCES cities(id),
  project_type VARCHAR(100),
  budget_range VARCHAR(50),
  description TEXT,
  status VARCHAR(50) DEFAULT 'new',
  assigned_to BIGINT REFERENCES users(id),
  score INTEGER DEFAULT 0,
  converted_project_id BIGINT REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM Integration
CREATE TABLE crm_contacts (
  id BIGSERIAL PRIMARY KEY,
  leadpro_id VARCHAR(100),
  perfex_id VARCHAR(100),
  user_id BIGINT REFERENCES users(id),
  lead_id BIGINT REFERENCES leads(id),
  contact_data JSONB,
  last_sync TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Digital Wallets
CREATE TABLE wallets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance DOUBLE PRECISION DEFAULT 0,
  blocked_amount DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
  id BIGSERIAL PRIMARY KEY,
  wallet_id BIGINT REFERENCES wallets(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  description TEXT,
  reference_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Processing
CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id),
  payer_id BIGINT REFERENCES users(id),
  payee_id BIGINT REFERENCES users(id),
  amount DOUBLE PRECISION NOT NULL,
  payment_method VARCHAR(50),
  gateway_transaction_id VARCHAR(200),
  status VARCHAR(50) DEFAULT 'pending',
  gateway_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication
CREATE TABLE conversations (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id),
  participants BIGINT[] NOT NULL,
  title VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id BIGINT REFERENCES users(id),
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  attachments TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File Management
CREATE TABLE project_files (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by BIGINT REFERENCES users(id),
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  file_type VARCHAR(100),
  file_url TEXT NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory
CREATE TABLE inventory_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  parent_id BIGINT REFERENCES inventory_categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_items (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT REFERENCES vendor_profiles(id),
  category_id BIGINT REFERENCES inventory_categories(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DOUBLE PRECISION,
  quantity INTEGER DEFAULT 0,
  unit VARCHAR(50),
  images TEXT[],
  specifications JSONB,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Testimonials
CREATE TABLE testimonials (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id),
  customer_name VARCHAR(200) NOT NULL,
  customer_image TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio
CREATE TABLE portfolio_items (
  id BIGSERIAL PRIMARY KEY,
  designer_id BIGINT REFERENCES designer_profiles(id),
  project_id BIGINT REFERENCES projects(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  images TEXT[] NOT NULL,
  project_type VARCHAR(100),
  completion_date DATE,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  reference_id BIGINT,
  reference_type VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Tracking
CREATE TABLE analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  user_id BIGINT REFERENCES users(id),
  project_id BIGINT REFERENCES projects(id),
  city_id BIGINT REFERENCES cities(id),
  properties JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_city ON projects(city_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
