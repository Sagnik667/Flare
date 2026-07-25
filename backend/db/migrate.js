import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const runMigrations = async () => {
  const client = await db.getClient();
  try {
    console.log('Starting database migrations...');

    // 1. Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Read all migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // alphabetical order

    // 3. Apply pending migrations
    for (const file of files) {
      const { rows } = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
      if (rows.length === 0) {
        console.log(`Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`Successfully applied migration: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`Error applying migration ${file}:`, err);
          throw err;
        }
      } else {
        console.log(`Skipping migration (already applied): ${file}`);
      }
    }

    console.log('All migrations checked and applied successfully.');

    // 4. Run seeds
    await runSeeds(client);

  } catch (error) {
    console.error('Migration runner failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

const runSeeds = async (client) => {
  try {
    console.log('Running seeds...');
    const seedsDir = path.join(__dirname, 'seeds');
    
    // Seed admin
    const seedAdminPath = path.join(seedsDir, 'seed_admin.sql');
    if (fs.existsSync(seedAdminPath)) {
      console.log('Applying seed: seed_admin.sql');
      const sql = fs.readFileSync(seedAdminPath, 'utf8');
      await client.query(sql);
    }

    // Seed resources
    const seedResourcesPath = path.join(seedsDir, 'seed_resources.sql');
    if (fs.existsSync(seedResourcesPath)) {
      console.log('Applying seed: seed_resources.sql');
      const sql = fs.readFileSync(seedResourcesPath, 'utf8');
      await client.query(sql);
    }

    console.log('Seeds applied successfully.');
  } catch (error) {
    console.error('Error applying seeds:', error);
    throw error;
  }
};

// If run directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations().then(() => {
    console.log('Migrations complete.');
    process.exit(0);
  }).catch((err) => {
    console.error('Migrations failed:', err);
    process.exit(1);
  });
}
