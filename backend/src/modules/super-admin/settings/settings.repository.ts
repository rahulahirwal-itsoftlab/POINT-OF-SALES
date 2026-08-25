import { db } from "../../../config/database.js";
import { auditLogs, notifications, platformSettings } from "../../../db/schema/index.js";
import type { UpdateSettingBody } from "./settings.types.js";

export class SettingsRepository {
  async get() {
    const rows = await db.select().from(platformSettings).limit(1);
    return rows[0] || null;
  }

  async update(body: UpdateSettingBody, actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const existingRows = await tx.select().from(platformSettings).limit(1);
      const existing = existingRows[0] ?? null;

      if (!existing) {
      const [row] = await tx
        .insert(platformSettings)
        .values({
          ...body,
          defaultMonthlyPrice: body.defaultMonthlyPrice?.toString(),
          defaultYearlyPrice: body.defaultYearlyPrice?.toString(),
          updatedBySuperAdminId: actorSuperAdminId,
        })
        .returning();
        if (actorSuperAdminId) {
          await tx.insert(auditLogs).values({
            actorSuperAdminId,
            actorRole: "SUPER_ADMIN",
            action: "PLATFORM_SETTINGS_UPDATED",
            module: "SETTINGS",
            entityType: "platform_settings",
            entityId: row.id,
            entityPublicId: row.id,
            newValues: body as Record<string, unknown>,
          });
        }
        await tx.insert(notifications).values({
          scope: "SYSTEM",
          type: "PLATFORM_SETTINGS_UPDATED",
          title: "Platform settings updated",
          message: "Platform settings were updated.",
          entityType: "platform_settings",
          entityId: row.id,
          dedupeKey: `platform_settings:${row.id}:${row.updatedAt.toISOString()}`,
        }).onConflictDoNothing();
      return row;
    }

    const [row] = await tx
      .update(platformSettings)
      .set({
        ...body,
        defaultMonthlyPrice: body.defaultMonthlyPrice?.toString(),
        defaultYearlyPrice: body.defaultYearlyPrice?.toString(),
        updatedBySuperAdminId: actorSuperAdminId,
        updatedAt: new Date(),
      })
      .returning();
      if (actorSuperAdminId) {
        await tx.insert(auditLogs).values({
          actorSuperAdminId,
          actorRole: "SUPER_ADMIN",
          action: "PLATFORM_SETTINGS_UPDATED",
          module: "SETTINGS",
          entityType: "platform_settings",
          entityId: row.id,
          entityPublicId: row.id,
          oldValues: existing as Record<string, unknown>,
          newValues: body as Record<string, unknown>,
        });
      }
      await tx.insert(notifications).values({
        scope: "SYSTEM",
        type: "PLATFORM_SETTINGS_UPDATED",
        title: "Platform settings updated",
        message: "Platform settings were updated.",
        entityType: "platform_settings",
        entityId: row.id,
        dedupeKey: `platform_settings:${row.id}:${row.updatedAt.toISOString()}`,
      }).onConflictDoNothing();
    return row;
    });
  }
}
