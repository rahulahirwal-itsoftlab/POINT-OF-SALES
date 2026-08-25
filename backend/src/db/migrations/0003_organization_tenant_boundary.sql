DO $$ BEGIN
  CREATE TYPE "organization_status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLOCKED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_id" varchar(32) NOT NULL UNIQUE,
  "name" varchar(160) NOT NULL,
  "email" varchar(160),
  "phone" varchar(32),
  "status" "organization_status" DEFAULT 'ACTIVE' NOT NULL,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_status_idx" ON "organizations" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organizations_created_at_idx" ON "organizations" USING btree ("created_at");
--> statement-breakpoint
INSERT INTO "organizations" ("public_id", "name", "email", "phone", "status", "archived_at", "created_at", "updated_at")
SELECT
  'ORG_' || substr(replace("id"::text, '-', ''), 1, 24),
  "name",
  "email",
  "phone",
  CASE
    WHEN "status"::text IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLOCKED', 'ARCHIVED') THEN "status"::text::organization_status
    ELSE 'ACTIVE'::organization_status
  END,
  "archived_at",
  "created_at",
  "updated_at"
FROM "restaurants"
WHERE NOT EXISTS (
  SELECT 1 FROM "organizations" WHERE "organizations"."public_id" = 'ORG_' || substr(replace("restaurants"."id"::text, '-', ''), 1, 24)
);
--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "restaurants"
SET "organization_id" = "organizations"."id"
FROM "organizations"
WHERE "restaurants"."organization_id" IS NULL
  AND "organizations"."public_id" = 'ORG_' || substr(replace("restaurants"."id"::text, '-', ''), 1, 24);
--> statement-breakpoint
ALTER TABLE "restaurants" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "restaurants_organization_idx" ON "restaurants" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "admins" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "admins"."organization_id" IS NULL AND "admins"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "admins" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "admins" ADD CONSTRAINT "admins_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admins_organization_idx" ON "admins" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "employees" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "employees"."organization_id" IS NULL AND "employees"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_organization_idx" ON "employees" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "subscriptions" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "subscriptions"."organization_id" IS NULL AND "subscriptions"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_organization_idx" ON "subscriptions" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "licenses" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "licenses"."organization_id" IS NULL AND "licenses"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "licenses" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "licenses" ADD CONSTRAINT "licenses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "licenses_organization_idx" ON "licenses" USING btree ("organization_id");
--> statement-breakpoint
ALTER TABLE "menu_categories" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "menu_categories" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "menu_categories"."organization_id" IS NULL AND "menu_categories"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "menu_categories" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "menu_items" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "menu_items"."organization_id" IS NULL AND "menu_items"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "menu_items" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "restaurant_tables" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "restaurant_tables"."organization_id" IS NULL AND "restaurant_tables"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "restaurant_tables" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "customers" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "customers"."organization_id" IS NULL AND "customers"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "orders" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "orders"."organization_id" IS NULL AND "orders"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "bills" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "bills"."organization_id" IS NULL AND "bills"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "bills" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "payments" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "payments"."organization_id" IS NULL AND "payments"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "audit_logs" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "audit_logs"."organization_id" IS NULL AND "audit_logs"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "login_activity" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "login_activity" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "login_activity"."organization_id" IS NULL AND "login_activity"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "notifications" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "notifications"."organization_id" IS NULL AND "notifications"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "admin_invitations" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
UPDATE "admin_invitations" SET "organization_id" = "restaurants"."organization_id" FROM "restaurants" WHERE "admin_invitations"."organization_id" IS NULL AND "admin_invitations"."restaurant_id" = "restaurants"."id";
--> statement-breakpoint
ALTER TABLE "admin_invitations" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_organization_idx" ON "audit_logs" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_organization_idx" ON "notifications" USING btree ("organization_id");
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "orders" ADD CONSTRAINT "orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "bills" ADD CONSTRAINT "bills_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "login_activity" ADD CONSTRAINT "login_activity_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id"); EXCEPTION WHEN duplicate_object THEN null; END $$;
