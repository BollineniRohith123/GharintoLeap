-- Add missing tables for comprehensive functionality

-- Project Manager Profiles
CREATE TABLE IF NOT EXISTS project_manager_profiles (
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

-- Project Team Members
CREATE TABLE IF NOT EXISTS project_team_members (
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

-- Complaints System
CREATE TABLE IF NOT EXISTS complaints (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('service', 'product', 'billing', 'technical', 'delivery', 'quality', 'other')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_response', 'resolved', 'closed')),
  assigned_to BIGINT REFERENCES users(id),
  project_id BIGINT REFERENCES projects(id),
  order_id BIGINT,
  resolution TEXT,
  estimated_resolution_date DATE,
  actual_resolution_date DATE,
  attachments TEXT[],
  ticket_number VARCHAR(50) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Complaint Responses
CREATE TABLE IF NOT EXISTS complaint_responses (
  id BIGSERIAL PRIMARY KEY,
  complaint_id BIGINT REFERENCES complaints(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id),
  response_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  attachments TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Complaint Timeline
CREATE TABLE IF NOT EXISTS complaint_timeline (
  id BIGSERIAL PRIMARY KEY,
  complaint_id BIGINT REFERENCES complaints(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  performed_by BIGINT REFERENCES users(id),
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Employee Management
CREATE TABLE IF NOT EXISTS employee_profiles (
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

-- Employee Attendance
CREATE TABLE IF NOT EXISTS employee_attendance (
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
CREATE TABLE IF NOT EXISTS employee_leaves (
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

-- System Configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reports and Analytics
CREATE TABLE IF NOT EXISTS custom_reports (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  query_config TEXT NOT NULL, -- JSON configuration
  created_by BIGINT REFERENCES users(id),
  is_public BOOLEAN DEFAULT FALSE,
  scheduled BOOLEAN DEFAULT FALSE,
  schedule_config TEXT, -- JSON for scheduling
  last_run TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Lead Sources Management
CREATE TABLE IF NOT EXISTS lead_sources (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  cost_per_lead DECIMAL(10,2),
  conversion_rate DECIMAL(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);

CREATE INDEX IF NOT EXISTS idx_complaint_responses_complaint_id ON complaint_responses(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_timeline_complaint_id ON complaint_timeline(complaint_id);

CREATE INDEX IF NOT EXISTS idx_employee_profiles_user_id ON employee_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_employee_id ON employee_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_department ON employee_profiles(department);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_reporting_manager ON employee_profiles(reporting_manager_id);

CREATE INDEX IF NOT EXISTS idx_employee_attendance_user_id ON employee_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_attendance_date ON employee_attendance(date);

CREATE INDEX IF NOT EXISTS idx_employee_leaves_user_id ON employee_leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_leaves_status ON employee_leaves(status);
CREATE INDEX IF NOT EXISTS idx_employee_leaves_dates ON employee_leaves(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_project_team_members_project_id ON project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_user_id ON project_team_members(team_member_id);

-- Add foreign key constraints
ALTER TABLE project_manager_profiles ADD CONSTRAINT check_positive_experience CHECK (experience_years >= 0);
ALTER TABLE project_manager_profiles ADD CONSTRAINT check_positive_max_projects CHECK (max_projects > 0);

ALTER TABLE employee_profiles ADD CONSTRAINT check_joining_before_termination 
  CHECK (termination_date IS NULL OR termination_date >= joining_date);

ALTER TABLE employee_leaves ADD CONSTRAINT check_positive_days CHECK (days_count > 0);
ALTER TABLE employee_leaves ADD CONSTRAINT check_end_after_start CHECK (end_date >= start_date);

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
('company_name', 'Gharinto Interior Solutions', 'Company name for branding', 'general', true),
('company_email', 'info@gharinto.com', 'Primary company email', 'general', true),
('company_phone', '+91-9876543210', 'Primary company phone', 'general', true),
('company_address', 'Mumbai, Maharashtra, India', 'Company address', 'general', true),
('support_email', 'support@gharinto.com', 'Support email address', 'support', true),
('max_file_upload_size', '10485760', 'Maximum file upload size in bytes (10MB)', 'files', false),
('allowed_file_types', 'jpg,jpeg,png,pdf,doc,docx,xls,xlsx', 'Allowed file extensions', 'files', false),
('default_currency', 'INR', 'Default currency code', 'finance', true),
('tax_rate', '18', 'Default GST rate percentage', 'finance', false),
('lead_auto_assignment', 'true', 'Enable automatic lead assignment', 'leads', false),
('project_completion_bonus', '5000', 'Bonus amount for on-time project completion', 'projects', false)
ON CONFLICT (key) DO NOTHING;

-- Insert default lead sources
INSERT INTO lead_sources (name, description, cost_per_lead, conversion_rate, is_active) VALUES
('Website Form', 'Direct inquiries from website contact form', 50.00, 15.5, true),
('Google Ads', 'Paid Google advertising campaigns', 150.00, 12.8, true),
('Facebook Ads', 'Facebook and Instagram advertising', 120.00, 10.2, true),
('Referral', 'Customer referrals and word-of-mouth', 0.00, 35.6, true),
('Trade Shows', 'Home and design trade show exhibitions', 300.00, 8.9, true),
('Cold Calls', 'Outbound telemarketing campaigns', 80.00, 5.2, true),
('Email Campaigns', 'Email marketing campaigns', 25.00, 7.1, true),
('Social Media', 'Organic social media posts and engagement', 30.00, 6.8, true),
('Print Media', 'Newspaper and magazine advertisements', 200.00, 4.5, true),
('Partner Network', 'Real estate and construction partnerships', 100.00, 18.3, true)
ON CONFLICT (name) DO NOTHING;