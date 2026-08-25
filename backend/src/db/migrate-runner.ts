import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { env } from "../config/env.js";

const { Client } = pg;

async function runMigration() {
  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  try {
    const migrationsDir = path.resolve("src/db/migrations");
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");

      console.log(`Applying migration ${file}...`);
      try {
        await client.query(sql);
        console.log(`Migration ${file} applied successfully!`);
      } catch (error: unknown) {
        const pgError = error as { code?: string; message?: string };
        if (pgError.code === "42710" || pgError.message?.includes("already exists")) {
          console.log(`Notice: Some objects in ${file} already existed, skipped.`);
        } else {
          console.error(`Migration error in ${file}:`, error);
        }
      }
    }
  } finally {
    await client.end();
  }
}

runMigration();
