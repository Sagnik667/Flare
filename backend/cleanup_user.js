import pg from 'pg';

const { Client } = pg;

async function cleanup() {
  const emails = ['sagnik.bhowmick241@gmail.com', 'sagnikbhowmick241@gmail.com'];
  
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

    for (const email of emails) {
      console.log(`\nChecking email: ${email}`);
      const { rows } = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (rows.length === 0) {
        console.log(`- Not found.`);
        continue;
      }

      const userId = rows[0].id;
      console.log(`- Found user ID: ${userId}`);

      await client.query('BEGIN');
      try {
        await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM emergency_contacts WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM volunteers WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM safety_profiles WHERE user_id = $1', [userId]);

        const incidentRes = await client.query('SELECT id FROM emergency_incidents WHERE user_id = $1', [userId]);
        const incidentIds = incidentRes.rows.map(r => r.id);
        if (incidentIds.length > 0) {
          for (const incidentId of incidentIds) {
            await client.query('DELETE FROM incident_locations WHERE incident_id = $1', [incidentId]);
            await client.query('DELETE FROM incident_assignments WHERE incident_id = $1', [incidentId]);
            await client.query('DELETE FROM incident_timeline WHERE incident_id = $1', [incidentId]);
          }
          await client.query('DELETE FROM emergency_incidents WHERE user_id = $1', [userId]);
        }

        await client.query('DELETE FROM incident_assignments WHERE volunteer_id = $1', [userId]);
        await client.query('DELETE FROM users WHERE id = $1', [userId]);

        await client.query('COMMIT');
        console.log(`- ✓ Successfully deleted user ${email} and all their dependencies.`);
      } catch (transErr) {
        await client.query('ROLLBACK');
        console.error(`- ❌ Deletion failed for ${email}:`, transErr.message);
      }
    }

    await client.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

cleanup();
