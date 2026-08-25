import type { DashboardDateRange } from "../../../common/dashboard/date-range.js";
import { DashboardRepository } from "./dashboard.repository.js";

export class DashboardService {
  private readonly repository = new DashboardRepository();

  async overview(dateRange: DashboardDateRange) {
    return this.repository.getOverview(dateRange);
  }
} 
