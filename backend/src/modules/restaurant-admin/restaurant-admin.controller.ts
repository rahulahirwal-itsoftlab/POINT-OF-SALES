import type { Context } from "hono";
import { AppError } from "../../common/errors/app-error.js";
import { successResponse } from "../../common/responses/success-response.js";
import { validateJson, validateQuery } from "../../common/validation/validation.helper.js";
import { dashboardDateRangeQuerySchema } from "../../common/dashboard/date-range.js";
import { RestaurantAdminService } from "./restaurant-admin.service.js";
import {
  restaurantAdminAuditSchema,
  restaurantAdminBillsSchema,
  restaurantAdminCreateStaffSchema,
  restaurantAdminListStaffSchema,
  restaurantAdminNotificationsSchema,
  restaurantAdminStaffStatusSchema,
  restaurantAdminUpdateStaffSchema,
} from "./restaurant-admin.validation.js";

type UserContext = {
  id?: string;
  role?: string;
  organizationId?: string;
  restaurantIds?: string[];
};

export class RestaurantAdminController {
  private readonly service = new RestaurantAdminService();

  dashboard(c: Context) {
    const query = validateQuery(c, dashboardDateRangeQuerySchema);
    return this.withData(c, () => this.service.dashboard(this.tenant(c), query), "Restaurant dashboard loaded");
  }

  staff(c: Context) {
    const query = validateQuery(c, restaurantAdminListStaffSchema);
    return this.withPagedData(c, () => this.service.listStaff(this.tenant(c), query), "Staff loaded");
  }

  async createStaff(c: Context) {
    const input = await validateJson(c, restaurantAdminCreateStaffSchema);
    const data = await this.service.createStaff(this.tenant(c), input);
    return c.json(successResponse(data, "Staff member created"), 201);
  }

  staffDetail(c: Context) {
    return this.withData(c, () => this.service.getStaff(this.tenant(c), this.id(c, "staff id")), "Staff member loaded");
  }

  async updateStaff(c: Context) {
    const input = await validateJson(c, restaurantAdminUpdateStaffSchema);
    const data = await this.service.updateStaff(this.tenant(c), this.id(c, "staff id"), input);
    return c.json(successResponse(data, "Staff member updated"));
  }

  async changeStaffStatus(c: Context) {
    const input = await validateJson(c, restaurantAdminStaffStatusSchema);
    const data = await this.service.changeStaffStatus(this.tenant(c), this.id(c, "staff id"), input);
    return c.json(successResponse(data, "Staff status updated"));
  }

  bills(c: Context) {
    const query = validateQuery(c, restaurantAdminBillsSchema);
    return this.withPagedData(c, () => this.service.listBills(this.tenant(c), query), "Bills loaded");
  }

  billDetail(c: Context) {
    return this.withData(c, () => this.service.getBill(this.tenant(c), this.id(c, "bill id")), "Bill loaded");
  }

  subscription(c: Context) {
    return this.withData(c, () => this.service.subscription(this.tenant(c)), "Subscription loaded");
  }

  auditLogs(c: Context) {
    const query = validateQuery(c, restaurantAdminAuditSchema);
    return this.withPagedData(c, () => this.service.auditLogs(this.tenant(c), query), "Audit logs loaded");
  }

  activityLogs(c: Context) {
    const query = validateQuery(c, restaurantAdminAuditSchema);
    return this.withPagedData(c, () => this.service.activityLogs(this.tenant(c), query), "Activity logs loaded");
  }

  notifications(c: Context) {
    const query = validateQuery(c, restaurantAdminNotificationsSchema);
    return this.withPagedData(c, () => this.service.notifications(this.tenant(c), query), "Notifications loaded", "unread");
  }

  async readNotification(c: Context) {
    const data = await this.service.markNotificationRead(this.tenant(c), this.id(c, "notification id"));
    return c.json(successResponse(data, "Notification marked as read"));
  }

  async readAllNotifications(c: Context) {
    const data = await this.service.markAllNotificationsRead(this.tenant(c));
    return c.json(successResponse(data, "Notifications marked as read"));
  }

  private tenant(c: Context) {
    const user = c.get("user") as UserContext | undefined;
    const organization = c.get("organization") as { id?: string } | undefined;
    const restaurant = c.get("restaurant") as { id?: string } | undefined;
    const organizationId = organization?.id ?? user?.organizationId;
    const restaurantId = restaurant?.id ?? user?.restaurantIds?.[0];
    if (!organizationId || !restaurantId) throw new AppError("Restaurant tenant context missing", 403, "TENANT_CONTEXT_MISSING");
    return { organizationId, restaurantId, adminId: user?.role === "RESTAURANT_ADMIN" ? user.id : undefined, role: user?.role };
  }

  private id(c: Context, label: string) {
    const id = c.req.param("id");
    if (!id) throw new AppError(`${label} is required`, 400, "ID_REQUIRED");
    return id;
  }

  private async withData<T>(c: Context, load: () => Promise<T>, message: string) {
    return c.json(successResponse(await load(), message));
  }

  private async withPagedData<T extends { rows: unknown[]; total: number; page: number; limit: number } & Record<string, unknown>>(
    c: Context,
    load: () => Promise<T>,
    message: string,
    extraMetaKey?: keyof T,
  ) {
    const data = await load();
    const meta: Record<string, unknown> = { total: data.total, page: data.page, limit: data.limit };
    if (extraMetaKey) meta[extraMetaKey as string] = data[extraMetaKey];
    return c.json(successResponse(data.rows, message, meta));
  }
}
