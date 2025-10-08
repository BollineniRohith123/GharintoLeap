const { Client } = require('pg');

async function checkMenus() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'gharinto_db',
    user: 'postgres',
    password: '1234'
  });

  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT id, name, display_name, path, parent_id, is_active
      FROM menus 
      WHERE name IN ('city_management', 'menu_configuration', 'assignment_config', 'commission_config')
      ORDER BY name
    `);

    console.log('\n✅ CRITICAL Feature Menu Items:');
    console.log(JSON.stringify(result.rows, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkMenus();

