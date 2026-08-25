import { count, eq, and, isNotNull, sql, gte, lte, desc } from "drizzle-orm";
import { db } from "../../../config/database.js";
import { payments } from "../../../db/schema/index.js";
import type { RevenueQuery, RevenueOverview, RevenueChartItem } from "./revenue.types.js";

export class RevenueRepository {
  private getBaseFilters(query?: RevenueQuery) {
    const filters = [isNotNull(payments.subscriptionId)];
    
    if (query?.from) {
      filters.push(gte(payments.createdAt, new Date(query.from)));
    }
    
    if (query?.to) {
      filters.push(lte(payments.createdAt, new Date(query.to)));
    }
    
    return filters;
  }

  async getOverview(query?: RevenueQuery): Promise<RevenueOverview> {
    const filters = this.getBaseFilters(query);
    const where = and(...filters);

    const [totalTransactionsRes] = await db.select({ value: count() }).from(payments).where(where);
    const [successfulTransactionsRes] = await db.select({ value: count() }).from(payments).where(and(where, eq(payments.status, "SUCCESS")));
    const [pendingTransactionsRes] = await db.select({ value: count() }).from(payments).where(and(where, eq(payments.status, "PENDING")));
    const [failedTransactionsRes] = await db.select({ value: count() }).from(payments).where(and(where, eq(payments.status, "FAILED")));

    const successWhere = and(where, eq(payments.status, "SUCCESS"));
    
    const [totalRevenueRes] = await db.select({ total: sql<number>`SUM(CAST(${payments.amount} AS NUMERIC))` })
      .from(payments)
      .where(successWhere);
      
    const [monthlyRevenueRes] = await db.select({ total: sql<number>`SUM(CAST(${payments.amount} AS NUMERIC))` })
      .from(payments)
      .where(and(successWhere, sql`date_trunc('month', ${payments.createdAt}) = date_trunc('month', CURRENT_DATE)`));

    const [yearlyRevenueRes] = await db.select({ total: sql<number>`SUM(CAST(${payments.amount} AS NUMERIC))` })
      .from(payments)
      .where(and(successWhere, sql`date_trunc('year', ${payments.createdAt}) = date_trunc('year', CURRENT_DATE)`));

    return {
      totalRevenue: Number(totalRevenueRes?.total ?? 0),
      monthlyRevenue: Number(monthlyRevenueRes?.total ?? 0),
      yearlyRevenue: Number(yearlyRevenueRes?.total ?? 0),
      totalTransactions: totalTransactionsRes?.value ?? 0,
      successfulTransactions: successfulTransactionsRes?.value ?? 0,
      pendingTransactions: pendingTransactionsRes?.value ?? 0,
      failedTransactions: failedTransactionsRes?.value ?? 0,
    };
  }

  async getMonthlyRevenue(query?: RevenueQuery): Promise<RevenueChartItem[]> {
    const filters = this.getBaseFilters(query);
    const where = and(...filters, eq(payments.status, "SUCCESS"));

    const rows = await db.select({
      period: sql<string>`to_char(date_trunc('month', ${payments.createdAt}), 'YYYY-MM')`,
      revenue: sql<number>`SUM(CAST(${payments.amount} AS NUMERIC))`,
      transactions: count(),
    })
    .from(payments)
    .where(where)
    .groupBy(sql`date_trunc('month', ${payments.createdAt})`)
    .orderBy(desc(sql`date_trunc('month', ${payments.createdAt})`));

    return rows.map((r) => ({
      period: r.period,
      revenue: Number(r.revenue),
      transactions: Number(r.transactions)
    }));
  }

  async getYearlyRevenue(query?: RevenueQuery): Promise<RevenueChartItem[]> {
    const filters = this.getBaseFilters(query);
    const where = and(...filters, eq(payments.status, "SUCCESS"));

    const rows = await db.select({
      period: sql<string>`to_char(date_trunc('year', ${payments.createdAt}), 'YYYY')`,
      revenue: sql<number>`SUM(CAST(${payments.amount} AS NUMERIC))`,
      transactions: count(),
    })
    .from(payments)
    .where(where)
    .groupBy(sql`date_trunc('year', ${payments.createdAt})`)
    .orderBy(desc(sql`date_trunc('year', ${payments.createdAt})`));

    return rows.map((r) => ({
      period: r.period,
      revenue: Number(r.revenue),
      transactions: Number(r.transactions)
    }));
  }
}
