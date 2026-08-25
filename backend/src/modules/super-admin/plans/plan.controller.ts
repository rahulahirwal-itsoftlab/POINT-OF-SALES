import type { Context } from "hono";
import { AppError } from "../../../common/errors/app-error.js";
import { successResponse } from "../../../common/responses/success-response.js";
import { validateJson, validateQuery } from "../../../common/validation/validation.helper.js";
import { PlanService } from "./plan.service.js";
import { createPlanSchema, listPlansSchema, planStatusSchema, updatePlanSchema } from "./plan.validation.js";

export class PlanController {
  private readonly service = new PlanService();

  async list(c: Context) {
    const query = validateQuery(c, listPlansSchema);
    const data = await this.service.list(query);
    return c.json(successResponse(data.rows, "Plans loaded", { total: data.total, page: data.page, limit: data.limit }));
  }

  async detail(c: Context) {
    const id = c.req.param("id");
    if (!id) throw new AppError("Plan id is required", 400, "PLAN_ID_REQUIRED");
    const data = await this.service.detail(id);
    return c.json(successResponse(data, "Plan details loaded"));
  }

  async create(c: Context) {
    const input = await validateJson(c, createPlanSchema);
    const user = c.get("user") as { id?: string } | undefined;
    const data = await this.service.create(input, user?.id);
    return c.json(successResponse(data, "Plan created successfully"), 201);
  }

  async update(c: Context) {
    const input = await validateJson(c, updatePlanSchema);
    const user = c.get("user") as { id?: string } | undefined;
    const id = c.req.param("id");
    if (!id) throw new AppError("Plan id is required", 400, "PLAN_ID_REQUIRED");
    const data = await this.service.update(id, input, user?.id);
    return c.json(successResponse(data, "Plan updated successfully"));
  }

  async changeStatus(c: Context) {
    const input = await validateJson(c, planStatusSchema);
    const user = c.get("user") as { id?: string } | undefined;
    const id = c.req.param("id");
    if (!id) throw new AppError("Plan id is required", 400, "PLAN_ID_REQUIRED");
    const data = await this.service.changeStatus(id, input.isActive, user?.id);
    return c.json(successResponse(data, "Plan status updated successfully"));
  }
}
