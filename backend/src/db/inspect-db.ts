import { db } from "../config/database.js";
import { restaurants, admins, superAdmins, organizations, subscriptions, licenses } from "./schema/index.js";

async function inspectDb() {
  const superAdminRows = await db.select().from(superAdmins);
  const organizationRows = await db.select().from(organizations);
  const restaurantRows = await db.select().from(restaurants);
  const adminRows = await db.select().from(admins);
  const subscriptionRows = await db.select().from(subscriptions);
  const licenseRows = await db.select().from(licenses);

  console.log("=== NEON DATABASE INSPECTION REPORT ===");
  console.log(`SUPER ADMINS COUNT: ${superAdminRows.length}`);
  console.log(superAdminRows.map((s) => ({ id: s.id, email: s.email, name: s.name, status: s.status })));

  console.log(`\nORGANIZATIONS COUNT: ${organizationRows.length}`);
  console.log(organizationRows.map((o) => ({ id: o.id, name: o.name, email: o.email })));

  console.log(`\nRESTAURANTS COUNT: ${restaurantRows.length}`);
  console.log(restaurantRows.map((r) => ({ id: r.id, name: r.name, email: r.email, publicId: r.publicId })));

  console.log(`\nADMINS COUNT: ${adminRows.length}`);
  console.log(adminRows.map((a) => ({ id: a.id, name: a.fullName, email: a.email, restaurantId: a.restaurantId })));

  console.log(`\nSUBSCRIPTIONS COUNT: ${subscriptionRows.length}`);
  console.log(subscriptionRows.map((sub) => ({ id: sub.id, restaurantId: sub.restaurantId, planId: sub.planId, status: sub.status })));

  console.log(`\nLICENSES COUNT: ${licenseRows.length}`);
  console.log(licenseRows.map((l) => ({ id: l.id, key: l.licenseKey, restaurantId: l.restaurantId })));
  console.log("=======================================");
  process.exit(0);
}

inspectDb().catch(console.error);
