CREATE TABLE IF NOT EXISTS "inventory_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "name" varchar(120) NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "category_id" uuid REFERENCES "inventory_categories"("id");
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "sku" varchar(80);
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "current_quantity" numeric(14, 4);
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "minimum_quantity" numeric(14, 4);
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "cost_per_unit" numeric(12, 4);
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "description" text;

ALTER TABLE "inventory_items" ALTER COLUMN "item_code" SET DEFAULT ('INV-' || substr(gen_random_uuid()::text, 1, 8));
ALTER TABLE "inventory_items" ALTER COLUMN "category" SET DEFAULT 'OTHER';
ALTER TABLE "inventory_items" ALTER COLUMN "current_stock" SET DEFAULT '0';
ALTER TABLE "inventory_items" ALTER COLUMN "minimum_stock" SET DEFAULT '0';
ALTER TABLE "inventory_items" ALTER COLUMN "unit_cost" SET DEFAULT '0';
ALTER TABLE "inventory_items" ALTER COLUMN "unit" TYPE varchar(24) USING lower("unit"::text);

UPDATE "inventory_items"
SET
  "sku" = coalesce("sku", "item_code"),
  "current_quantity" = coalesce("current_quantity", "current_stock"),
  "minimum_quantity" = coalesce("minimum_quantity", "minimum_stock"),
  "cost_per_unit" = coalesce("cost_per_unit", "unit_cost"),
  "description" = coalesce("description", "notes");

INSERT INTO "inventory_categories" ("organization_id", "restaurant_id", "name", "description", "is_active")
SELECT DISTINCT
  item."organization_id",
  item."restaurant_id",
  initcap(replace(lower(item."category"::text), '_', ' ')),
  NULL,
  true
FROM "inventory_items" item
WHERE NOT EXISTS (
  SELECT 1
  FROM "inventory_categories" category
  WHERE category."organization_id" = item."organization_id"
    AND category."restaurant_id" = item."restaurant_id"
    AND lower(category."name") = lower(initcap(replace(lower(item."category"::text), '_', ' ')))
);

UPDATE "inventory_items" item
SET "category_id" = category."id"
FROM "inventory_categories" category
WHERE item."category_id" IS NULL
  AND category."organization_id" = item."organization_id"
  AND category."restaurant_id" = item."restaurant_id"
  AND lower(category."name") = lower(initcap(replace(lower(item."category"::text), '_', ' ')));

ALTER TABLE "inventory_items" ALTER COLUMN "current_quantity" SET DEFAULT '0';
ALTER TABLE "inventory_items" ALTER COLUMN "current_quantity" SET NOT NULL;
ALTER TABLE "inventory_items" ALTER COLUMN "minimum_quantity" SET DEFAULT '0';
ALTER TABLE "inventory_items" ALTER COLUMN "minimum_quantity" SET NOT NULL;

ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "serving_quantity" numeric(12, 4);
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "serving_unit" varchar(40);
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "is_active" boolean;
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "created_by_admin_id" uuid REFERENCES "admins"("id");
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "updated_by_admin_id" uuid REFERENCES "admins"("id");
ALTER TABLE "recipes" ALTER COLUMN "yield_quantity" SET DEFAULT '1';
ALTER TABLE "recipes" ALTER COLUMN "yield_unit" SET DEFAULT 'plate';
ALTER TABLE "recipes" ALTER COLUMN "total_recipe_cost" SET DEFAULT '0';

UPDATE "recipes"
SET
  "serving_quantity" = coalesce("serving_quantity", "yield_quantity", 1),
  "serving_unit" = coalesce("serving_unit", "yield_unit", 'plate'),
  "is_active" = coalesce("is_active", true);

ALTER TABLE "recipes" ALTER COLUMN "serving_quantity" SET DEFAULT '1';
ALTER TABLE "recipes" ALTER COLUMN "serving_quantity" SET NOT NULL;
ALTER TABLE "recipes" ALTER COLUMN "serving_unit" SET DEFAULT 'plate';
ALTER TABLE "recipes" ALTER COLUMN "serving_unit" SET NOT NULL;
ALTER TABLE "recipes" ALTER COLUMN "is_active" SET DEFAULT true;
ALTER TABLE "recipes" ALTER COLUMN "is_active" SET NOT NULL;

