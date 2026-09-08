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
  await client.query("begin");

  const tenantResult = await client.query(
    `select organization_id, id as restaurant_id
     from restaurants
     order by created_at desc
     limit 1`,
  );
  const tenant = tenantResult.rows[0];
  if (!tenant) {
    console.log("No restaurant tenant found for rollback inventory delete verification.");
    await client.query("rollback");
    process.exit(0);
  }

  const suffix = Date.now().toString();
  const categoryResult = await client.query(
    `insert into inventory_categories (organization_id, restaurant_id, name, description, is_active)
     values ($1, $2, $3, 'Rollback verification category', true)
     returning id`,
    [tenant.organization_id, tenant.restaurant_id, `Rollback Category ${suffix}`],
  );
  const categoryId = categoryResult.rows[0].id;

  const itemResult = await client.query(
    `insert into inventory_items (
       organization_id, restaurant_id, category_id, item_code, name, sku, category, unit,
       current_stock, minimum_stock, unit_cost, current_quantity, minimum_quantity,
       description, is_active
     )
     values ($1, $2, $3, $4, $5, $6, 'OTHER', 'kg', '0', '0', '0', '0', '0', 'Rollback verification item', true)
     returning id`,
    [tenant.organization_id, tenant.restaurant_id, categoryId, `RB-${suffix}`, `Rollback Item ${suffix}`, `RB-SKU-${suffix}`],
  );
  const itemId = itemResult.rows[0].id;

  const categoryUsageBeforeDelete = await client.query(
    `select count(*)::int as count
     from inventory_items
     where organization_id = $1
       and restaurant_id = $2
       and category_id = $3`,
    [tenant.organization_id, tenant.restaurant_id, categoryId],
  );

  await client.query(
    `delete from inventory_items
     where organization_id = $1
       and restaurant_id = $2
       and id = $3`,
    [tenant.organization_id, tenant.restaurant_id, itemId],
  );
  await client.query(
    `delete from inventory_categories
     where organization_id = $1
       and restaurant_id = $2
       and id = $3`,
    [tenant.organization_id, tenant.restaurant_id, categoryId],
  );

  const dependentCategory = await client.query(
    `select c.id, c.name, count(i.id)::int as item_count
     from inventory_categories c
     join inventory_items i on i.category_id = c.id
     where c.organization_id = $1
       and c.restaurant_id = $2
     group by c.id, c.name
     order by item_count desc
     limit 1`,
    [tenant.organization_id, tenant.restaurant_id],
  );

  const dependentItem = await client.query(
    `select i.id, i.name,
       (select count(*)::int from recipe_ingredients ri where ri.inventory_item_id = i.id and ri.organization_id = i.organization_id and ri.restaurant_id = i.restaurant_id) as recipe_count,
       (select count(*)::int from stock_movements sm where sm.inventory_item_id = i.id and sm.organization_id = i.organization_id and sm.restaurant_id = i.restaurant_id) as movement_count
     from inventory_items i
     where i.organization_id = $1
       and i.restaurant_id = $2
       and (
         exists (select 1 from recipe_ingredients ri where ri.inventory_item_id = i.id and ri.organization_id = i.organization_id and ri.restaurant_id = i.restaurant_id)
         or exists (select 1 from stock_movements sm where sm.inventory_item_id = i.id and sm.organization_id = i.organization_id and sm.restaurant_id = i.restaurant_id)
       )
     limit 1`,
    [tenant.organization_id, tenant.restaurant_id],
  );

  console.table([{
    rollbackHardDeletePath: "passed",
    temporaryCategoryHadItemsBeforeDelete: categoryUsageBeforeDelete.rows[0].count,
    dependentCategoryBlockedByItemCount: dependentCategory.rows[0]?.item_count ?? 0,
    dependentItemWouldDeactivate: Boolean(dependentItem.rows[0]),
    dependentItemRecipeCount: dependentItem.rows[0]?.recipe_count ?? 0,
    dependentItemMovementCount: dependentItem.rows[0]?.movement_count ?? 0,
    rolledBack: true,
  }]);

  await client.query("rollback");
} finally {
  await client.end();
}
