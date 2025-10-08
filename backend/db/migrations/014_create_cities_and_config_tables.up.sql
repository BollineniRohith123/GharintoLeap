-- =====================================================================================
-- CRITICAL FEATURE 1: CITY MANAGEMENT SYSTEM
-- =====================================================================================

-- Cities Master Table
CREATE TABLE IF NOT EXISTS cities (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  state VARCHAR(100) NOT NULL,
  state_code VARCHAR(10),
  country VARCHAR(100) DEFAULT 'India',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  is_active BOOLEAN DEFAULT TRUE,
  is_operational BOOLEAN DEFAULT FALSE,
  launch_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- City Regional Settings
CREATE TABLE IF NOT EXISTS city_settings (
  id BIGSERIAL PRIMARY KEY,
  city_id BIGINT REFERENCES cities(id) ON DELETE CASCADE UNIQUE,
  currency VARCHAR(10) DEFAULT 'INR',
  currency_symbol VARCHAR(5) DEFAULT '₹',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  time_format VARCHAR(20) DEFAULT '12h',
  language VARCHAR(10) DEFAULT 'en',
  gst_rate DECIMAL(5,2) DEFAULT 18.00,
  cgst_rate DECIMAL(5,2) DEFAULT 9.00,
  sgst_rate DECIMAL(5,2) DEFAULT 9.00,
  igst_rate DECIMAL(5,2) DEFAULT 18.00,
  tds_rate DECIMAL(5,2) DEFAULT 1.00,
  service_charge_rate DECIMAL(5,2) DEFAULT 0.00,
  min_project_value BIGINT DEFAULT 50000,
  max_project_value BIGINT DEFAULT 10000000,
  default_lead_assignment_mode VARCHAR(20) DEFAULT 'auto',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================================================
-- CRITICAL FEATURE 2: COMMISSION CONFIGURATION SYSTEM
-- =====================================================================================

-- Commission Configuration Table
CREATE TABLE IF NOT EXISTS commission_config (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role_name VARCHAR(50) NOT NULL,
  tier VARCHAR(50) DEFAULT 'standard',
  service_type VARCHAR(100),
  city_id BIGINT REFERENCES cities(id),
  commission_type VARCHAR(20) DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed', 'tiered')),
  commission_value DECIMAL(10,2) NOT NULL,
  min_amount BIGINT DEFAULT 0,
  max_amount BIGINT,
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_name, tier, service_type, city_id, effective_from)
);

-- Commission History Table (Audit Trail)
CREATE TABLE IF NOT EXISTS commission_history (
  id BIGSERIAL PRIMARY KEY,
  commission_config_id BIGINT REFERENCES commission_config(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'activated', 'deactivated')),
  old_value JSONB,
  new_value JSONB,
  changed_by BIGINT REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  reason TEXT
);

-- =====================================================================================
-- CRITICAL FEATURE 4: ASSIGNMENT ALGORITHMS CONFIGURATION
-- =====================================================================================

-- Assignment Rules Configuration
CREATE TABLE IF NOT EXISTS assignment_rules (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('lead_assignment', 'project_assignment', 'vendor_assignment')),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  config JSONB NOT NULL,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Assignment Algorithm Settings
CREATE TABLE IF NOT EXISTS assignment_algorithm_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  is_active BOOLEAN DEFAULT TRUE,
  updated_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================================

-- Cities indexes
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_state ON cities(state);
CREATE INDEX IF NOT EXISTS idx_cities_is_active ON cities(is_active);
CREATE INDEX IF NOT EXISTS idx_cities_is_operational ON cities(is_operational);

-- Commission config indexes
CREATE INDEX IF NOT EXISTS idx_commission_config_role ON commission_config(role_name);
CREATE INDEX IF NOT EXISTS idx_commission_config_tier ON commission_config(tier);
CREATE INDEX IF NOT EXISTS idx_commission_config_city ON commission_config(city_id);
CREATE INDEX IF NOT EXISTS idx_commission_config_active ON commission_config(is_active);
CREATE INDEX IF NOT EXISTS idx_commission_config_dates ON commission_config(effective_from, effective_to);

-- Commission history indexes
CREATE INDEX IF NOT EXISTS idx_commission_history_config ON commission_history(commission_config_id);
CREATE INDEX IF NOT EXISTS idx_commission_history_changed_at ON commission_history(changed_at);

-- Assignment rules indexes
CREATE INDEX IF NOT EXISTS idx_assignment_rules_type ON assignment_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_priority ON assignment_rules(priority);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_active ON assignment_rules(is_active);

-- =====================================================================================
-- SEED DATA FOR INITIAL CITIES
-- =====================================================================================

