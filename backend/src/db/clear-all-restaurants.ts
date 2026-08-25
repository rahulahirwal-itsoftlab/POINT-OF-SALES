import { db } from "../config/database.js";
import {
  admins,
  auditLogs,
  authSessions,
  licenses,
  loginActivity,
  notifications,
  organizations,
  restaurants,
  subscriptions,
} from "./schema/index.js";
import { inArray } from "drizzle-orm";

async function clearAllRestaurants() {
  console.log("Starting complete cleanup of all restaurant records in Neon PostgreSQL...");

  const allRestaurants = await db.select({ id: restaurants.id, organizationId: restaurants.organizationId, name: restaurants.name, email: restaurants.email }).from(restaurants);

  if (allRestaurants.length === 0) {
    console.log("No restaurants found in database.");
    process.exit(0);
  }

  const allRestaurantIds = allRestaurants.map((r) => r.id);
  const allOrganizationIds = [...new Set(allRestaurants.map((r) => r.organizationId))];

  const allAdmins = await db.select({ id: admins.id }).from(admins).where(inArray(admins.restaurantId, allRestaurantIds));
  const allAdminIds = allAdmins.map((a) => a.id);

  console.log(`Clearing ${allRestaurantIds.length} restaurant tenant(s) and ${allAdminIds.length} admin(s)...`);

  await db.transaction(async (tx) => {
    // 1. Delete notifications
    const delNotif = await tx.delete(notifications).where(inArray(notifications.restaurantId, allRestaurantIds)).returning({ id: notifications.id });
    console.log(`Deleted ${delNotif.length} notification(s).`);

    // 2. Delete audit logs
    const delAudit = await tx.delete(auditLogs).where(inArray(auditLogs.restaurantId, allRestaurantIds)).returning({ id: auditLogs.id });
    console.log(`Deleted ${delAudit.length} audit log(s).`);

    // 3. Delete licenses
    const delLic = await tx.delete(licenses).where(inArray(licenses.restaurantId, allRestaurantIds)).returning({ id: licenses.id });
    console.log(`Deleted ${delLic.length} license(s).`);

    // 4. Delete subscriptions
    const delSub = await tx.delete(subscriptions).where(inArray(subscriptions.restaurantId, allRestaurantIds)).returning({ id: subscriptions.id });
    console.log(`Deleted ${delSub.length} subscription(s).`);

    // 5. Delete login activity
    const delLoginAct = await tx.delete(loginActivity).where(inArray(loginActivity.restaurantId, allRestaurantIds)).returning({ id: loginActivity.id });
    console.log(`Deleted ${delLoginAct.length} login activity record(s).`);

    // 6. Delete auth sessions for non-super-admins
    const delAuthSess = allAdminIds.length
      ? await tx.delete(authSessions).where(inArray(authSessions.adminId, allAdminIds)).returning({ id: authSessions.id })
      : [];
    console.log(`Deleted ${delAuthSess.length} auth session(s).`);

    // 7. Delete admins
    const delAdmins = await tx.delete(admins).where(inArray(admins.restaurantId, allRestaurantIds)).returning({ id: admins.id });
    console.log(`Deleted ${delAdmins.length} admin(s).`);

    // 8. Delete restaurants
    const delRest = await tx.delete(restaurants).where(inArray(restaurants.id, allRestaurantIds)).returning({ id: restaurants.id, name: restaurants.name });
    console.log(`Deleted ${delRest.length} restaurant(s).`);

    // 9. Delete organizations
    const delOrg = await tx.delete(organizations).where(inArray(organizations.id, allOrganizationIds)).returning({ id: organizations.id, name: organizations.name });
    console.log(`Deleted ${delOrg.length} organization(s).`);
  });

  console.log("--------------------------------------------------");
  console.log("RESTAURANT DATA CLEANUP COMPLETED SUCCESSFULLY!");
  console.log("Super admin accounts and plans have been preserved.");
  console.log("--------------------------------------------------");
  process.exit(0);
}

clearAllRestaurants().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
