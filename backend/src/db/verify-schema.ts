import { pool } from "../config/database.js";

const requiredTables = [
  "organizations",
  "restaurants",
  "admins",
  "subscriptions",
  "licenses",
  "notifications",
] as const;

const requiredColumns: Record<string, string[]> = {
  restaurants: [
    "organization_id",
    "code",
    "alternate_phone",
    "address_line1",
    "address_line2",
    "business_type",
    "cuisine_type",
    "timezone",
    "currency",
    "logo",
    "website",
  ],
  admins: ["organization_id", "restaurant_id", "status"],
  subscriptions: ["organization_id", "restaurant_id", "currency"],
  licenses: ["organization_id", "restaurant_id", "subscription_id"],
  notifications: ["organization_id", "restaurant_id", "dedupe_key"],
  order_items: ["organization_id", "restaurant_id"],
};

const requiredForeignKeys = [
  ["restaurants", "organization_id", "organizations", "id"],
  ["admins", "organization_id", "organizations", "id"],
  ["subscriptions", "organization_id", "organizations", "id"],
  ["licenses", "organization_id", "organizations", "id"],
  ["notifications", "organization_id", "organizations", "id"],
  ["order_items", "organization_id", "organizations", "id"],
] as const;

async function main() {
  const issues: string[] = [];

  const tableResult = await pool.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  const tables = new Set(tableResult.rows.map((row) => row.table_name));

  for (const table of requiredTables) {
    if (!tables.has(table)) issues.push(`Missing table: ${table}`);
  }

  const columnResult = await pool.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'`,
  );
  const columns = new Set(columnResult.rows.map((row) => `${row.table_name}.${row.column_name}`));

  for (const [table, names] of Object.entries(requiredColumns)) {
    for (const column of names) {
      if (!columns.has(`${table}.${column}`)) issues.push(`Missing column: ${table}.${column}`);
    }
  }

  const fkResult = await pool.query<{
    table_name: string;
    column_name: string;
    foreign_table_name: string;
    foreign_column_name: string;
  }>(
    `SELECT
       tc.table_name,
       kcu.column_name,
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name
     FROM information_schema.table_constraints AS tc
     JOIN information_schema.key_column_usage AS kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage AS ccu
       ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`,
  );
  const foreignKeys = new Set(
    fkResult.rows.map((row) => `${row.table_name}.${row.column_name}->${row.foreign_table_name}.${row.foreign_column_name}`),
  );

  for (const [table, column, foreignTable, foreignColumn] of requiredForeignKeys) {
    const key = `${table}.${column}->${foreignTable}.${foreignColumn}`;
    if (!foreignKeys.has(key)) issues.push(`Missing foreign key: ${key}`);
  }

  if (issues.length > 0) {
    console.error("Database schema verification failed:");
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }

  console.log("Database schema verification passed.");
}

main()
  .catch((error: unknown) => {
    console.error("Database schema verification failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
