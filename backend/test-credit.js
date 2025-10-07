const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'gharinto_db',
  user: 'postgres',
  password: '1234',
});

async function testCredit() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = 1;
    const amount = 5000;
    const reason = 'Test credit transaction';

    console.log('Credit request - userId:', userId, 'amount:', amount, 'reason:', reason);

    // Get wallet
    let walletResult = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1', [userId]);
    console.log('Wallet query result:', walletResult.rows);

    if (walletResult.rows.length === 0) {
      console.log('Creating new wallet');
      walletResult = await client.query(
        'INSERT INTO wallets (user_id, balance, total_earned) VALUES ($1, $2, $3) RETURNING id, balance',
        [userId, Math.floor(amount), Math.floor(amount)]
      );
    } else {
      console.log('Updating existing wallet');
      await client.query(
        'UPDATE wallets SET balance = balance + $1, total_earned = total_earned + $1, updated_at = NOW() WHERE user_id = $2',
        [Math.floor(amount), userId]
      );
      walletResult = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1', [userId]);
    }

    const walletId = walletResult.rows[0].id;
    const newBalance = parseInt(walletResult.rows[0].balance);
    console.log('Wallet ID:', walletId, 'New Balance:', newBalance);

    // Create transaction record
    console.log('Creating transaction record...');
    const transactionResult = await client.query(
      `INSERT INTO transactions (wallet_id, type, amount, description, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [walletId, 'credit', Math.floor(amount), reason, 'completed']
    );
    console.log('Transaction created:', transactionResult.rows[0]);

    // Create audit log
    console.log('Creating audit log...');
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        1, // SuperAdmin user ID
        'CREDIT',
        'wallet',
        walletId,
        JSON.stringify({ amount, reason, userId, transactionId: transactionResult.rows[0].id })
      ]
    );
    console.log('Audit log created');

    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully!');

    console.log('\nResult:', {
      success: true,
      message: 'Credits added successfully',
      transaction: {
        id: transactionResult.rows[0].id,
        amount,
        newBalance,
        createdAt: transactionResult.rows[0].created_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.error('Error stack:', error.stack);
  } finally {
    client.release();
    pool.end();
  }
}

testCredit();

