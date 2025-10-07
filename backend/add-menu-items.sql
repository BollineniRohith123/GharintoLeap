-- Add menu items for Financial Management and Partner Approvals
-- These menus will be visible to users with appropriate permissions

-- Add Financial Management submenu under Finance
INSERT INTO menus (name, display_name, icon, path, parent_id, sort_order, is_active)
VALUES ('finance_management', 'Financial Management', '', '/finance/management', 5, 5, true);

-- Get the ID of the newly created menu item
DO $$
DECLARE
    finance_mgmt_menu_id bigint;
    approvals_menu_id bigint;
    super_admin_role_id bigint;
BEGIN
    -- Get the finance_management menu ID
    SELECT id INTO finance_mgmt_menu_id FROM menus WHERE name = 'finance_management';
    
    -- Get the super_admin role ID
    SELECT id INTO super_admin_role_id FROM roles WHERE name = 'super_admin';
    
    -- Assign finance_management menu to super_admin role
    INSERT INTO role_menus (role_id, menu_id)
    VALUES (super_admin_role_id, finance_mgmt_menu_id)
    ON CONFLICT DO NOTHING;
    
    -- Add Partner Approvals as a top-level menu
    INSERT INTO menus (name, display_name, icon, path, parent_id, sort_order, is_active)
    VALUES ('approvals', 'Partner Approvals', 'ClipboardCheck', '/approvals/partners', NULL, 11, true)
    RETURNING id INTO approvals_menu_id;
    
    -- Assign approvals menu to super_admin role
    INSERT INTO role_menus (role_id, menu_id)
    VALUES (super_admin_role_id, approvals_menu_id)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Menu items added successfully!';
END $$;

-- Verify the menus were added
SELECT 'Newly added menus:' as status;
SELECT id, name, display_name, path, parent_id, sort_order 
FROM menus 
WHERE name IN ('finance_management', 'approvals');

-- Verify role_menus assignments
SELECT 'Menu assignments for super_admin:' as status;
SELECT r.name as role_name, m.name as menu_name, m.display_name, m.path
FROM role_menus rm
JOIN roles r ON rm.role_id = r.id
JOIN menus m ON rm.menu_id = m.id
WHERE r.name = 'super_admin' 
AND m.name IN ('finance_management', 'approvals');

