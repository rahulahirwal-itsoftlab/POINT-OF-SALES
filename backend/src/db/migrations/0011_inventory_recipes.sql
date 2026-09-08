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

CREATE TABLE IF NOT EXISTS "inventory_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "category_id" uuid NOT NULL REFERENCES "inventory_categories"("id"),
  "name" varchar(160) NOT NULL,
  "sku" varchar(80),
  "unit" varchar(24) NOT NULL,
  "current_quantity" numeric(14, 4) DEFAULT '0' NOT NULL,
  "minimum_quantity" numeric(14, 4) DEFAULT '0' NOT NULL,
  "cost_per_unit" numeric(12, 4),
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "menu_item_id" uuid NOT NULL REFERENCES "menu_items"("id"),
  "serving_quantity" numeric(12, 4) DEFAULT '1' NOT NULL,
  "serving_unit" varchar(40) DEFAULT 'plate' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by_admin_id" uuid REFERENCES "admins"("id"),
  "updated_by_admin_id" uuid REFERENCES "admins"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipe_ingredients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipe_id" uuid NOT NULL REFERENCES "recipes"("id"),
  "inventory_item_id" uuid NOT NULL REFERENCES "inventory_items"("id"),
  "quantity" numeric(14, 4) NOT NULL,
  "unit" varchar(24) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "inventory_item_id" uuid NOT NULL REFERENCES "inventory_items"("id"),
  "movement_type" varchar(40) NOT NULL,
  "quantity" numeric(14, 4) NOT NULL,
  "unit" varchar(24) NOT NULL,
  "previous_quantity" numeric(14, 4) NOT NULL,
  "new_quantity" numeric(14, 4) NOT NULL,
  "reason" text,
  "reference_type" varchar(80),
  "reference_id" uuid,
  "order_id" uuid REFERENCES "orders"("id"),
  "order_item_id" uuid REFERENCES "order_items"("id"),
  "performed_by_admin_id" uuid REFERENCES "admins"("id"),
  "performed_by_employee_id" uuid REFERENCES "employees"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

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
CREATE INDEX IF NOT EXISTS "inventory_items_category_idx" ON "inventory_items" ("category_id");
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_restaurant_name_unique" ON "inventory_items" ("restaurant_id", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_restaurant_sku_unique" ON "inventory_items" ("restaurant_id", "sku");
CREATE INDEX IF NOT EXISTS "recipes_tenant_idx" ON "recipes" ("organization_id", "restaurant_id");
CREATE INDEX IF NOT EXISTS "recipes_menu_item_idx" ON "recipes" ("menu_item_id");
CREATE UNIQUE INDEX IF NOT EXISTS "recipes_active_menu_item_unique" ON "recipes" ("restaurant_id", "menu_item_id", "is_active");
CREATE INDEX IF NOT EXISTS "recipe_ingredients_recipe_idx" ON "recipe_ingredients" ("recipe_id");
CREATE INDEX IF NOT EXISTS "recipe_ingredients_inventory_item_idx" ON "recipe_ingredients" ("inventory_item_id");
CREATE UNIQUE INDEX IF NOT EXISTS "recipe_ingredients_recipe_item_unique" ON "recipe_ingredients" ("recipe_id", "inventory_item_id");
CREATE INDEX IF NOT EXISTS "stock_movements_tenant_idx" ON "stock_movements" ("organization_id", "restaurant_id");
CREATE INDEX IF NOT EXISTS "stock_movements_item_idx" ON "stock_movements" ("inventory_item_id");
CREATE INDEX IF NOT EXISTS "stock_movements_reference_idx" ON "stock_movements" ("reference_type", "reference_id");
CREATE UNIQUE INDEX IF NOT EXISTS "stock_movements_order_item_consumption_unique" ON "stock_movements" ("order_item_id", "inventory_item_id", "movement_type");
CREATE INDEX IF NOT EXISTS "order_item_inventory_consumptions_tenant_idx" ON "order_item_inventory_consumptions" ("organization_id", "restaurant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "order_item_inventory_consumptions_order_item_unique" ON "order_item_inventory_consumptions" ("order_item_id");
