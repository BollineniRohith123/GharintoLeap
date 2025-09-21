-- Create enhanced workflow tables

-- Project Workflow Templates (customizable templates)
CREATE TABLE project_workflow_templates (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  project_type VARCHAR(50), -- residential, commercial, etc.
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Template Stages
CREATE TABLE workflow_template_stages (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT REFERENCES project_workflow_templates(id) ON DELETE CASCADE,
  stage_name VARCHAR(200) NOT NULL,
  description TEXT,
  typical_duration_days INTEGER DEFAULT 1,
  required_role VARCHAR(50),
  depends_on_stage_id BIGINT REFERENCES workflow_template_stages(id),
  sort_order INTEGER DEFAULT 0,
  is_milestone BOOLEAN DEFAULT FALSE,
  auto_approve BOOLEAN DEFAULT FALSE,
  required_documents TEXT[], -- Array of required document types
  checklist_items TEXT[], -- Array of checklist items
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced Project Workflows table (replace existing)
DROP TABLE IF EXISTS project_workflows CASCADE;

CREATE TABLE project_workflows (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  template_stage_id BIGINT REFERENCES workflow_template_stages(id),
  stage_name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, on_hold, completed, skipped, cancelled
  priority VARCHAR(10) DEFAULT 'medium', -- low, medium, high, urgent
  assigned_to BIGINT REFERENCES users(id),
  assigned_by BIGINT REFERENCES users(id),
  
  -- Timing
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  estimated_hours INTEGER,
  actual_hours INTEGER,
  
  -- Dependencies
  depends_on_workflow_id BIGINT REFERENCES project_workflows(id),
  blocks_workflow_ids BIGINT[],
  
  -- Progress tracking
  progress_percentage INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_milestone BOOLEAN DEFAULT FALSE,
  is_critical_path BOOLEAN DEFAULT FALSE,
  
  -- Documentation
  notes TEXT,
  completion_notes TEXT,
  attachments TEXT[], -- JSON array of file URLs
  checklist_items JSONB, -- { "item": "completed", ... }
  
  -- Quality control
  quality_score INTEGER, -- 1-10 rating
  quality_notes TEXT,
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMP,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Dependencies (many-to-many)
CREATE TABLE workflow_dependencies (
  id BIGSERIAL PRIMARY KEY,
  workflow_id BIGINT REFERENCES project_workflows(id) ON DELETE CASCADE,
  depends_on_workflow_id BIGINT REFERENCES project_workflows(id) ON DELETE CASCADE,
  dependency_type VARCHAR(20) DEFAULT 'finish_to_start', -- finish_to_start, start_to_start, finish_to_finish, start_to_finish
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workflow_id, depends_on_workflow_id)
);

-- Workflow Comments/Updates
CREATE TABLE workflow_comments (
  id BIGSERIAL PRIMARY KEY,
  workflow_id BIGINT REFERENCES project_workflows(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id),
  comment TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'comment', -- comment, status_change, assignment, milestone
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  attachments TEXT[],
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Time Tracking
CREATE TABLE workflow_time_entries (
  id BIGSERIAL PRIMARY KEY,
  workflow_id BIGINT REFERENCES project_workflows(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id),
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_minutes INTEGER,
  billable BOOLEAN DEFAULT TRUE,
  hourly_rate BIGINT, -- in cents
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default workflow templates
INSERT INTO project_workflow_templates (name, description, project_type, is_default, created_by) 
VALUES 
  ('Residential Interior Design', 'Standard workflow for residential interior design projects', 'residential', true, 1),
  ('Commercial Interior Design', 'Standard workflow for commercial interior design projects', 'commercial', true, 1),
  ('Quick Renovation', 'Simplified workflow for quick renovation projects', 'renovation', false, 1);

-- Get template IDs for stage insertion
-- Residential template stages
INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items) 
SELECT id, 'Initial Consultation', 'Meet with client to understand requirements', 2, 'interior_designer', 1, true, 
ARRAY['Understand client requirements', 'Take initial photos', 'Discuss budget range', 'Set timeline expectations']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Site Measurement', 'Accurate measurement of the space', 1, 'interior_designer', 2, false,
ARRAY['Measure all rooms', 'Note existing fixtures', 'Check electrical points', 'Document structural elements']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Concept Design', 'Create initial design concepts', 7, 'interior_designer', 3, true,
ARRAY['Create mood boards', 'Develop space planning', 'Color scheme selection', 'Present to client']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Design Approval', 'Client review and approval of concept', 3, 'customer', 4, true,
ARRAY['Client review meeting', 'Feedback incorporation', 'Final approval']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Detailed Drawings', 'Create detailed technical drawings', 10, 'interior_designer', 5, true,
ARRAY['Floor plans', 'Elevation drawings', 'Electrical layout', 'Plumbing layout', '3D renderings']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Material Selection', 'Finalize all materials and finishes', 5, 'interior_designer', 6, false,
ARRAY['Flooring selection', 'Wall finishes', 'Lighting fixtures', 'Furniture selection', 'Fabric choices']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Budget Finalization', 'Finalize project budget and costs', 2, 'project_manager', 7, true,
ARRAY['Material cost calculation', 'Labor cost estimation', 'Contingency planning', 'Client budget approval']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Vendor Coordination', 'Coordinate with vendors and contractors', 3, 'project_manager', 8, false,
ARRAY['Vendor selection', 'Contract negotiations', 'Schedule coordination', 'Material ordering']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Pre-Construction', 'Prepare for construction phase', 2, 'project_manager', 9, true,
ARRAY['Site preparation', 'Material delivery schedule', 'Worker coordination', 'Safety briefing']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Electrical Work', 'Electrical installation and wiring', 7, 'vendor', 10, false,
ARRAY['Wiring installation', 'Switch and socket placement', 'Lighting circuits', 'Safety testing']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Plumbing Work', 'Plumbing installation and connections', 5, 'vendor', 11, false,
ARRAY['Pipe installation', 'Fixture connections', 'Water supply setup', 'Drainage system']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Flooring Installation', 'Install all flooring materials', 10, 'vendor', 12, false,
ARRAY['Surface preparation', 'Material installation', 'Finishing work', 'Quality check']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Wall Finishing', 'Paint and wall finishing work', 8, 'vendor', 13, false,
ARRAY['Surface preparation', 'Primer application', 'Paint application', 'Touch-up work']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Furniture Installation', 'Install and arrange furniture', 5, 'vendor', 14, false,
ARRAY['Furniture delivery', 'Assembly and installation', 'Arrangement and styling', 'Damage inspection']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Lighting Setup', 'Install and configure lighting', 3, 'vendor', 15, false,
ARRAY['Fixture installation', 'Bulb installation', 'Dimmer configuration', 'Testing all circuits']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Quality Inspection', 'Final quality inspection and testing', 2, 'project_manager', 16, true,
ARRAY['Visual inspection', 'Functional testing', 'Defect documentation', 'Punch list creation']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Client Walkthrough', 'Final walkthrough with client', 1, 'interior_designer', 17, true,
ARRAY['Guided tour', 'Explain maintenance', 'Address concerns', 'Collect feedback']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

INSERT INTO workflow_template_stages (template_id, stage_name, description, typical_duration_days, required_role, sort_order, is_milestone, checklist_items)
SELECT id, 'Project Handover', 'Complete project handover', 1, 'project_manager', 18, true,
ARRAY['Documentation handover', 'Warranty information', 'Maintenance guide', 'Final invoicing']
FROM project_workflow_templates WHERE name = 'Residential Interior Design';

-- Create indexes for performance
CREATE INDEX idx_project_workflows_project_id ON project_workflows(project_id);
CREATE INDEX idx_project_workflows_assigned_to ON project_workflows(assigned_to);
CREATE INDEX idx_project_workflows_status ON project_workflows(status);
CREATE INDEX idx_project_workflows_stage_name ON project_workflows(stage_name);
CREATE INDEX idx_workflow_dependencies_workflow_id ON workflow_dependencies(workflow_id);
CREATE INDEX idx_workflow_comments_workflow_id ON workflow_comments(workflow_id);
CREATE INDEX idx_workflow_time_entries_workflow_id ON workflow_time_entries(workflow_id);
CREATE INDEX idx_workflow_time_entries_user_id ON workflow_time_entries(user_id);