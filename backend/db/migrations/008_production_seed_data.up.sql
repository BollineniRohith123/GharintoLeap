-- Production Database Setup for Gharinto Leap Interior Design Platform
-- This file sets up a complete production-ready database with all necessary data

-- =============================================================================
-- COMPREHENSIVE SEED DATA FOR PRODUCTION
-- =============================================================================

-- Additional Material Categories for Better Organization
INSERT INTO material_categories (name, parent_id, description, sort_order, is_active) VALUES
-- Main Categories
('Flooring', NULL, 'All types of flooring materials', 1, true),
('Wall Finishes', NULL, 'Wall paints, wallpapers, and finishes', 2, true),
('Lighting', NULL, 'All lighting fixtures and solutions', 3, true),
('Furniture', NULL, 'All furniture items', 4, true),
('Kitchen & Bath', NULL, 'Kitchen and bathroom fixtures', 5, true),
('Hardware', NULL, 'Door handles, hinges, and hardware', 6, true),
('Textiles', NULL, 'Curtains, rugs, and fabrics', 7, true),
('Accessories', NULL, 'Decorative items and accessories', 8, true);

-- Flooring Sub-categories
INSERT INTO material_categories (name, parent_id, description, sort_order, is_active) 
SELECT 'Tiles', id, 'Ceramic, porcelain, and stone tiles', 1, true FROM material_categories WHERE name = 'Flooring';

INSERT INTO material_categories (name, parent_id, description, sort_order, is_active) 
SELECT 'Wooden Flooring', id, 'Hardwood, laminate, and engineered wood', 2, true FROM material_categories WHERE name = 'Flooring';

INSERT INTO material_categories (name, parent_id, description, sort_order, is_active) 
SELECT 'Vinyl & PVC', id, 'Vinyl and PVC flooring options', 3, true FROM material_categories WHERE name = 'Flooring';

-- Lighting Sub-categories
INSERT INTO material_categories (name, parent_id, description, sort_order, is_active) 
SELECT 'Ceiling Lights', id, 'Chandeliers, pendant lights, ceiling fans', 1, true FROM material_categories WHERE name = 'Lighting';

INSERT INTO material_categories (name, parent_id, description, sort_order, is_active) 
SELECT 'Wall Lights', id, 'Sconces, wall lamps', 2, true FROM material_categories WHERE name = 'Lighting';

INSERT INTO material_categories (name, parent_id, description, sort_order, is_active) 
SELECT 'Table & Floor Lamps', id, 'Portable lighting solutions', 3, true FROM material_categories WHERE name = 'Lighting';

-- Sample Vendor Data for Production
INSERT INTO vendors (user_id, company_name, business_type, gst_number, pan_number, address, city, state, pincode, is_verified, rating, total_orders) VALUES
(NULL, 'Delhi Tiles & Marbles', 'Flooring Supplier', '07AABCU9603R1ZN', 'AABCU9603R', '123 Karol Bagh, New Delhi', 'Delhi', 'Delhi', '110005', true, 4.5, 150),
(NULL, 'Mumbai Furniture House', 'Furniture Manufacturer', '27AABCU9603R1ZO', 'AABCU9603S', '456 Andheri East, Mumbai', 'Mumbai', 'Maharashtra', '400069', true, 4.2, 89),
(NULL, 'Bangalore Lighting Solutions', 'Lighting Specialist', '29AABCU9603R1ZP', 'AABCU9603T', '789 Electronic City, Bangalore', 'Bangalore', 'Karnataka', '560100', true, 4.7, 234),
(NULL, 'Chennai Hardware Stores', 'Hardware Supplier', '33AABCU9603R1ZQ', 'AABCU9603U', '321 T. Nagar, Chennai', 'Chennai', 'Tamil Nadu', '600017', true, 4.1, 67),
(NULL, 'Hyderabad Paint World', 'Paint & Finishes', '36AABCU9603R1ZR', 'AABCU9603V', '654 Banjara Hills, Hyderabad', 'Hyderabad', 'Telangana', '500034', true, 4.3, 112);

-- Sample Materials Catalog
INSERT INTO materials (vendor_id, name, category, subcategory, brand, model, description, unit, price, discounted_price, stock_quantity, min_order_quantity, lead_time_days, specifications) VALUES
-- Flooring Materials
(1, 'Premium Ceramic Floor Tiles', 'Flooring', 'Tiles', 'Kajaria', 'KAJ-001', '600x600mm vitrified tiles with marble finish', 'sqft', 12500, 11200, 5000, 100, 7, '{"size": "600x600mm", "finish": "glossy", "thickness": "10mm"}'),
(1, 'Italian Marble Flooring', 'Flooring', 'Stone', 'Rajasthan Marbles', 'RM-MAR-01', 'Premium Carrara marble tiles', 'sqft', 35000, 32000, 800, 50, 14, '{"origin": "Italy", "finish": "polished", "thickness": "20mm"}'),
(1, 'Engineered Wood Flooring', 'Flooring', 'Wood', 'Greenply', 'GP-ENG-01', 'AC4 grade laminate flooring', 'sqft', 18500, 16500, 2000, 200, 10, '{"grade": "AC4", "thickness": "12mm", "warranty": "10 years"}'),

