import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "../config/database.js";

async function run() {
  console.log("Running Drizzle Migrator...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Drizzle Migrator Completed Successfully!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
