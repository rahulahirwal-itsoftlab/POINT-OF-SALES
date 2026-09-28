import { db } from "../../config/database.js";
import { logger } from "../../common/logger/logger.js";
import { hashPassword } from "../../common/auth/password.js";
import { createPublicId } from "../../common/utils/id-generator.js";
import { franchiseAdmins, franchises, plans } from "../schema/index.js";
import { eq } from "drizzle-orm";

async function seedFranchiseAdmin() {
  const franchiseAdminEmail = "admin.pos@gmail.com";
  const franchiseAdminPassword = "Admin@1234";

  await db.transaction(async (tx) => {
    // 1. Ensure primary franchise exists
    let [franchise] = await tx
      .select()
      .from(franchises)
      .where(eq(franchises.code, "FRAN-001"))
      .limit(1);

    if (!franchise) {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      [franchise] = await tx
        .insert(franchises)
        .values({
          publicId: createPublicId("FRA"),
          code: "FRAN-001",
          name: "Primary POS Franchise",
          email: "franchise@pos.com",
          phone: "+919876543210",
          maxSuperAdmins: 10,
          status: "ACTIVE",
          licenseKey: `LIC-FRAN-${Date.now().toString(36).toUpperCase()}`,
          licenseStatus: "ACTIVE",
          licenseExpiresAt: oneYearFromNow,
        })
        .returning();
    }

    // 2. Seed initial Franchise Admin (admin.pos@gmail.com)
    const passwordHash = await hashPassword(franchiseAdminPassword);

    await tx
      .insert(franchiseAdmins)
      .values({
        publicId: createPublicId("FAD"),
        franchiseId: franchise.id,
        name: "Franchise Steward",
        email: franchiseAdminEmail,
        passwordHash,
        role: "FRANCHISE_STEWARD",
        status: "ACTIVE",
      })
      .onConflictDoUpdate({
        target: franchiseAdmins.email,
        set: {
          name: "Franchise Steward",
          passwordHash,
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      });

    // 3. Seed default subscription plans
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

seedFranchiseAdmin()
  .then(() => {
    logger.info({ email: "admin.pos@gmail.com" }, "Franchise Steward seed completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ error }, "Franchise Steward seed failed");
    process.exit(1);
  });
