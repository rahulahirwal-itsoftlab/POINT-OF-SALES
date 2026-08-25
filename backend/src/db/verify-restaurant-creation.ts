import pg from "pg";
import { env } from "../config/env.js";

async function verify() {
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`);
    console.log("TABLES IN DB:", res.rows.map((r) => r.table_name));
  } finally {
    await client.end();
  }
}

verify().catch(console.error);
