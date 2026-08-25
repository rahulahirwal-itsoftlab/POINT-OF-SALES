import { RevenueRepository } from "./revenue.repository.js";
import type { RevenueQuery } from "./revenue.types.js";

export class RevenueService {
  private readonly repository = new RevenueRepository();

  async getOverview(query: RevenueQuery) {
    return this.repository.getOverview(query);
  }

  async getMonthly(query: RevenueQuery) {
    return this.repository.getMonthlyRevenue(query);
  }

  async getYearly(query: RevenueQuery) {
    return this.repository.getYearlyRevenue(query);
  }
}
