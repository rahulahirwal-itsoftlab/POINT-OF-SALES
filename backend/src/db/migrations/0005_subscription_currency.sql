ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "currency" varchar(8) DEFAULT 'INR' NOT NULL;
