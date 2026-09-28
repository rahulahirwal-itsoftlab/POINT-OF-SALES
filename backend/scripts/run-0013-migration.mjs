import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const envPath = path.resolve(".env");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
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
  await client.query(`ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'FRANCHISE_ADMIN';`);
  await client.query(`ALTER TYPE "auth_subject_type" ADD VALUE IF NOT EXISTS 'FRANCHISE_ADMIN';`);

  await client.query(`
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
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "franchises_code_idx" ON "franchises" ("code");`);
  await client.query(`CREATE INDEX IF NOT EXISTS "franchises_status_idx" ON "franchises" ("status");`);
  await client.query(`CREATE INDEX IF NOT EXISTS "franchises_license_status_idx" ON "franchises" ("license_status");`);

  await client.query(`
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
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS "franchise_admins_franchise_idx" ON "franchise_admins" ("franchise_id");`);
  await client.query(`CREATE INDEX IF NOT EXISTS "franchise_admins_email_idx" ON "franchise_admins" ("email");`);
  await client.query(`CREATE INDEX IF NOT EXISTS "franchise_admins_status_idx" ON "franchise_admins" ("status");`);

  await client.query(`ALTER TABLE "super_admins" ADD COLUMN IF NOT EXISTS "franchise_id" uuid REFERENCES "franchises"("id");`);
  await client.query(`CREATE INDEX IF NOT EXISTS "super_admins_franchise_idx" ON "super_admins" ("franchise_id");`);

  await client.query(`ALTER TABLE "auth_sessions" ADD COLUMN IF NOT EXISTS "franchise_admin_id" uuid REFERENCES "franchise_admins"("id");`);
  await client.query(`CREATE INDEX IF NOT EXISTS "auth_sessions_franchise_admin_idx" ON "auth_sessions" ("franchise_admin_id");`);

  console.log("Migration 0013_franchise_admin applied successfully!");
} catch (error) {
  console.error("Migration 0013 error:", error);
  process.exit(1);
} finally {
  await client.end();
}
