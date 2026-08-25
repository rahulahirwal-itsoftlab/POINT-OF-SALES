import type { Context } from "hono";
import { buildDashboardDateRange, dashboardDateRangeQuerySchema } from "../../../common/dashboard/date-range.js";
import { successResponse } from "../../../common/responses/success-response.js";
import { validateQuery } from "../../../common/validation/validation.helper.js";
import { DashboardService } from "./dashboard.service.js";

export class DashboardController {
  private readonly service = new DashboardService();

  async overview(c: Context) {
    const query = validateQuery(c, dashboardDateRangeQuerySchema);
    const dateRange = buildDashboardDateRange(query, "Asia/Kolkata");
    const data = await this.service.overview(dateRange);
    return c.json(successResponse(data, "Super Admin dashboard loaded"));
  }
} 
