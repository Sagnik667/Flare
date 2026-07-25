import pg from 'pg';
const { Client } = pg;

const combos = [
  { user: 'postgres', password: 'password', database: 'postgres' },
  { user: 'postgres', password: 'postgres', database: 'postgres' },
  { user: 'postgres', password: 'root', database: 'postgres' },
  { user: 'postgres', password: 'admin', database: 'postgres' },
  { user: 'postgres', password: '', database: 'postgres' },
  { user: 'postgres', password: 'Sagnik', database: 'postgres' },
  { user: 'postgres', password: 'sagnik', database: 'postgres' },
  { user: 'flare_user', password: 'flare_password', database: 'flare_db' },
  { user: 'ai_user', password: 'hello123', database: 'postgres' },
];

async function probe() {
  console.log('Probing local PostgreSQL credentials...');
  for (const combo of combos) {
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: combo.user,
      password: combo.password,
      database: combo.database,
      connectionTimeoutMillis: 1000,
    });
    try {
      await client.connect();
      console.log(`✓ SUCCESSFUL CONNECTION: User: "${combo.user}", Password: "${combo.password}", Database: "${combo.database}"`);
      
      // Check if flare_db exists
      const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'flare_db'");
      if (res.rows.length === 0) {
        console.log("  - Database 'flare_db' does not exist. Attempting to create it...");
        try {
          await client.query("CREATE DATABASE flare_db");
          console.log("  ✓ Created database 'flare_db' successfully.");
        } catch (dbErr) {
          console.log("  ❌ Failed to create database 'flare_db':", dbErr.message);
        }
      } else {
        console.log("  - Database 'flare_db' already exists.");
      }

      // Check if flare_user role exists
      const roleRes = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'flare_user'");
      if (roleRes.rows.length === 0) {
        console.log("  - Role 'flare_user' does not exist. Attempting to create it...");
        try {
          await client.query("CREATE ROLE flare_user WITH LOGIN PASSWORD 'flare_password'");
          await client.query("GRANT ALL PRIVILEGES ON DATABASE flare_db TO flare_user");
          console.log("  ✓ Created role 'flare_user' and granted database privileges.");
        } catch (roleErr) {
          console.log("  ❌ Failed to create role 'flare_user':", roleErr.message);
        }
      } else {
        // Alter user password to match env config
        try {
          await client.query("ALTER ROLE flare_user WITH PASSWORD 'flare_password'");
          await client.query("GRANT ALL PRIVILEGES ON DATABASE flare_db TO flare_user");
          console.log("  ✓ verified role 'flare_user' password and privileges.");
        } catch (alterErr) {
          console.log("  ❌ Failed to alter role 'flare_user' password:", alterErr.message);
        }
      }

      await client.end();
      break;
    } catch (err) {
      console.log(`❌ FAILED: User: "${combo.user}", Password: "${combo.password}", Database: "${combo.database}". Error: ${err.message}`);
    }
  }
}

probe();