ALTER TABLE "recipe_ingredients" ALTER COLUMN "unit" TYPE varchar(24) USING lower("unit"::text);

ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "unit" varchar(24);
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "previous_quantity" numeric(14, 4);
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "new_quantity" numeric(14, 4);
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "reason" text;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "order_id" uuid REFERENCES "orders"("id");
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "order_item_id" uuid REFERENCES "order_items"("id");
ALTER TABLE "stock_movements" ALTER COLUMN "movement_type" TYPE varchar(40) USING "movement_type"::text;
ALTER TABLE "stock_movements" ALTER COLUMN "previous_stock" SET DEFAULT '0';
ALTER TABLE "stock_movements" ALTER COLUMN "new_stock" SET DEFAULT '0';
ALTER TABLE "stock_movements" ALTER COLUMN "unit_cost" SET DEFAULT '0';
ALTER TABLE "stock_movements" ALTER COLUMN "total_cost" SET DEFAULT '0';

UPDATE "stock_movements" movement
SET
  "unit" = coalesce(movement."unit", item."unit"),
  "previous_quantity" = coalesce(movement."previous_quantity", movement."previous_stock"),
  "new_quantity" = coalesce(movement."new_quantity", movement."new_stock"),
  "reason" = coalesce(movement."reason", movement."notes")
FROM "inventory_items" item
WHERE movement."inventory_item_id" = item."id";

ALTER TABLE "stock_movements" ALTER COLUMN "unit" SET DEFAULT 'pcs';
ALTER TABLE "stock_movements" ALTER COLUMN "unit" SET NOT NULL;
ALTER TABLE "stock_movements" ALTER COLUMN "previous_quantity" SET DEFAULT '0';
ALTER TABLE "stock_movements" ALTER COLUMN "previous_quantity" SET NOT NULL;
ALTER TABLE "stock_movements" ALTER COLUMN "new_quantity" SET DEFAULT '0';
ALTER TABLE "stock_movements" ALTER COLUMN "new_quantity" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "order_item_inventory_consumptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "order_id" uuid NOT NULL REFERENCES "orders"("id"),
  "order_item_id" uuid NOT NULL REFERENCES "order_items"("id"),
  "recipe_id" uuid REFERENCES "recipes"("id"),
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "inventory_categories_tenant_idx" ON "inventory_categories" ("organization_id", "restaurant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_categories_restaurant_name_unique" ON "inventory_categories" ("restaurant_id", "name");
CREATE INDEX IF NOT EXISTS "inventory_items_tenant_idx" ON "inventory_items" ("organization_id", "restaurant_id");
CREATE INDEX IF NOT EXISTS "inventory_items_category_new_idx" ON "inventory_items" ("category_id");
CREATE INDEX IF NOT EXISTS "inventory_items_restaurant_name_idx" ON "inventory_items" ("restaurant_id", "name");
CREATE INDEX IF NOT EXISTS "inventory_items_restaurant_sku_idx" ON "inventory_items" ("restaurant_id", "sku");
CREATE INDEX IF NOT EXISTS "recipes_tenant_idx" ON "recipes" ("organization_id", "restaurant_id");
CREATE INDEX IF NOT EXISTS "recipes_menu_item_idx" ON "recipes" ("menu_item_id");
CREATE UNIQUE INDEX IF NOT EXISTS "recipes_active_menu_item_unique" ON "recipes" ("restaurant_id", "menu_item_id", "is_active");
CREATE INDEX IF NOT EXISTS "recipe_ingredients_recipe_new_idx" ON "recipe_ingredients" ("recipe_id");
CREATE INDEX IF NOT EXISTS "recipe_ingredients_inventory_item_new_idx" ON "recipe_ingredients" ("inventory_item_id");
CREATE INDEX IF NOT EXISTS "recipe_ingredients_recipe_item_idx" ON "recipe_ingredients" ("recipe_id", "inventory_item_id");
CREATE INDEX IF NOT EXISTS "stock_movements_tenant_idx" ON "stock_movements" ("organization_id", "restaurant_id");
CREATE INDEX IF NOT EXISTS "stock_movements_item_new_idx" ON "stock_movements" ("inventory_item_id");
CREATE INDEX IF NOT EXISTS "stock_movements_reference_idx" ON "stock_movements" ("reference_type", "reference_id");
CREATE UNIQUE INDEX IF NOT EXISTS "stock_movements_order_item_consumption_unique" ON "stock_movements" ("order_item_id", "inventory_item_id", "movement_type");
CREATE INDEX IF NOT EXISTS "order_item_inventory_consumptions_tenant_idx" ON "order_item_inventory_consumptions" ("organization_id", "restaurant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "order_item_inventory_consumptions_order_item_unique" ON "order_item_inventory_consumptions" ("order_item_id");
