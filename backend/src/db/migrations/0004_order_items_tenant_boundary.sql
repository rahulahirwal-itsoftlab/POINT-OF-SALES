ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "restaurant_id" uuid;
--> statement-breakpoint
UPDATE "order_items"
SET
  "organization_id" = "orders"."organization_id",
  "restaurant_id" = "orders"."restaurant_id"
FROM "orders"
WHERE "order_items"."order_id" = "orders"."id"
  AND ("order_items"."organization_id" IS NULL OR "order_items"."restaurant_id" IS NULL);
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "restaurant_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "order_items" ADD CONSTRAINT "order_items_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_organization_idx" ON "order_items" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_restaurant_idx" ON "order_items" USING btree ("restaurant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_idx" ON "order_items" USING btree ("order_id");
