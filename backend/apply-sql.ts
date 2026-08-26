import { Client } from "pg";
import fs from "fs";
import { env } from "./src/config/env.js";

async function run() {
  const client = new Client({
    connectionString: env.DATABASE_URL + (env.DATABASE_URL.includes("sslmode=require") ? "&uselibpqcompat=true" : "")
  });
  await client.connect();
  try {
    await client.query("SET search_path TO public");
    
    const sqlString = fs.readFileSync("./src/db/migrations/0000_wonderful_salo.sql", "utf8");
    const statements = sqlString.split("--> statement-breakpoint");
    for (const stmt of statements) {
      const s = stmt.trim();
      if (s) {
        await client.query(s);
      }
    }
    console.log("SQL Applied");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
