import { db } from "../config/database.js";
import { sql } from "drizzle-orm";

async function drop() {
  await db.execute(sql`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
  console.log("DB dropped!");
  process.exit(0);
}
drop();