-- Furniture
(2, 'Modular Kitchen Cabinets', 'Furniture', 'Kitchen', 'Godrej Interio', 'GI-MOD-K1', 'Complete modular kitchen set with soft-close hinges', 'set', 125000, 115000, 25, 1, 21, '{"material": "plywood", "finish": "laminate", "hardware": "Hettich"}'),
(2, 'Designer Sofa Set', 'Furniture', 'Living Room', 'Urban Ladder', 'UL-SOF-01', '3+2+1 seater sofa set in premium fabric', 'set', 85000, 78000, 15, 1, 18, '{"fabric": "premium", "frame": "hardwood", "warranty": "5 years"}'),
(2, 'King Size Bed with Storage', 'Furniture', 'Bedroom', 'Pepperfry', 'PF-BED-K1', 'Solid wood king size bed with hydraulic storage', 'piece', 45000, 41000, 30, 1, 15, '{"size": "king", "material": "sheesham", "storage": "hydraulic"}'),

-- Lighting
(3, 'Crystal Chandelier', 'Lighting', 'Ceiling', 'Philips', 'PH-CH-01', 'LED crystal chandelier for dining rooms', 'piece', 25000, 22500, 50, 1, 12, '{"type": "LED", "crystals": "K9", "warranty": "2 years"}'),
(3, 'Modern Pendant Lights', 'Lighting', 'Ceiling', 'Havells', 'HAV-PEN-01', 'Set of 3 modern pendant lights', 'set', 8500, 7500, 100, 1, 8, '{"type": "LED", "color": "warm white", "dimmable": true}'),
(3, 'Wall Sconces', 'Lighting', 'Wall', 'Crompton', 'CR-SCO-01', 'Designer wall sconces for bedrooms', 'pair', 6500, 5800, 80, 1, 5, '{"type": "LED", "installation": "wall mount", "finish": "brass"}'),

-- Hardware
(4, 'Premium Door Handles', 'Hardware', 'Door', 'Dorset', 'DOR-HAN-01', 'Stainless steel door handles with lock', 'set', 3500, 3200, 200, 5, 3, '{"material": "SS304", "finish": "brushed", "lock": "included"}'),
(4, 'Cabinet Hinges', 'Hardware', 'Cabinet', 'Hettich', 'HET-HIN-01', 'Soft-close cabinet hinges', 'piece', 450, 400, 1000, 20, 2, '{"type": "soft-close", "angle": "110 degree", "material": "steel"}'),
(4, 'Drawer Slides', 'Hardware', 'Drawer', 'Hettich', 'HET-SLI-01', 'Full extension drawer slides', 'pair', 850, 750, 500, 10, 2, '{"extension": "full", "load": "35kg", "length": "22 inch"}'),

-- Paint & Finishes
(5, 'Premium Interior Paint', 'Paint', 'Wall Paint', 'Asian Paints', 'AP-INT-01', 'Royale luxury emulsion paint', 'liter', 650, 580, 1000, 20, 1, '{"finish": "silk", "coverage": "120 sqft/liter", "washable": true}'),
(5, 'Exterior Weather Paint', 'Paint', 'Exterior', 'Berger', 'BER-EXT-01', 'Weather shield exterior paint', 'liter', 750, 680, 800, 20, 1, '{"finish": "smooth", "coverage": "100 sqft/liter", "weather_resistant": true}'),
(5, 'Wood Polish', 'Polish', 'Wood', 'Asian Paints', 'AP-POL-01', 'Premium wood polish and stain', 'liter', 850, 780, 300, 10, 2, '{"type": "polyurethane", "finish": "glossy", "durability": "5 years"}');

-- Sample Notification Templates
INSERT INTO notification_templates (name, title, content, variables, is_active) VALUES
('lead_assigned', 'New Lead Assigned', 'A new lead from {{client_name}} has been assigned to you. Budget: {{budget_range}}', ARRAY['client_name', 'budget_range'], true),
('project_created', 'New Project Created', 'Project "{{project_title}}" has been created with budget ₹{{budget}}', ARRAY['project_title', 'budget'], true),
('payment_received', 'Payment Received', 'Payment of ₹{{amount}} received for project "{{project_title}}"', ARRAY['amount', 'project_title'], true),
('milestone_completed', 'Milestone Completed', 'Milestone "{{milestone_title}}" for project "{{project_title}}" has been completed', ARRAY['milestone_title', 'project_title'], true),
('material_delivered', 'Material Delivered', 'Materials for project "{{project_title}}" have been delivered', ARRAY['project_title'], true),
('project_delayed', 'Project Delayed', 'Project "{{project_title}}" is delayed. New expected completion: {{new_date}}', ARRAY['project_title', 'new_date'], true);

