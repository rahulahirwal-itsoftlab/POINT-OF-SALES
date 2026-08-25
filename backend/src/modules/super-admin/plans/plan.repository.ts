import { and, count, desc, eq, ilike, notIlike, or, sql, type SQL } from "drizzle-orm";
import { db } from "../../../config/database.js";
import { auditLogs, plans } from "../../../db/schema/index.js";
import type { CreatePlanInput, ListPlansQuery, UpdatePlanInput } from "./plan.types.js";

function totalStaffLimit(input: { maxUsers?: number; waiterLimit?: number; kitchenLimit?: number; receptionistLimit?: number }) {
  return input.maxUsers ?? (Number(input.waiterLimit ?? 0) + Number(input.kitchenLimit ?? 0) + Number(input.receptionistLimit ?? 0));
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function nextPlanNumber(tx: Tx) {
  const result = await tx.execute<{ planNumber: string }>(sql`select 'PLAN-' || lpad(nextval('subscription_plan_number_seq')::text, 6, '0') as "planNumber"`);
  const [row] = result.rows;
  return row?.planNumber;
}

export class PlanRepository {
  async list(query: ListPlansQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const filters = [
      eq(plans.planType, "PREDEFINED"),
      notIlike(plans.code, "CUSTOM-%"),
      query.isActive === undefined ? undefined : eq(plans.isActive, query.isActive),
      query.search ? or(ilike(plans.name, `%${query.search}%`), ilike(plans.code, `%${query.search}%`), ilike(plans.planNumber, `%${query.search}%`)) : undefined,
    ].filter((filter): filter is SQL => Boolean(filter));
    const where = filters.length ? and(...filters) : undefined;
    const rows = await db.select().from(plans).where(where).orderBy(desc(plans.createdAt)).limit(limit).offset(offset);
    const [total] = await db.select({ value: count() }).from(plans).where(where);
    return { rows, total: total.value, page, limit };
  }

  async detail(id: string) {
    const [row] = await db.select().from(plans).where(eq(plans.id, id));
    return row;
  }

  async create(input: CreatePlanInput, actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const planNumber = await nextPlanNumber(tx);
      if (!planNumber) throw new Error("Unable to generate subscription plan number");
      const [plan] = await tx
        .insert(plans)
        .values({
          planNumber,
          code: input.code ?? planNumber,
          name: input.name,
          description: input.description,
          planType: "PREDEFINED",
          monthlyPrice: input.monthlyPrice.toFixed(2),
          yearlyPrice: input.yearlyPrice.toFixed(2),
          durationMonths: input.durationMonths,
          gstPercentage: input.gstPercentage.toFixed(2),
          features: input.features,
          maxUsers: totalStaffLimit(input),
          waiterLimit: input.waiterLimit,
          kitchenLimit: input.kitchenLimit,
          receptionistLimit: input.receptionistLimit,
          maxTables: input.maxTables,
          maxMenuItems: input.maxMenuItems,
          isActive: input.isActive ?? true,
        })
        .returning();

      await tx.insert(auditLogs).values({
        actorSuperAdminId,
        actorRole: "SUPER_ADMIN",
        action: "PLAN_CREATED",
        entityType: "subscription_plan",
        entityPublicId: plan.planNumber,
        newValues: { plan: plan.planNumber },
      });

      return plan;
    });
  }

  async update(id: string, input: UpdatePlanInput, actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const [plan] = await tx
        .update(plans)
        .set({
          code: input.code,
          name: input.name,
          description: input.description,
          monthlyPrice: input.monthlyPrice === undefined ? undefined : input.monthlyPrice.toFixed(2),
          yearlyPrice: input.yearlyPrice === undefined ? undefined : input.yearlyPrice.toFixed(2),
          durationMonths: input.durationMonths,
          gstPercentage: input.gstPercentage === undefined ? undefined : input.gstPercentage.toFixed(2),
          features: input.features,
          maxUsers: input.waiterLimit || input.kitchenLimit || input.receptionistLimit ? totalStaffLimit(input) : input.maxUsers,
          waiterLimit: input.waiterLimit,
          kitchenLimit: input.kitchenLimit,
          receptionistLimit: input.receptionistLimit,
          maxTables: input.maxTables,
          maxMenuItems: input.maxMenuItems,
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(eq(plans.id, id))
        .returning();

      if (plan) {
        await tx.insert(auditLogs).values({
          actorSuperAdminId,
          actorRole: "SUPER_ADMIN",
          action: "PLAN_UPDATED",
          entityType: "subscription_plan",
          entityPublicId: plan.planNumber,
          newValues: { plan: plan.planNumber },
        });
      }

      return plan;
    });
  }

  async changeStatus(id: string, isActive: boolean, actorSuperAdminId?: string) {
    return db.transaction(async (tx) => {
      const [plan] = await tx
        .update(plans)
        .set({ isActive, archivedAt: isActive ? null : new Date(), updatedAt: new Date() })
        .where(eq(plans.id, id))
        .returning();

      if (plan) {
        await tx.insert(auditLogs).values({
          actorSuperAdminId,
          actorRole: "SUPER_ADMIN",
          action: isActive ? "PLAN_ACTIVATED" : "PLAN_DEACTIVATED",
          entityType: "subscription_plan",
          entityPublicId: plan.planNumber,
          newValues: { isActive },
        });
      }

      return plan;
    });
  }
}
