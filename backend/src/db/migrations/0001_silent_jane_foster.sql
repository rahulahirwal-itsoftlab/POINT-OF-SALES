CREATE TABLE IF NOT EXISTS "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_name" varchar(160) DEFAULT 'POS System' NOT NULL,
	"support_email" varchar(160),
	"support_phone" varchar(32),
	"default_currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"default_timezone" varchar(64) DEFAULT 'Asia/Kolkata' NOT NULL,
	"license_warning_days" integer DEFAULT 7 NOT NULL,
	"default_monthly_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"default_yearly_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"maintenance_mode" boolean DEFAULT false NOT NULL,
	"updated_by_super_admin_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_super_admin_id_super_admins_id_fk" FOREIGN KEY ("updated_by_super_admin_id") REFERENCES "public"."super_admins"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
