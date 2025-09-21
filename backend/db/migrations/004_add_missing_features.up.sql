-- Add conversation read status tracking
CREATE TABLE message_read_status (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT REFERENCES messages(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Add file management system
CREATE TABLE file_uploads (
  id TEXT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50), -- project, lead, message, profile
  entity_id BIGINT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add audit logging
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id BIGINT,
  old_values TEXT, -- JSON
  new_values TEXT, -- JSON
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add project workflow system
CREATE TABLE project_workflows (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  assigned_to BIGINT REFERENCES users(id),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add material categories for better organization
CREATE TABLE material_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  parent_id BIGINT REFERENCES material_categories(id),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add vendor ratings and reviews
CREATE TABLE vendor_reviews (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT REFERENCES vendors(id) ON DELETE CASCADE,
  project_id BIGINT REFERENCES projects(id),
  reviewer_id BIGINT REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add payment tracking
CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id),
  amount BIGINT NOT NULL,
  payment_type VARCHAR(50) NOT NULL, -- advance, milestone, final
  status VARCHAR(20) DEFAULT 'pending',
  due_date DATE,
  paid_date DATE,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add notification templates
CREATE TABLE notification_templates (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[], -- Array of variable names
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add user preferences
CREATE TABLE user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add search optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_users_search ON users USING gin((first_name || ' ' || last_name) gin_trgm_ops);
CREATE INDEX idx_projects_search ON projects USING gin(title gin_trgm_ops);
CREATE INDEX idx_materials_search ON materials USING gin(name gin_trgm_ops);

-- Add missing indexes for performance
CREATE INDEX idx_message_read_status_message_id ON message_read_status(message_id);
CREATE INDEX idx_message_read_status_user_id ON message_read_status(user_id);
CREATE INDEX idx_file_uploads_entity ON file_uploads(entity_type, entity_id);
CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_project_workflows_project_id ON project_workflows(project_id);
CREATE INDEX idx_vendor_reviews_vendor_id ON vendor_reviews(vendor_id);
CREATE INDEX idx_payments_project_id ON payments(project_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Add foreign key constraints that were missing
-- Note: The converted_to_project should reference projects.id, not the other way around
-- This constraint is already handled by the existing schema

-- Add additional constraints for data integrity
ALTER TABLE transactions ADD CONSTRAINT check_positive_amount CHECK (amount > 0);
ALTER TABLE payments ADD CONSTRAINT check_positive_payment_amount CHECK (amount > 0);
ALTER TABLE wallets ADD CONSTRAINT check_non_negative_balance CHECK (balance >= 0);