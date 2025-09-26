-- Migration: Add missing business-critical tables
-- Description: Tables for quotations, invoices, purchase orders, testimonials, portfolios, and other business entities

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

-- Testimonials Management
CREATE TABLE testimonials (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT REFERENCES users(id),
  project_id BIGINT REFERENCES projects(id),
  client_name VARCHAR(200) NOT NULL,
  client_designation VARCHAR(100),
  client_company VARCHAR(200),
  testimonial_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_featured BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMP,
  display_order INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Portfolio Management
CREATE TABLE portfolios (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  project_id BIGINT REFERENCES projects(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  tags TEXT[],
  is_featured BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Portfolio Images
CREATE TABLE portfolio_images (
  id BIGSERIAL PRIMARY KEY,
  portfolio_id BIGINT REFERENCES portfolios(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- KYC Verification
CREATE TABLE kyc_documents (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('aadhar', 'pan', 'gst', 'bank_statement', 'address_proof', 'business_license')),
  document_number VARCHAR(100),
  document_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  verified_by BIGINT REFERENCES users(id),
  verified_at TIMESTAMP,
  rejection_reason TEXT,
  expiry_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Password Reset Tokens
CREATE TABLE password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
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

-- Email Templates
CREATE TABLE email_templates (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  subject VARCHAR(200) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables TEXT[], -- Array of variable names like {user_name}, {project_title}
  category VARCHAR(50) DEFAULT 'general',
  is_active BOOLEAN DEFAULT TRUE,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Rate Limiting
CREATE TABLE rate_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  ip_address INET,
  endpoint VARCHAR(200) NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_quotations_client_id ON quotations(client_id);
CREATE INDEX idx_quotations_project_id ON quotations(project_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_number ON quotations(quotation_number);

CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

CREATE INDEX idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_project_id ON purchase_orders(project_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_number ON purchase_orders(po_number);

CREATE INDEX idx_testimonials_client_id ON testimonials(client_id);
CREATE INDEX idx_testimonials_is_featured ON testimonials(is_featured);
CREATE INDEX idx_testimonials_is_approved ON testimonials(is_approved);

CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolios_category ON portfolios(category);
CREATE INDEX idx_portfolios_is_featured ON portfolios(is_featured);

CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX idx_kyc_documents_status ON kyc_documents(status);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

CREATE INDEX idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_assigned_to ON project_tasks(assigned_to);
CREATE INDEX idx_project_tasks_status ON project_tasks(status);
CREATE INDEX idx_project_tasks_due_date ON project_tasks(due_date);

CREATE INDEX idx_change_orders_project_id ON change_orders(project_id);
CREATE INDEX idx_change_orders_status ON change_orders(status);
CREATE INDEX idx_change_orders_number ON change_orders(change_order_number);

CREATE INDEX idx_email_templates_name ON email_templates(name);
CREATE INDEX idx_email_templates_category ON email_templates(category);

CREATE INDEX idx_rate_limits_user_id ON rate_limits(user_id);
CREATE INDEX idx_rate_limits_ip_address ON rate_limits(ip_address);
CREATE INDEX idx_rate_limits_endpoint ON rate_limits(endpoint);
CREATE INDEX idx_rate_limits_window_start ON rate_limits(window_start);

-- Add constraints
ALTER TABLE quotations ADD CONSTRAINT check_quotation_positive_amounts 
  CHECK (subtotal >= 0 AND tax_amount >= 0 AND discount_amount >= 0 AND total_amount >= 0);

ALTER TABLE invoices ADD CONSTRAINT check_invoice_positive_amounts 
  CHECK (subtotal >= 0 AND tax_amount >= 0 AND discount_amount >= 0 AND total_amount >= 0 AND paid_amount >= 0 AND balance_amount >= 0);

ALTER TABLE purchase_orders ADD CONSTRAINT check_po_positive_amounts 
  CHECK (subtotal >= 0 AND tax_amount >= 0 AND total_amount >= 0);

ALTER TABLE tax_rates ADD CONSTRAINT check_tax_rate_positive CHECK (rate >= 0);

ALTER TABLE project_tasks ADD CONSTRAINT check_task_positive_hours 
  CHECK (estimated_hours IS NULL OR estimated_hours >= 0) AND (actual_hours IS NULL OR actual_hours >= 0);

-- Insert default tax rates
INSERT INTO tax_rates (name, rate, type, effective_from) VALUES
('GST 18%', 18.00, 'gst', '2017-07-01'),
('GST 12%', 12.00, 'gst', '2017-07-01'),
('GST 5%', 5.00, 'gst', '2017-07-01'),
('GST 28%', 28.00, 'gst', '2017-07-01')
ON CONFLICT DO NOTHING;

-- Insert default email templates
INSERT INTO email_templates (name, subject, body_html, body_text, variables, category) VALUES
('welcome_email', 'Welcome to Gharinto!', 
 '<h1>Welcome {user_name}!</h1><p>Thank you for joining Gharinto Interior Solutions.</p>', 
 'Welcome {user_name}! Thank you for joining Gharinto Interior Solutions.', 
 ARRAY['user_name'], 'onboarding'),
('quotation_sent', 'Quotation #{quotation_number} - {project_title}', 
 '<h1>Quotation Ready</h1><p>Dear {client_name}, your quotation for {project_title} is ready.</p>', 
 'Dear {client_name}, your quotation for {project_title} is ready.', 
 ARRAY['client_name', 'project_title', 'quotation_number'], 'finance'),
('invoice_sent', 'Invoice #{invoice_number} - {project_title}', 
 '<h1>Invoice</h1><p>Dear {client_name}, please find your invoice for {project_title}.</p>', 
 'Dear {client_name}, please find your invoice for {project_title}.', 
 ARRAY['client_name', 'project_title', 'invoice_number'], 'finance'),
('password_reset', 'Reset Your Password', 
 '<h1>Password Reset</h1><p>Click <a href="{reset_link}">here</a> to reset your password.</p>', 
 'Click this link to reset your password: {reset_link}', 
 ARRAY['user_name', 'reset_link'], 'auth')
ON CONFLICT (name) DO NOTHING;
