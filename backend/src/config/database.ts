import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "./env.js";
import * as schema from "../db/schema/index.js";

let connectionString = env.DATABASE_URL;
if (connectionString.includes("sslmode=require") && !connectionString.includes("uselibpqcompat=true")) {
  connectionString += "&uselibpqcompat=true";
}

export const pool = new pg.Pool({
  connectionString,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  keepAlive: true,
  max: env.DB_POOL_MAX,
});

pool.on("error", (error) => {
  console.error("PostgreSQL pool error", {
    name: error.name,
    message: error.message,
  });
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
