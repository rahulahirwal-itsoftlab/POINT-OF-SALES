import { eq, sql } from "drizzle-orm";
import { db } from "../../../config/database.js";
import { superAdmins } from "../../../db/schema/index.js";

export class ProfileRepository {
  async me(superAdminId: string) {
    const [row] = await db
      .select({
        id: superAdmins.publicId,
        name: superAdmins.name,
        email: superAdmins.email,
        phone: superAdmins.phone,
        status: superAdmins.status,
        role: sql<"SUPER_ADMIN">`'SUPER_ADMIN'`,
        lastLoginAt: superAdmins.lastLoginAt,
        createdAt: superAdmins.createdAt,
      })
      .from(superAdmins)
      .where(eq(superAdmins.id, superAdminId));
    return row;
  }
}
