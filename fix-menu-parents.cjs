const { Client } = require('pg');

async function fixMenuParents() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'gharinto_db',
    user: 'postgres',
    password: '1234'
  });

  try {
    await client.connect();
    
    // Get System menu ID
    const systemResult = await client.query(`
      SELECT id FROM menus WHERE name = 'system' LIMIT 1
    `);
    
    const systemMenuId = systemResult.rows[0]?.id;
    
    if (!systemMenuId) {
      console.error('❌ System menu not found!');
      return;
    }
    
    console.log(`✅ System menu ID: ${systemMenuId}`);
    
    // Update parent_id for city_management, menu_configuration, and assignment_config
    await client.query(`
      UPDATE menus 
      SET parent_id = $1
      WHERE name IN ('city_management', 'menu_configuration', 'assignment_config')
        AND (parent_id IS NULL OR parent_id != $1)
    `, [systemMenuId]);
    
    console.log('✅ Updated parent_id for System menu items');
    
    // Verify the update
    const result = await client.query(`
      SELECT id, name, display_name, path, parent_id
      FROM menus 
      WHERE name IN ('city_management', 'menu_configuration', 'assignment_config', 'commission_config')
      ORDER BY name
    `);
    
    console.log('\n✅ Updated Menu Items:');
    result.rows.forEach(row => {
      console.log(`  - ${row.display_name} (${row.path}) - parent_id: ${row.parent_id}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixMenuParents();

