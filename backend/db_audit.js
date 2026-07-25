import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function audit() {
  console.log('--- DATABASE POST-MIGRATION AUDIT ---');
  
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

    // 1. Get exact constraint definition of chk_password_hash
    console.log('\n--- Constraint Audit: chk_password_hash ---');
    const constraintRes = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'users'::regclass AND conname = 'chk_password_hash';
    `);

    if (constraintRes.rows.length === 0) {
      console.log('✓ Constraint chk_password_hash not found in users table (Successfully Dropped).');
    } else {
      console.log('Constraint Name:', constraintRes.rows[0].conname);
      console.log('SQL Definition:', constraintRes.rows[0].def);
    }

    // 2. Query users that have NULL password hashes
    console.log('\n--- User Audit: NULL Password Hashes ---');
    const nullPasswordRes = await client.query(`
      SELECT COUNT(*) FROM users WHERE password_hash IS NULL;
    `);
    console.log('Remaining users with NULL password_hash:', nullPasswordRes.rows[0].count);

    // 3. Print users table columns
    console.log('\n--- Users Table Columns ---');
    const columnsRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    columnsRes.rows.forEach(col => {
      console.log(`- Column: ${col.column_name.padEnd(20)} | Type: ${col.data_type.padEnd(25)} | Nullable: ${col.is_nullable}`);
    });

    // 4. Check if auth_provider_type enum still exists
    console.log('\n--- Enum Type Audit ---');
    const enumRes = await client.query(`
      SELECT typname FROM pg_type WHERE typname = 'auth_provider_type';
    `);
    if (enumRes.rows.length === 0) {
      console.log('✓ Enum type auth_provider_type does not exist (Successfully Dropped).');
    } else {
      console.log('❌ Enum type auth_provider_type still exists.');
    }

    await client.end();
  } catch (err) {
    console.error('❌ Audit failed:', err.message);
  }
}

audit();
