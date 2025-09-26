-- Migration: Create monitoring and alerting tables
-- Description: Tables for system monitoring, metrics collection, and alerting

-- System metrics table for storing performance data
CREATE TABLE system_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    cpu_usage DECIMAL(5,2) NOT NULL DEFAULT 0,
    memory_usage DECIMAL(5,2) NOT NULL DEFAULT 0,
    disk_usage DECIMAL(5,2) NOT NULL DEFAULT 0,
    active_connections INTEGER NOT NULL DEFAULT 0,
    requests_per_minute INTEGER NOT NULL DEFAULT 0,
    average_response_time DECIMAL(8,2) NOT NULL DEFAULT 0,
    error_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for efficient time-based queries
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX idx_system_metrics_created_at ON system_metrics(created_at);

-- Alert rules table for defining monitoring conditions
CREATE TABLE alert_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    metric VARCHAR(100) NOT NULL,
    operator VARCHAR(10) NOT NULL CHECK (operator IN ('gt', 'lt', 'eq', 'gte', 'lte')),
    threshold DECIMAL(10,2) NOT NULL,
    duration INTEGER NOT NULL DEFAULT 5, -- minutes
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    notification_channels TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for efficient rule lookups
CREATE INDEX idx_alert_rules_active ON alert_rules(is_active);
CREATE INDEX idx_alert_rules_metric ON alert_rules(metric);

-- Alerts table for storing triggered alerts
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    current_value DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'acknowledged')),
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by INTEGER REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for alert management
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_rule_id ON alerts(rule_id);
CREATE INDEX idx_alerts_triggered_at ON alerts(triggered_at);

-- Performance reviews table (extending employee management)
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

-- Indexes for performance reviews
CREATE INDEX idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);
CREATE INDEX idx_performance_reviews_period ON performance_reviews(review_period_end);

-- Salary adjustments table for tracking salary changes
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

-- Indexes for salary adjustments
CREATE INDEX idx_salary_adjustments_employee ON salary_adjustments(employee_id);
CREATE INDEX idx_salary_adjustments_effective_date ON salary_adjustments(effective_date);

-- Payroll batches table for managing payroll processing
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

-- Payroll records table for individual employee payroll
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

-- Indexes for payroll records
CREATE INDEX idx_payroll_records_batch ON payroll_records(batch_id);
CREATE INDEX idx_payroll_records_employee ON payroll_records(employee_id);
CREATE INDEX idx_payroll_records_period ON payroll_records(year, month);

-- Satisfaction surveys table for complaint feedback
CREATE TABLE satisfaction_surveys (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT NOT NULL,
    would_recommend BOOLEAN NOT NULL DEFAULT false,
    resolution_time VARCHAR(20) NOT NULL CHECK (resolution_time IN ('very_fast', 'fast', 'acceptable', 'slow', 'very_slow')),
    agent_rating INTEGER NOT NULL CHECK (agent_rating >= 1 AND agent_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(complaint_id)
);

-- Indexes for satisfaction surveys
CREATE INDEX idx_satisfaction_surveys_complaint ON satisfaction_surveys(complaint_id);
CREATE INDEX idx_satisfaction_surveys_rating ON satisfaction_surveys(rating);
CREATE INDEX idx_satisfaction_surveys_created_at ON satisfaction_surveys(created_at);

-- API request logs table for monitoring API usage
CREATE TABLE api_request_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER NOT NULL, -- milliseconds
    ip_address INET,
    user_agent TEXT,
    request_size INTEGER DEFAULT 0,
    response_size INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for API request logs
CREATE INDEX idx_api_request_logs_user ON api_request_logs(user_id);
CREATE INDEX idx_api_request_logs_endpoint ON api_request_logs(endpoint);
CREATE INDEX idx_api_request_logs_status ON api_request_logs(status_code);
CREATE INDEX idx_api_request_logs_created_at ON api_request_logs(created_at);

-- Business metrics cache table for performance
CREATE TABLE business_metrics_cache (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    date_period DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(metric_name, date_period, period_type)
);

-- Indexes for business metrics cache
CREATE INDEX idx_business_metrics_cache_name ON business_metrics_cache(metric_name);
CREATE INDEX idx_business_metrics_cache_period ON business_metrics_cache(date_period);

-- System configuration table for dynamic settings
CREATE TABLE system_configuration (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    is_sensitive BOOLEAN NOT NULL DEFAULT false,
    updated_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default system configurations
INSERT INTO system_configuration (config_key, config_value, description, updated_by) VALUES
('max_file_upload_size', '10485760', 'Maximum file upload size in bytes (10MB)', 1),
('session_timeout', '86400', 'Session timeout in seconds (24 hours)', 1),
('max_login_attempts', '5', 'Maximum login attempts before account lockout', 1),
('backup_retention_days', '30', 'Number of days to retain database backups', 1),
('email_notification_enabled', 'true', 'Enable email notifications', 1),
('sms_notification_enabled', 'false', 'Enable SMS notifications', 1),
('maintenance_mode', 'false', 'System maintenance mode flag', 1),
('api_rate_limit_per_minute', '100', 'API rate limit per user per minute', 1);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON performance_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payroll_batches_updated_at BEFORE UPDATE ON payroll_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_satisfaction_surveys_updated_at BEFORE UPDATE ON satisfaction_surveys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_metrics_cache_updated_at BEFORE UPDATE ON business_metrics_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_configuration_updated_at BEFORE UPDATE ON system_configuration FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common monitoring queries
CREATE VIEW active_alerts_summary AS
SELECT 
    ar.severity,
    COUNT(*) as alert_count,
    MIN(a.triggered_at) as oldest_alert,
    MAX(a.triggered_at) as newest_alert
FROM alerts a
JOIN alert_rules ar ON a.rule_id = ar.id
WHERE a.status = 'active'
GROUP BY ar.severity;

CREATE VIEW system_health_summary AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    AVG(cpu_usage) as avg_cpu,
    AVG(memory_usage) as avg_memory,
    AVG(disk_usage) as avg_disk,
    AVG(error_rate) as avg_error_rate,
    AVG(average_response_time) as avg_response_time
FROM system_metrics
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour;

-- Grant permissions to application user (assuming 'app_user' role exists)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
