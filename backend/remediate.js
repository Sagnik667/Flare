import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function remediate() {
  console.log('--- DATABASE REMEDIATION ---');
  
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'ai_user',
    password: 'hello123',
    database: 'flare_db',
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    // Fetch users with NULL password_hash
    const { rows } = await client.query('SELECT id, email FROM users WHERE password_hash IS NULL');
    console.log(`Found ${rows.length} users with NULL password_hash.`);

    if (rows.length > 0) {
      console.log('Attempting to delete null password_hash users to resolve constraint requirements...');
      for (const row of rows) {
        try {
          // Delete referencing records first to avoid foreign key violations
          await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [row.id]);
          await client.query('DELETE FROM safety_profiles WHERE user_id = $1', [row.id]);
          await client.query('DELETE FROM volunteers WHERE user_id = $1', [row.id]);
          await client.query('DELETE FROM emergency_contacts WHERE user_id = $1', [row.id]);
          
          // Now delete the user
          await client.query('DELETE FROM users WHERE id = $1', [row.id]);
          console.log(`  ✓ Successfully deleted user: ${row.email}`);
        } catch (dbErr) {
          console.log(`  ❌ Failed to delete user: ${row.email} due to: ${dbErr.message}`);
          console.log(`  -> Falling back to setting a dummy password hash for user: ${row.email}`);
          // Fallback: update password_hash to a dummy bcrypt hash
          const dummyHash = '$2a$12$R9h/lIPzMRF.Fv6BfUvGHeL7XpL5D11c7K1.U7N3Zg6yv3R09wY7a'; // Bcrypt hash of 'dummyPassword123'
          await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [dummyHash, row.id]);
          console.log(`  ✓ Successfully set dummy password hash for: ${row.email}`);
        }
      }
    }

    // Verify after remediation
    const verifyRes = await client.query('SELECT COUNT(*) FROM users WHERE password_hash IS NULL');
    console.log('\nVerification: Remaining users with NULL password_hash:', verifyRes.rows[0].count);

    await client.end();
  } catch (err) {
    console.error('❌ Remediation failed:', err.message);
  }
}

remediate();
