CREATE SEQUENCE IF NOT EXISTS "subscription_plan_number_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER TABLE "subscription_plans" ADD COLUMN IF NOT EXISTS "plan_number" varchar(32);

UPDATE "subscription_plans"
SET "plan_number" = 'PLAN-' || lpad(nextval('"subscription_plan_number_seq"')::text, 6, '0')
WHERE "plan_number" IS NULL;

ALTER TABLE "subscription_plans" ALTER COLUMN "plan_number" SET NOT NULL;
ALTER TABLE "subscription_plans" ALTER COLUMN "plan_number" SET DEFAULT ('PLAN-' || lpad(nextval('"subscription_plan_number_seq"')::text, 6, '0'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_plan_number_unique'
  ) THEN
    ALTER TABLE "subscription_plans"
    ADD CONSTRAINT "subscription_plans_plan_number_unique" UNIQUE ("plan_number");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "subscription_plans_plan_number_idx" ON "subscription_plans" USING btree ("plan_number");
