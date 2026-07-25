import db from './config/database.js';

async function run() {
  try {
    const { rows: users } = await db.query("SELECT * FROM users WHERE email = 'sagnikbhowmick241@gmail.com'");
    console.log('=== User Record ===');
    console.log(users);

    if (users.length > 0) {
      const userId = users[0].id;
      const { rows: volunteers } = await db.query("SELECT * FROM volunteers WHERE user_id = $1", [userId]);
      console.log('=== Volunteer Record ===');
      console.log(volunteers);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    db.pool.end();
  }
}

run();
