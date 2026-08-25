import type { Context } from "hono";
import { successResponse } from "../../../common/responses/success-response.js";
import { validateQuery } from "../../../common/validation/validation.helper.js";
import { requiredId } from "../shared/id-param.js";
import { NotificationService } from "./notification.service.js";
import { listNotificationsSchema } from "./notification.validation.js";

export class NotificationController {
  private readonly service = new NotificationService();

  async list(c: Context) {
    const query = validateQuery(c, listNotificationsSchema);
    const data = await this.service.list(query);
    return c.json(successResponse(data.rows, "Notifications loaded", { total: data.total, page: data.page, limit: data.limit }));
  }

  async detail(c: Context) {
    const data = await this.service.detail(requiredId(c, "notification"));
    return c.json(successResponse(data, "Notification details loaded"));
  }

  async markRead(c: Context) {
    const data = await this.service.markRead(requiredId(c, "notification"));
    return c.json(successResponse(data, "Notification marked as read"));
  }

  async markAllRead(c: Context) {
    const query = validateQuery(c, listNotificationsSchema);
    const count = await this.service.markAllRead(query);
    return c.json(successResponse({ count }, "Notifications marked as read"));
  }
}
