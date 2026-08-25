import { AppError } from "../../../common/errors/app-error.js";
import { PlanRepository } from "./plan.repository.js";
import type { CreatePlanInput, ListPlansQuery, UpdatePlanInput } from "./plan.types.js";

export class PlanService {
  private readonly repository = new PlanRepository();

  list(query: ListPlansQuery) {
    return this.repository.list(query);
  }

  async detail(id: string) {
    const plan = await this.repository.detail(id);
    if (!plan) throw new AppError("Plan not found", 404, "PLAN_NOT_FOUND");
    return plan;
  }

  create(input: CreatePlanInput, actorSuperAdminId?: string) {
    return this.repository.create(input, actorSuperAdminId);
  }

  async update(id: string, input: UpdatePlanInput, actorSuperAdminId?: string) {
    const plan = await this.repository.update(id, input, actorSuperAdminId);
    if (!plan) throw new AppError("Plan not found", 404, "PLAN_NOT_FOUND");
    return plan;
  }

  async changeStatus(id: string, isActive: boolean, actorSuperAdminId?: string) {
    const plan = await this.repository.changeStatus(id, isActive, actorSuperAdminId);
    if (!plan) throw new AppError("Plan not found", 404, "PLAN_NOT_FOUND");
    return plan;
  }
}
