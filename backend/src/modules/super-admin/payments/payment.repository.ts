import { and, count, desc, eq, ilike, or, isNotNull, gte, lte, type SQL } from "drizzle-orm";
import { db } from "../../../config/database.js";
import { payments, restaurants, subscriptions } from "../../../db/schema/index.js";
import type { ListPaymentsQuery } from "./payment.types.js";

export class PaymentRepository {
  async list(query: ListPaymentsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const filters = [
      query.status ? eq(payments.status, query.status) : undefined,
      query.method ? eq(payments.method, query.method) : undefined,
      query.restaurantId ? eq(payments.restaurantId, query.restaurantId) : undefined,
      query.from ? gte(payments.createdAt, new Date(query.from)) : undefined,
      query.to ? lte(payments.createdAt, new Date(query.to)) : undefined,
      isNotNull(payments.subscriptionId), // SaaS payments only
      query.search
        ? or(ilike(payments.transactionReference, `%${query.search}%`), ilike(restaurants.name, `%${query.search}%`))
        : undefined,
    ].filter((filter): filter is SQL => Boolean(filter));
    const where = filters.length ? and(...filters) : undefined;

    const rows = await db
      .select({ payment: payments, restaurant: restaurants, subscription: subscriptions })
      .from(payments)
      .innerJoin(restaurants, eq(payments.restaurantId, restaurants.id))
      .leftJoin(subscriptions, eq(payments.subscriptionId, subscriptions.id))
      .where(where)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);
    const [total] = await db
      .select({ value: count() })
      .from(payments)
      .innerJoin(restaurants, eq(payments.restaurantId, restaurants.id))
      .where(where);

    return { rows, total: total.value, page, limit };
  }

  async detail(id: string) {
    const [row] = await db
      .select({ payment: payments, restaurant: restaurants, subscription: subscriptions })
      .from(payments)
      .innerJoin(restaurants, eq(payments.restaurantId, restaurants.id))
      .leftJoin(subscriptions, eq(payments.subscriptionId, subscriptions.id))
      .where(eq(payments.id, id));
    return row;
  }
}
