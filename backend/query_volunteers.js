import db from './config/database.js';

async function run() {
  try {
    const { rows } = await db.query(
      `SELECT v.id, v.user_id, u.full_name, v.verification_status, v.document_url 
       FROM volunteers v
       JOIN users u ON v.user_id = u.id`
    );
    console.log(`Total volunteers: ${rows.length}`);
    for (const r of rows) {
      console.log(`Volunteer: ${r.full_name} (${r.user_id})`);
      console.log(`  Status: ${r.verification_status}`);
      console.log(`  Document URL: ${r.document_url}`);
    }
  } catch (error) {
    console.error('Error querying volunteers:', error);
  } finally {
    db.pool.end();
  }
}

run();
