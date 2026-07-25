import db from './config/database.js';

async function run() {
  try {
    const { rows } = await db.query(
      `SELECT id, full_name, email, phone, role 
       FROM users 
       WHERE email LIKE '%sagnik%'`
    );
    console.log('=== matching users ===');
    console.log(rows);
  } catch (error) {
    console.error('Error querying users:', error.message);
  } finally {
    db.pool.end();
  }
}

run();
