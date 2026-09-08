import fs from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

let connectionString = env.DATABASE_URL;
if (connectionString.includes("sslmode=require") && !connectionString.includes("uselibpqcompat=true")) {
  connectionString += connectionString.includes("?") ? "&uselibpqcompat=true" : "?uselibpqcompat=true";
}

const client = new pg.Client({
  connectionString,
  connectionTimeoutMillis: 20_000,
  ssl: connectionString.includes("sslmode=require") || connectionString.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
});

await client.connect();
try {
  if (process.argv.includes("--summary")) {
    const tables = await client.query(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and table_name in ('inventory_categories','inventory_items','stock_movements','recipes','recipe_ingredients','order_item_inventory_consumptions')
       order by table_name`,
    );
    console.table(tables.rows);

    const requiredColumns = await client.query(
      `with required(table_name, column_name) as (
         values
           ('inventory_categories', 'id'),
           ('inventory_categories', 'organization_id'),
           ('inventory_categories', 'restaurant_id'),
           ('inventory_categories', 'name'),
           ('inventory_items', 'category_id'),
           ('inventory_items', 'sku'),
           ('inventory_items', 'unit'),
           ('inventory_items', 'current_quantity'),
           ('inventory_items', 'minimum_quantity'),
           ('inventory_items', 'description'),
           ('recipes', 'serving_quantity'),
           ('recipes', 'serving_unit'),
           ('recipes', 'is_active'),
           ('recipe_ingredients', 'organization_id'),
           ('recipe_ingredients', 'restaurant_id'),
           ('recipe_ingredients', 'inventory_item_id'),
           ('stock_movements', 'movement_type'),
           ('stock_movements', 'unit'),
           ('stock_movements', 'previous_quantity'),
           ('stock_movements', 'new_quantity'),
           ('stock_movements', 'reason'),
           ('order_item_inventory_consumptions', 'order_item_id')
       )
       select r.table_name, r.column_name, c.column_name is not null as exists
       from required r
       left join information_schema.columns c
         on c.table_schema = 'public'
        and c.table_name = r.table_name
        and c.column_name = r.column_name
       order by r.table_name, r.column_name`,
    );
    console.table(requiredColumns.rows);

    const counts = await client.query(
      `select 'inventory_categories' as table_name, count(*)::int as rows from inventory_categories
       union all
       select 'inventory_items', count(*)::int from inventory_items
       union all
       select 'inventory_items_with_category', count(*)::int
       from inventory_items i
       join inventory_categories c on c.id = i.category_id
       union all
       select 'inventory_items_without_category', count(*)::int
       from inventory_items i
       left join inventory_categories c on c.id = i.category_id
       where c.id is null
       union all
       select 'recipes', count(*)::int from recipes
       union all
       select 'stock_movements', count(*)::int from stock_movements`,
    );
    console.table(counts.rows);
    process.exit(0);
  }

  const columns = await client.query(
    `select table_name, column_name, data_type, is_nullable
     from information_schema.columns
     where table_schema = 'public'
       and table_name in ('inventory_categories','inventory_items','stock_movements','recipes','recipe_ingredients','order_item_inventory_consumptions')
     order by table_name, ordinal_position`,
  );
  console.table(columns.rows);

  const indexes = await client.query(
    `select tablename, indexname
     from pg_indexes
     where schemaname = 'public'
       and tablename in ('inventory_categories','inventory_items','stock_movements','recipes','recipe_ingredients','order_item_inventory_consumptions')
     order by tablename, indexname`,
  );
  console.table(indexes.rows);

  const enums = await client.query(
    `select t.typname, e.enumlabel
     from pg_type t
     join pg_enum e on e.enumtypid = t.oid
     where t.typname in ('inventory_category','inventory_unit','stock_movement_type')
     order by t.typname, e.enumsortorder`,
  );
  console.table(enums.rows);
} finally {
  await client.end();
}
