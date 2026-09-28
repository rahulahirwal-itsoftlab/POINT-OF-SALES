ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'FRANCHISE_ADMIN';
ALTER TYPE "auth_subject_type" ADD VALUE IF NOT EXISTS 'FRANCHISE_ADMIN';

CREATE TABLE IF NOT EXISTS "franchises" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_id" varchar(32) NOT NULL UNIQUE,
  "code" varchar(64) NOT NULL UNIQUE,
  "name" varchar(160) NOT NULL,
  "email" varchar(160),
  "phone" varchar(32),
  "max_super_admins" integer DEFAULT 10 NOT NULL,
  "status" "organization_status" DEFAULT 'ACTIVE' NOT NULL,
  "license_key" varchar(64) NOT NULL UNIQUE,
  "license_status" "license_status" DEFAULT 'ACTIVE' NOT NULL,
  "license_expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "franchises_code_idx" ON "franchises" ("code");
CREATE INDEX IF NOT EXISTS "franchises_status_idx" ON "franchises" ("status");
CREATE INDEX IF NOT EXISTS "franchises_license_status_idx" ON "franchises" ("license_status");

CREATE TABLE IF NOT EXISTS "franchise_admins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_id" varchar(32) NOT NULL UNIQUE,
  "franchise_id" uuid NOT NULL REFERENCES "franchises"("id"),
  "name" varchar(160) NOT NULL,
  "email" varchar(160) NOT NULL UNIQUE,
  "phone" varchar(32),
  "password_hash" text NOT NULL,
  "role" "user_role" DEFAULT 'FRANCHISE_ADMIN' NOT NULL,
  "status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
  "last_login_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "franchise_admins_franchise_idx" ON "franchise_admins" ("franchise_id");
CREATE INDEX IF NOT EXISTS "franchise_admins_email_idx" ON "franchise_admins" ("email");
CREATE INDEX IF NOT EXISTS "franchise_admins_status_idx" ON "franchise_admins" ("status");

ALTER TABLE "super_admins" ADD COLUMN IF NOT EXISTS "franchise_id" uuid REFERENCES "franchises"("id");
CREATE INDEX IF NOT EXISTS "super_admins_franchise_idx" ON "super_admins" ("franchise_id");