-- Insert major Indian cities
INSERT INTO cities (name, display_name, state, state_code, is_active, is_operational, launch_date) VALUES
('mumbai', 'Mumbai', 'Maharashtra', 'MH', true, true, '2025-01-01'),
('delhi', 'Delhi', 'Delhi', 'DL', true, true, '2025-01-01'),
('bangalore', 'Bangalore', 'Karnataka', 'KA', true, true, '2025-01-01'),
('hyderabad', 'Hyderabad', 'Telangana', 'TG', true, true, '2025-01-01'),
('chennai', 'Chennai', 'Tamil Nadu', 'TN', true, true, '2025-01-01'),
('pune', 'Pune', 'Maharashtra', 'MH', true, true, '2025-02-01'),
('kolkata', 'Kolkata', 'West Bengal', 'WB', true, false, NULL),
('ahmedabad', 'Ahmedabad', 'Gujarat', 'GJ', true, false, NULL),
('jaipur', 'Jaipur', 'Rajasthan', 'RJ', true, false, NULL),
('lucknow', 'Lucknow', 'Uttar Pradesh', 'UP', true, false, NULL)
ON CONFLICT (name) DO NOTHING;

-- Insert default city settings for operational cities
INSERT INTO city_settings (city_id, gst_rate, cgst_rate, sgst_rate, igst_rate, tds_rate)
SELECT id, 18.00, 9.00, 9.00, 18.00, 1.00
FROM cities
WHERE is_operational = true
ON CONFLICT (city_id) DO NOTHING;

-- =====================================================================================
-- SEED DATA FOR DEFAULT COMMISSION CONFIGURATION
-- =====================================================================================

-- Default commission rates for designers
INSERT INTO commission_config (name, role_name, tier, commission_type, commission_value, effective_from, is_active) VALUES
('Designer Standard Commission', 'interior_designer', 'standard', 'percentage', 15.00, '2025-01-01', true),
('Designer Gold Commission', 'interior_designer', 'gold', 'percentage', 18.00, '2025-01-01', true),
('Designer Platinum Commission', 'interior_designer', 'platinum', 'percentage', 20.00, '2025-01-01', true),
('PM Standard Commission', 'project_manager', 'standard', 'percentage', 10.00, '2025-01-01', true),
('PM Senior Commission', 'project_manager', 'senior', 'percentage', 12.00, '2025-01-01', true),
('Vendor Standard Commission', 'vendor', 'standard', 'percentage', 5.00, '2025-01-01', true),
('Platform Fee', 'platform', 'standard', 'percentage', 5.00, '2025-01-01', true)
ON CONFLICT (role_name, tier, service_type, city_id, effective_from) DO NOTHING;

-- =====================================================================================
-- SEED DATA FOR DEFAULT ASSIGNMENT RULES
-- =====================================================================================

-- Default lead assignment algorithm settings
INSERT INTO assignment_algorithm_settings (setting_key, setting_value, description, category) VALUES
('lead_assignment_mode', '{"mode": "auto", "fallback": "manual"}', 'Primary lead assignment mode', 'lead_assignment'),
('load_balancing_enabled', '{"enabled": true, "max_leads_per_designer": 10}', 'Enable load balancing for lead distribution', 'lead_assignment'),
('location_matching_weight', '{"weight": 0.4}', 'Weight for location matching in assignment algorithm', 'lead_assignment'),
('expertise_matching_weight', '{"weight": 0.3}', 'Weight for expertise matching in assignment algorithm', 'lead_assignment'),
('performance_matching_weight', '{"weight": 0.2}', 'Weight for performance history in assignment algorithm', 'lead_assignment'),
('availability_matching_weight', '{"weight": 0.1}', 'Weight for designer availability in assignment algorithm', 'lead_assignment'),
('priority_lead_threshold', '{"score": 80}', 'Minimum score for priority lead handling', 'lead_assignment'),
('auto_assignment_timeout', '{"timeout_hours": 24}', 'Timeout for auto-assignment before manual intervention', 'lead_assignment')
ON CONFLICT (setting_key) DO NOTHING;

-- Default assignment rules
INSERT INTO assignment_rules (name, description, rule_type, priority, config) VALUES
('City-based Lead Assignment', 'Assign leads to designers in the same city', 'lead_assignment', 1, 
 '{"criteria": "city_match", "strict": true, "fallback": "nearest_city"}'),
('Expertise-based Assignment', 'Match lead requirements with designer expertise', 'lead_assignment', 2,
 '{"criteria": "expertise_match", "min_match_score": 70}'),
('Load Balancing Rule', 'Distribute leads evenly among available designers', 'lead_assignment', 3,
 '{"criteria": "load_balance", "max_active_leads": 10, "consider_capacity": true}'),
('Performance-based Priority', 'Prioritize high-performing designers for premium leads', 'lead_assignment', 4,
 '{"criteria": "performance_score", "min_score": 4.0, "lead_value_threshold": 500000}')
ON CONFLICT (name) DO NOTHING;

