ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "code" varchar(64);
UPDATE "restaurants" SET "code" = "public_id" WHERE "code" IS NULL;
ALTER TABLE "restaurants" ALTER COLUMN "code" SET NOT NULL;
DO $$ BEGIN ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_code_unique" UNIQUE("code"); EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "alternate_phone" varchar(32);
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "address_line1" text;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "address_line2" text;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "business_type" varchar(40);
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "cuisine_type" varchar(80);
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "timezone" varchar(64) DEFAULT 'Asia/Kolkata' NOT NULL;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "currency" varchar(8) DEFAULT 'INR' NOT NULL;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "logo" text;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "website" text;

CREATE INDEX IF NOT EXISTS "restaurants_code_idx" ON "restaurants" USING btree ("code");
CREATE INDEX IF NOT EXISTS "restaurants_email_idx" ON "restaurants" USING btree ("email");
