const { Client } = require('pg');

async function listMenus() {
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
      SELECT id, name, display_name, path, parent_id, sort_order
      FROM menus 
      ORDER BY parent_id NULLS FIRST, sort_order
    `);
    
    console.log('\n✅ All Menu Items:');
    result.rows.forEach(row => {
      const parentInfo = row.parent_id ? `parent: ${row.parent_id}` : 'TOP LEVEL';
      console.log(`  ${row.id}: ${row.name} (${row.display_name}) - ${parentInfo}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

listMenus();

