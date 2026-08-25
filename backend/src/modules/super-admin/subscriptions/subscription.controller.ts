import type { Context } from "hono";
import { successResponse } from "../../../common/responses/success-response.js";
import { validateQuery } from "../../../common/validation/validation.helper.js";
import { requiredId } from "../shared/id-param.js";
import { SubscriptionService } from "./subscription.service.js";
import { createSubscriptionSchema, listSubscriptionsSchema, renewSubscriptionSchema, updateSubscriptionSchema } from "./subscription.validation.js";

export class SubscriptionController {
  private readonly service = new SubscriptionService();

  async list(c: Context) {
    const query = validateQuery(c, listSubscriptionsSchema);
    const data = await this.service.list(query);
    return c.json(successResponse(data.rows, "Subscriptions loaded", { total: data.total, page: data.page, limit: data.limit }));
  }

  async detail(c: Context) {
    const data = await this.service.detail(requiredId(c, "subscription"));
    return c.json(successResponse(data, "Subscription details loaded"));
  }

  async create(c: Context) {
    const body = createSubscriptionSchema.parse(await c.req.json());
    const user = c.get("user") as { id?: string } | undefined;
    const data = await this.service.create(body, user?.id);
    return c.json(successResponse(data, "Subscription created successfully"), 201);
  }

  async update(c: Context) {
    const body = updateSubscriptionSchema.parse(await c.req.json());
    const user = c.get("user") as { id?: string } | undefined;
    const data = await this.service.update(requiredId(c, "subscription"), body, user?.id);
    return c.json(successResponse(data, "Subscription updated successfully"));
  }

  async renew(c: Context) {
    const body = renewSubscriptionSchema.parse(await c.req.json());
    const user = c.get("user") as { id?: string } | undefined;
    const data = await this.service.renew(requiredId(c, "subscription"), body, user?.id);
    return c.json(successResponse(data, "Subscription renewed successfully"));
  }

  async suspend(c: Context) {
    const user = c.get("user") as { id?: string } | undefined;
    const data = await this.service.suspend(requiredId(c, "subscription"), user?.id);
    return c.json(successResponse(data, "Subscription suspended"));
  }

  async cancel(c: Context) {
    const user = c.get("user") as { id?: string } | undefined;
    const data = await this.service.cancel(requiredId(c, "subscription"), user?.id);
    return c.json(successResponse(data, "Subscription cancelled"));
  }

  async reactivate(c: Context) {
    const user = c.get("user") as { id?: string } | undefined;
    const data = await this.service.reactivate(requiredId(c, "subscription"), user?.id);
    return c.json(successResponse(data, "Subscription reactivated"));
  }

  async triggerExpiry(c: Context) {
    const user = c.get("user") as { id?: string } | undefined;
    const count = await this.service.triggerExpiry(user?.id);
    return c.json(successResponse({ expired: count }, "Subscription expiry scan completed"));
  }

  async notifyExpiringSoon(c: Context) {
    const count = await this.service.notifyExpiringSoon();
    return c.json(successResponse({ notifications: count }, "Subscription expiry notification scan completed"));
  }
}
