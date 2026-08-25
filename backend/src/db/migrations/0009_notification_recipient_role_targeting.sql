ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipient_role" varchar(60);

CREATE INDEX IF NOT EXISTS "notifications_restaurant_idx" ON "notifications" USING btree ("restaurant_id");
CREATE INDEX IF NOT EXISTS "notifications_recipient_employee_idx" ON "notifications" USING btree ("recipient_employee_id");
CREATE INDEX IF NOT EXISTS "notifications_recipient_admin_idx" ON "notifications" USING btree ("recipient_admin_id");
CREATE INDEX IF NOT EXISTS "notifications_recipient_super_admin_idx" ON "notifications" USING btree ("recipient_super_admin_id");
CREATE INDEX IF NOT EXISTS "notifications_recipient_role_idx" ON "notifications" USING btree ("recipient_role");
CREATE INDEX IF NOT EXISTS "notifications_restaurant_recipient_role_idx" ON "notifications" USING btree ("restaurant_id", "recipient_role");

-- Backfill recipient_role for known operational notification types on existing records
UPDATE "notifications" SET "recipient_role" = 'KITCHEN' WHERE "type" IN ('KITCHEN_NEW_ORDER', 'KITCHEN_ORDER_ITEMS_ADDED') AND "recipient_role" IS NULL;
UPDATE "notifications" SET "recipient_role" = 'RECEPTION' WHERE "type" IN ('BILL_SENT', 'NEW_BILL') AND "recipient_role" IS NULL;
UPDATE "notifications" SET "recipient_role" = 'RESTAURANT_ADMIN' WHERE "type" LIKE 'STAFF_%' OR "type" LIKE 'SUBSCRIPTION_%' AND "recipient_role" IS NULL AND "restaurant_id" IS NOT NULL AND "recipient_admin_id" IS NULL;
UPDATE "notifications" SET "recipient_role" = 'SUPER_ADMIN' WHERE "type" IN ('RESTAURANT_CREATED', 'LICENSE_CREATED') AND "recipient_role" IS NULL AND "recipient_admin_id" IS NULL AND "recipient_employee_id" IS NULL;
