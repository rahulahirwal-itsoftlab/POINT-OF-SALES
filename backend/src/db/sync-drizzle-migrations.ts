import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";
import { env } from "../config/env.js";

const { Client } = pg;

async function syncDrizzleMigrations() {
  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  try {
    // Create drizzle schema and __drizzle_migrations table if not exists
    await client.query(`CREATE SCHEMA IF NOT EXISTS "drizzle";`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);

    const migrationsDir = path.resolve("src/db/migrations");
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

    const existingRows = await client.query(`SELECT hash FROM "drizzle"."__drizzle_migrations";`);
    const existingHashes = new Set(existingRows.rows.map((r) => r.hash));

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, "utf8");
      const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");

      if (!existingHashes.has(hash)) {
        const timestamp = Date.now();
        await client.query(
          `INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2);`,
          [hash, timestamp]
        );
        console.log(`Synced migration ${file} into __drizzle_migrations table.`);
      } else {
        console.log(`Migration ${file} already registered in __drizzle_migrations.`);
      }
    }

    console.log("Drizzle migration tracking table is fully up-to-date!");
  } catch (error) {
    console.error("Error syncing drizzle migrations:", error);
  } finally {
    await client.end();
  }
}

syncDrizzleMigrations();
