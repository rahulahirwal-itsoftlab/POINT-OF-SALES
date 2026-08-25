import type { Context } from "hono";
import { successResponse } from "../../../common/responses/success-response.js";
import { RevenueService } from "./revenue.service.js";

export class RevenueController {
  private readonly service = new RevenueService();

  async overview(c: Context) {
    const from = c.req.query("from");
    const to = c.req.query("to");
    const data = await this.service.getOverview({ from, to });
    return c.json(successResponse(data, "Revenue overview loaded"));
  }

  async monthly(c: Context) {
    const from = c.req.query("from");
    const to = c.req.query("to");
    const data = await this.service.getMonthly({ from, to });
    return c.json(successResponse(data, "Monthly revenue loaded"));
  }

  async yearly(c: Context) {
    const from = c.req.query("from");
    const to = c.req.query("to");
    const data = await this.service.getYearly({ from, to });
    return c.json(successResponse(data, "Yearly revenue loaded"));
  }
} 
