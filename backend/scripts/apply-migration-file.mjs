import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error("Usage: node scripts/apply-migration-file.mjs <migration-file>");
  process.exit(1);
}

const envFile = path.resolve(".env");
const env = Object.fromEntries(
  fs
    .readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

let connectionString = env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing from backend/.env");
  process.exit(1);
}

if (connectionString.includes("sslmode=require") && !connectionString.includes("uselibpqcompat=true")) {
  connectionString += connectionString.includes("?") ? "&uselibpqcompat=true" : "?uselibpqcompat=true";
}

const sqlFile = path.resolve(migrationFile);
const sql = fs.readFileSync(sqlFile, "utf8");
const client = new pg.Client({
  connectionString,
  connectionTimeoutMillis: 20_000,
  ssl: connectionString.includes("sslmode=require") || connectionString.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
});

try {
  await client.connect();
  await client.query("set search_path to public");
  await client.query(sql);
  console.log(`Applied ${path.basename(sqlFile)}`);

  const tables = [
    "inventory_categories",
    "inventory_items",
    "order_item_inventory_consumptions",
    "recipe_ingredients",
    "recipes",
    "stock_movements",
  ];
  const result = await client.query(
    "select table_name from information_schema.tables where table_schema = $1 and table_name = any($2) order by table_name",
    ["public", tables],
  );
  console.table(result.rows);
} finally {
  await client.end();
}
