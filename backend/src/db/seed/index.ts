import { db } from "../../config/database.js";
import { env } from "../../config/env.js";
import { logger } from "../../common/logger/logger.js";
import { hashPassword } from "../../common/auth/password.js";
import { createPublicId } from "../../common/utils/id-generator.js";
import { plans, superAdmins } from "../schema/index.js";

async function seedSuperAdmin() {
  if (!env.SUPER_ADMIN_EMAIL || !env.SUPER_ADMIN_PASSWORD) {
    throw new Error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required for seeding.");
  }
  const superAdminEmail = env.SUPER_ADMIN_EMAIL.trim().toLowerCase();
  const superAdminPassword = env.SUPER_ADMIN_PASSWORD;

  await db.transaction(async (tx) => {
    const passwordHash = await hashPassword(superAdminPassword);

    await tx
      .insert(superAdmins)
      .values({
        publicId: createPublicId("SAD"),
        name: env.SUPER_ADMIN_NAME || "Super Admin",
        email: superAdminEmail,
        passwordHash,
        status: "ACTIVE",
      })
      .onConflictDoUpdate({
        target: superAdmins.email,
        set: {
          name: env.SUPER_ADMIN_NAME || "Super Admin",
          passwordHash,
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      });

    const defaultPlans = [
      {
        code: "MONTHLY_STARTER",
        name: "Monthly Starter",
        description: "Starter monthly POS plan for development and small restaurants.",
        monthlyPrice: "999.00",
        yearlyPrice: "9999.00",
        features: ["POS", "Menu", "Orders", "Billing"],
        maxUsers: 10,
        maxTables: 25,
        maxMenuItems: 200,
      },
      {
        code: "YEARLY_GROWTH",
        name: "Yearly Growth",
        description: "Growth plan with yearly billing.",
        monthlyPrice: "1999.00",
        yearlyPrice: "19999.00",
        features: ["POS", "Menu", "Orders", "Billing", "Kitchen", "Reports"],
        maxUsers: 30,
        maxTables: 75,
        maxMenuItems: 1000,
      },
    ];

    for (const plan of defaultPlans) {
      await tx
        .insert(plans)
        .values(plan)
        .onConflictDoUpdate({
          target: plans.code,
          set: {
            name: plan.name,
            description: plan.description,
            monthlyPrice: plan.monthlyPrice,
            yearlyPrice: plan.yearlyPrice,
            features: plan.features,
            maxUsers: plan.maxUsers,
            maxTables: plan.maxTables,
            maxMenuItems: plan.maxMenuItems,
            updatedAt: new Date(),
          },
        });
    }
  });
}

seedSuperAdmin()
  .then(() => {
    logger.info({ email: env.SUPER_ADMIN_EMAIL }, "Super Admin seed completed");
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ error }, "Super Admin seed failed");
    process.exit(1);
  });
