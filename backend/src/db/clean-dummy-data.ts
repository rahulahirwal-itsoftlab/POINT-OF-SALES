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
import { inArray, or, ilike } from "drizzle-orm";

async function cleanDummyData() {
  console.log("Starting safe cleanup of test/dummy records in Neon PostgreSQL...");

  // Find test restaurants by email or test domain pattern
  const testRestaurantRows = await db
    .select({ id: restaurants.id, organizationId: restaurants.organizationId, name: restaurants.name, email: restaurants.email })
    .from(restaurants)
    .where(
      or(
        ilike(restaurants.email, "%@example.com"),
        ilike(restaurants.email, "%@test.com"),
        ilike(restaurants.email, "contact@veronapizza.com"),
        ilike(restaurants.email, "contact@grandfeast.com"),
      ),
    );

  if (testRestaurantRows.length === 0) {
    console.log("No test records found to clean up.");
    process.exit(0);
  }

  const testRestaurantIds = testRestaurantRows.map((r) => r.id);
  const testOrganizationIds = [...new Set(testRestaurantRows.map((r) => r.organizationId))];

  // Find test admins
  const testAdminRows = await db
    .select({ id: admins.id })
    .from(admins)
    .where(inArray(admins.restaurantId, testRestaurantIds));
  const testAdminIds = testAdminRows.map((a) => a.id);

  console.log(`Found ${testRestaurantIds.length} test restaurant(s) and ${testAdminIds.length} test admin(s) to remove:`);
  console.log(testRestaurantRows.map((r) => ({ id: r.id, name: r.name, email: r.email })));

  await db.transaction(async (tx) => {
    // 1. Delete notifications
    const deletedNotifications = await tx
      .delete(notifications)
      .where(inArray(notifications.restaurantId, testRestaurantIds))
      .returning({ id: notifications.id });
    console.log(`Deleted ${deletedNotifications.length} notification record(s).`);

    // 2. Delete audit logs
    const deletedAuditLogs = await tx
      .delete(auditLogs)
      .where(inArray(auditLogs.restaurantId, testRestaurantIds))
      .returning({ id: auditLogs.id });
    console.log(`Deleted ${deletedAuditLogs.length} audit log record(s).`);

    // 3. Delete licenses
    const deletedLicenses = await tx
      .delete(licenses)
      .where(inArray(licenses.restaurantId, testRestaurantIds))
      .returning({ id: licenses.id });
    console.log(`Deleted ${deletedLicenses.length} license record(s).`);

    // 4. Delete subscriptions
    const deletedSubscriptions = await tx
      .delete(subscriptions)
      .where(inArray(subscriptions.restaurantId, testRestaurantIds))
      .returning({ id: subscriptions.id });
    console.log(`Deleted ${deletedSubscriptions.length} subscription record(s).`);

    // 5. Delete login activity for test admins
    if (testAdminIds.length > 0) {
      const deletedLoginActivity = await tx
        .delete(loginActivity)
        .where(inArray(loginActivity.adminId, testAdminIds))
        .returning({ id: loginActivity.id });
      console.log(`Deleted ${deletedLoginActivity.length} login activity record(s).`);

      // 6. Delete auth sessions for test admins
      const deletedAuthSessions = await tx
        .delete(authSessions)
        .where(inArray(authSessions.adminId, testAdminIds))
        .returning({ id: authSessions.id });
      console.log(`Deleted ${deletedAuthSessions.length} auth session record(s).`);
    }

    // 7. Delete admins
    const deletedAdmins = await tx
      .delete(admins)
      .where(inArray(admins.restaurantId, testRestaurantIds))
      .returning({ id: admins.id });
    console.log(`Deleted ${deletedAdmins.length} admin record(s).`);

    // 8. Delete restaurants
    const deletedRestaurants = await tx
      .delete(restaurants)
      .where(inArray(restaurants.id, testRestaurantIds))
      .returning({ id: restaurants.id, name: restaurants.name });
    console.log(`Deleted ${deletedRestaurants.length} restaurant record(s).`);

    // 9. Delete organizations
    const deletedOrganizations = await tx
      .delete(organizations)
      .where(inArray(organizations.id, testOrganizationIds))
      .returning({ id: organizations.id, name: organizations.name });
    console.log(`Deleted ${deletedOrganizations.length} organization record(s).`);
  });

  console.log("--------------------------------------------------");
  console.log("SAFE CLEANUP COMPLETED SUCCESSFULLY!");
  console.log("--------------------------------------------------");
  process.exit(0);
}

cleanDummyData().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