-- Sample Project Workflow Templates (for quick project setup)
CREATE TABLE IF NOT EXISTS project_workflow_templates (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  stages JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO project_workflow_templates (name, description, stages) VALUES
('Standard Home Interior', 'Standard workflow for complete home interior projects', 
'[
  {"name": "consultation", "title": "Initial Consultation", "duration_days": 3, "order": 1},
  {"name": "site_measurement", "title": "Site Measurement", "duration_days": 2, "order": 2},
  {"name": "design_concept", "title": "Design Concept", "duration_days": 7, "order": 3},
  {"name": "design_approval", "title": "Design Approval", "duration_days": 3, "order": 4},
  {"name": "material_selection", "title": "Material Selection", "duration_days": 5, "order": 5},
  {"name": "quotation", "title": "Final Quotation", "duration_days": 2, "order": 6},
  {"name": "work_commencement", "title": "Work Commencement", "duration_days": 1, "order": 7},
  {"name": "civil_work", "title": "Civil Work", "duration_days": 15, "order": 8},
  {"name": "electrical_plumbing", "title": "Electrical & Plumbing", "duration_days": 10, "order": 9},
  {"name": "flooring", "title": "Flooring Work", "duration_days": 8, "order": 10},
  {"name": "painting", "title": "Painting Work", "duration_days": 7, "order": 11},
  {"name": "furniture_installation", "title": "Furniture Installation", "duration_days": 5, "order": 12},
  {"name": "final_cleanup", "title": "Final Cleanup", "duration_days": 2, "order": 13},
  {"name": "handover", "title": "Project Handover", "duration_days": 1, "order": 14}
]'),

('Kitchen Renovation', 'Workflow for kitchen renovation projects',
'[
  {"name": "consultation", "title": "Kitchen Consultation", "duration_days": 2, "order": 1},
  {"name": "measurement", "title": "Detailed Measurement", "duration_days": 1, "order": 2},
  {"name": "design", "title": "Kitchen Design", "duration_days": 5, "order": 3},
  {"name": "appliance_selection", "title": "Appliance Selection", "duration_days": 3, "order": 4},
  {"name": "quotation", "title": "Final Quote", "duration_days": 1, "order": 5},
  {"name": "demolition", "title": "Existing Kitchen Demolition", "duration_days": 2, "order": 6},
  {"name": "civil_work", "title": "Civil & Plumbing Work", "duration_days": 7, "order": 7},
  {"name": "electrical", "title": "Electrical Work", "duration_days": 3, "order": 8},
  {"name": "cabinets", "title": "Cabinet Installation", "duration_days": 5, "order": 9},
  {"name": "countertop", "title": "Countertop Installation", "duration_days": 2, "order": 10},
  {"name": "appliances", "title": "Appliance Installation", "duration_days": 2, "order": 11},
  {"name": "final_touches", "title": "Final Touches", "duration_days": 1, "order": 12}
]'),

('Office Interior', 'Workflow for office interior projects',
'[
  {"name": "requirement_analysis", "title": "Requirement Analysis", "duration_days": 3, "order": 1},
  {"name": "space_planning", "title": "Space Planning", "duration_days": 5, "order": 2},
  {"name": "design_presentation", "title": "Design Presentation", "duration_days": 3, "order": 3},
  {"name": "material_finalization", "title": "Material Finalization", "duration_days": 4, "order": 4},
  {"name": "furniture_procurement", "title": "Furniture Procurement", "duration_days": 14, "order": 5},
  {"name": "civil_work", "title": "Civil Work", "duration_days": 10, "order": 6},
  {"name": "electrical", "title": "Electrical & Network", "duration_days": 7, "order": 7},
  {"name": "flooring", "title": "Flooring Installation", "duration_days": 5, "order": 8},
  {"name": "partitions", "title": "Partition Installation", "duration_days": 6, "order": 9},
  {"name": "furniture", "title": "Furniture Installation", "duration_days": 4, "order": 10},
  {"name": "testing", "title": "System Testing", "duration_days": 2, "order": 11},
  {"name": "handover", "title": "Office Handover", "duration_days": 1, "order": 12}
]');

-- Financial Configuration
INSERT INTO analytics_events (event_type, entity_type, properties, created_at) VALUES
('system_initialized', 'system', '{"version": "1.0.0", "environment": "production"}', NOW()),
('database_seeded', 'system', '{"tables_created": 25, "initial_data": "complete"}', NOW());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_vendor_id ON materials(vendor_id);
CREATE INDEX IF NOT EXISTS idx_materials_price ON materials(price);
CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city);
CREATE INDEX IF NOT EXISTS idx_vendors_business_type ON vendors(business_type);
CREATE INDEX IF NOT EXISTS idx_projects_status_priority ON projects(status, priority);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leads_score_status ON leads(score DESC, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_date ON analytics_events(event_type, created_at);

-- Update statistics for query optimization
ANALYZE users;
ANALYZE projects;
ANALYZE leads;
ANALYZE materials;
ANALYZE vendors;
ANALYZE notifications;
ANALYZE analytics_events;