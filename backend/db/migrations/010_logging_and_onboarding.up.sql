-- Enhanced logging and monitoring tables
CREATE TABLE IF NOT EXISTS system_logs (
  id BIGSERIAL PRIMARY KEY,
  level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
  service VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  user_id BIGINT REFERENCES users(id),
  session_id VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  error_stack TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  request_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT
);

-- System alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('system_error', 'business_critical', 'security_breach', 'performance_degradation', 'user_action', 'payment_failure', 'data_inconsistency')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  affected_user_id BIGINT REFERENCES users(id),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by BIGINT REFERENCES users(id),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enhanced user onboarding system
CREATE TABLE IF NOT EXISTS user_onboarding (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  user_type VARCHAR(50) NOT NULL,
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Onboarding step completion tracking
CREATE TABLE IF NOT EXISTS user_onboarding_steps (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_data JSONB DEFAULT '{}',
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, step_number)
);

-- Customer preferences and requirements
CREATE TABLE IF NOT EXISTS customer_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  budget_min BIGINT,
  budget_max BIGINT,
  design_styles TEXT[],
  project_types TEXT[],
  timeline VARCHAR(50),
  preferred_designers TEXT[],
  special_requirements TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Designer professional profiles
CREATE TABLE IF NOT EXISTS designer_profiles (
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

-- Real-time connection tracking
CREATE TABLE IF NOT EXISTS realtime_connections (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,
  connection_id VARCHAR(100) NOT NULL,
  room_id VARCHAR(100),
  connected_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET,
  is_active BOOLEAN DEFAULT TRUE
);

-- Performance monitoring
CREATE TABLE IF NOT EXISTS performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  metric_unit VARCHAR(20),
  service VARCHAR(100),
  endpoint VARCHAR(200),
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Business analytics tracking
CREATE TABLE IF NOT EXISTS business_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL,
  user_id BIGINT REFERENCES users(id),
  entity_type VARCHAR(50),
  entity_id BIGINT,
  properties JSONB DEFAULT '{}',
  revenue_impact BIGINT DEFAULT 0,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Enhanced notifications with real-time support
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent_via TEXT[] DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed'));
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP;

-- User preferences enhancements
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS realtime_updates BOOLEAN DEFAULT TRUE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS device_tokens TEXT[] DEFAULT '{}';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notification_schedule JSONB DEFAULT '{}';

-- Users table enhancements for better onboarding
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by BIGINT REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_consent_given BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verification_token VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_service ON system_logs(service);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_logs_request_id ON system_logs(request_id);

CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_system_alerts_timestamp ON system_alerts(timestamp);

CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_type ON user_onboarding(user_type);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_completed ON user_onboarding(is_completed);

CREATE INDEX IF NOT EXISTS idx_onboarding_steps_user_id ON user_onboarding_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_step_number ON user_onboarding_steps(step_number);

CREATE INDEX IF NOT EXISTS idx_customer_preferences_user_id ON customer_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_preferences_budget ON customer_preferences(budget_min, budget_max);

CREATE INDEX IF NOT EXISTS idx_designer_profiles_user_id ON designer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_designer_profiles_verified ON designer_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_designer_profiles_rating ON designer_profiles(rating);

CREATE INDEX IF NOT EXISTS idx_realtime_connections_user_id ON realtime_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_realtime_connections_active ON realtime_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_realtime_connections_room ON realtime_connections(room_id);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_service ON performance_metrics(service);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_business_events_type ON business_events(event_type);
CREATE INDEX IF NOT EXISTS idx_business_events_user_id ON business_events(user_id);
CREATE INDEX IF NOT EXISTS idx_business_events_timestamp ON business_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_delivery_status ON notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified);

-- Add triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
DROP TRIGGER IF EXISTS update_user_onboarding_updated_at ON user_onboarding;
CREATE TRIGGER update_user_onboarding_updated_at 
    BEFORE UPDATE ON user_onboarding 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_preferences_updated_at ON customer_preferences;
CREATE TRIGGER update_customer_preferences_updated_at 
    BEFORE UPDATE ON customer_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_designer_profiles_updated_at ON designer_profiles;
CREATE TRIGGER update_designer_profiles_updated_at 
    BEFORE UPDATE ON designer_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample system settings for logging and monitoring
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
('log_retention_days', '90', 'Number of days to retain system logs', 'logging', false),
('alert_retention_days', '365', 'Number of days to retain system alerts', 'monitoring', false),
('performance_monitoring_enabled', 'true', 'Enable performance monitoring', 'monitoring', false),
('realtime_connection_timeout', '300', 'Timeout for inactive real-time connections (seconds)', 'realtime', false),
('max_realtime_connections_per_user', '5', 'Maximum real-time connections per user', 'realtime', false),
('onboarding_welcome_credit', '1000', 'Welcome credit amount for new users (in paise)', 'onboarding', false),
('referral_bonus_amount', '500', 'Referral bonus amount (in paise)', 'referral', false),
('signup_bonus_amount', '200', 'Signup bonus for referred users (in paise)', 'referral', false),
('onboarding_completion_bonus', '300', 'Bonus for completing onboarding (in paise)', 'onboarding', false),
('critical_alert_email_enabled', 'true', 'Send email alerts for critical issues', 'alerts', false),
('business_analytics_enabled', 'true', 'Enable business analytics tracking', 'analytics', false)
ON CONFLICT (key) DO NOTHING;

-- Create materialized view for quick analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS user_analytics_summary AS
SELECT 
    u.id,
    u.email,
    u.created_at as registration_date,
    uo.is_completed as onboarding_completed,
    uo.completed_at as onboarding_completed_at,
    w.balance as wallet_balance,
    w.total_spent,
    COUNT(p.id) as total_projects,
    COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_projects,
    MAX(al.created_at) as last_activity,
    array_agg(DISTINCT r.name) as user_roles
FROM users u
LEFT JOIN user_onboarding uo ON u.id = uo.user_id
LEFT JOIN wallets w ON u.id = w.user_id
LEFT JOIN projects p ON u.id = p.client_id OR u.id = p.designer_id OR u.id = p.project_manager_id
LEFT JOIN analytics_events al ON u.id = al.user_id
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.is_active = true
GROUP BY u.id, u.email, u.created_at, uo.is_completed, uo.completed_at, w.balance, w.total_spent;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_analytics_summary_id ON user_analytics_summary(id);

-- Function to refresh analytics summary
CREATE OR REPLACE FUNCTION refresh_user_analytics_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_analytics_summary;
END;
$$ LANGUAGE plpgsql;