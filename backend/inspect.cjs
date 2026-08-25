const { Client } = require('pg');

const client = new Client({ connectionString: "postgresql://neondb_owner:npg_fG0Yy7bBdsqV@ep-late-lake-azripvia-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" });

async function run() {
  await client.connect();
  try {
    const res = await client.query("SELECT * FROM __drizzle_migrations ORDER BY created_at ASC");
    console.log("MIGRATIONS:", res.rows);
  } catch (e) { console.log(e.message); }
  await client.end();
}
run().catch(console.error);
