ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "plan_type" varchar(24) DEFAULT 'PREDEFINED' NOT NULL;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "organization_id" uuid;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "restaurant_id" uuid;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "duration_months" integer DEFAULT 1 NOT NULL;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "gst_percentage" numeric(5, 2) DEFAULT '18' NOT NULL;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "waiter_limit" integer;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "kitchen_limit" integer;
ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "receptionist_limit" integer;

UPDATE "subscription_plans"
SET
  "waiter_limit" = COALESCE("waiter_limit", GREATEST(COALESCE("max_users", 0) - 2, 1)),
  "kitchen_limit" = COALESCE("kitchen_limit", 1),
  "receptionist_limit" = COALESCE("receptionist_limit", 1)
WHERE "waiter_limit" IS NULL OR "kitchen_limit" IS NULL OR "receptionist_limit" IS NULL;

ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "plan_name_snapshot" varchar(120);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "waiter_limit_snapshot" integer;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "kitchen_limit_snapshot" integer;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "receptionist_limit_snapshot" integer;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "base_amount_snapshot" numeric(12, 2);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "gst_percentage_snapshot" numeric(5, 2);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "gst_amount_snapshot" numeric(12, 2);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "final_amount_snapshot" numeric(12, 2);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "duration_months_snapshot" integer;

UPDATE "subscriptions"
SET
  "plan_name_snapshot" = COALESCE("plan_name_snapshot", "subscription_plans"."name"),
  "waiter_limit_snapshot" = COALESCE("waiter_limit_snapshot", "subscription_plans"."waiter_limit"),
  "kitchen_limit_snapshot" = COALESCE("kitchen_limit_snapshot", "subscription_plans"."kitchen_limit"),
  "receptionist_limit_snapshot" = COALESCE("receptionist_limit_snapshot", "subscription_plans"."receptionist_limit"),
  "base_amount_snapshot" = COALESCE("base_amount_snapshot", "subscriptions"."price"),
  "gst_percentage_snapshot" = COALESCE("gst_percentage_snapshot", "subscription_plans"."gst_percentage"),
  "gst_amount_snapshot" = COALESCE("gst_amount_snapshot", 0),
  "final_amount_snapshot" = COALESCE("final_amount_snapshot", "subscriptions"."price"),
  "duration_months_snapshot" = COALESCE("duration_months_snapshot", "subscription_plans"."duration_months")
FROM "subscription_plans"
WHERE "subscriptions"."plan_id" = "subscription_plans"."id";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_organization_id_organizations_id_fk'
  ) THEN
    ALTER TABLE "subscription_plans"
    ADD CONSTRAINT "subscription_plans_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_restaurant_id_restaurants_id_fk'
  ) THEN
    ALTER TABLE "subscription_plans"
    ADD CONSTRAINT "subscription_plans_restaurant_id_restaurants_id_fk"
    FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
