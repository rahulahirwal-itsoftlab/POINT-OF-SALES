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

  const tenant = await client.query(
    `select mi.organization_id, mi.restaurant_id, mc.id as menu_category_id, mi.id as menu_item_id, mi.name as menu_item_name
     from menu_items mi
     join menu_categories mc on mc.id = mi.category_id
     where mi.is_active = true
       and mc.is_active = true
       and not exists (
         select 1
         from recipes r
         where r.menu_item_id = mi.id
           and r.restaurant_id = mi.restaurant_id
           and r.organization_id = mi.organization_id
           and r.is_active = true
       )
     order by mi.created_at desc
     limit 1`,
  );
  const menu = tenant.rows[0];
  if (!menu) {
    console.log("No active menu item without an active recipe is available for a rollback creation test.");
    await client.query("rollback");
    process.exit(0);
  }

  const ingredientRows = await client.query(
    `select id, name, unit
     from inventory_items
     where organization_id = $1
       and restaurant_id = $2
       and is_active = true
     order by updated_at desc
     limit 2`,
    [menu.organization_id, menu.restaurant_id],
  );
  if (!ingredientRows.rows.length) {
    console.log("No active inventory items are available for a rollback creation test.");
    await client.query("rollback");
    process.exit(0);
  }

  const recipeResult = await client.query(
    `insert into recipes (organization_id, restaurant_id, menu_item_id, serving_quantity, serving_unit, is_active)
     values ($1, $2, $3, '1', 'plate', true)
     returning id, menu_item_id`,
    [menu.organization_id, menu.restaurant_id, menu.menu_item_id],
  );
  const recipe = recipeResult.rows[0];

  for (const item of ingredientRows.rows) {
    await client.query(
      `insert into recipe_ingredients (organization_id, restaurant_id, recipe_id, inventory_item_id, quantity, unit)
       values ($1, $2, $3, $4, '1', $5)`,
      [menu.organization_id, menu.restaurant_id, recipe.id, item.id, item.unit],
    );
  }

  const readback = await client.query(
    `select r.id as recipe_id, mi.name as menu_item_name, count(ri.id)::int as ingredient_count
     from recipes r
     join menu_items mi on mi.id = r.menu_item_id
     join recipe_ingredients ri on ri.recipe_id = r.id
     where r.id = $1
       and r.organization_id = $2
       and r.restaurant_id = $3
     group by r.id, mi.name`,
    [recipe.id, menu.organization_id, menu.restaurant_id],
  );

  console.table([{
    menuCategoryId: menu.menu_category_id,
    menuItemId: menu.menu_item_id,
    menuItemName: menu.menu_item_name,
    recipeId: readback.rows[0]?.recipe_id,
    ingredientCount: readback.rows[0]?.ingredient_count,
    rolledBack: true,
  }]);
  await client.query("rollback");
} finally {
  await client.end();
}
