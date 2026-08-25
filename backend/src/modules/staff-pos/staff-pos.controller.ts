import type { Context } from "hono";
import { AppError } from "../../common/errors/app-error.js";
import { successResponse } from "../../common/responses/success-response.js";
import { validateJson, validateQuery } from "../../common/validation/validation.helper.js";
import { dashboardDateRangeQuerySchema } from "../../common/dashboard/date-range.js";
import { StaffPosRepository } from "./staff-pos.repository.js";
import { addOrderItemsSchema, assignTableSchema, createCategorySchema, createMenuItemSchema, createOrderSchema, createTableSchema, listOrdersSchema, orderStatusSchema, paymentSchema, updateMenuItemSchema, updateTableSchema } from "./staff-pos.validation.js";

const allowedMenuImageTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const maxMenuImageSizeBytes = 5 * 1024 * 1024;

type UserContext = {
  id: string;
  role: "RESTAURANT_ADMIN" | "RECEPTION" | "WAITER" | "KITCHEN";
  organizationId?: string;
  restaurantIds?: string[];
};

export class StaffPosController {
  private readonly repository = new StaffPosRepository();

  async dashboard(c: Context) {
    const query = validateQuery(c, dashboardDateRangeQuerySchema);
    return c.json(successResponse(await this.repository.roleDashboard(this.tenant(c), query), "Dashboard loaded"));
  }

  async categories(c: Context) {
    return c.json(successResponse(await this.repository.categories(this.tenant(c)), "Categories loaded"));
  }

  async createCategory(c: Context) {
    const input = await validateJson(c, createCategorySchema);
    return c.json(successResponse(await this.repository.createCategory(this.tenant(c), input), "Category created"), 201);
  }

  async menu(c: Context) {
    return c.json(successResponse(await this.repository.menu(this.tenant(c)), "Menu loaded"));
  }

  async tables(c: Context) {
    return c.json(successResponse(await this.repository.tables(this.tenant(c)), "Tables loaded"));
  }

  async createTable(c: Context) {
    const input = await validateJson(c, createTableSchema);
    return c.json(successResponse(await this.repository.createTable(this.tenant(c), input), "Table created"), 201);
  }

  async tableDetail(c: Context) {
    return c.json(successResponse(await this.repository.tableDetail(this.tenant(c), this.id(c)), "Table loaded"));
  }

  async updateTable(c: Context) {
    const input = await validateJson(c, updateTableSchema);
    return c.json(successResponse(await this.repository.updateTable(this.tenant(c), this.id(c), input), "Table updated"));
  }

  async deleteTable(c: Context) {
    return c.json(successResponse(await this.repository.deleteTable(this.tenant(c), this.id(c)), "Table deleted"));
  }

  async assignTable(c: Context) {
    const input = await validateJson(c, assignTableSchema);
    return c.json(successResponse(await this.repository.assignTable(this.tenant(c), this.id(c), input), "Table assigned"), 201);
  }

  async createMenuItem(c: Context) {
    const input = await validateJson(c, createMenuItemSchema);
    return c.json(successResponse(await this.repository.createMenuItem(this.tenant(c), input), "Menu item created"), 201);
  }

  async updateMenuItem(c: Context) {
    const input = await validateJson(c, updateMenuItemSchema);
    return c.json(successResponse(await this.repository.updateMenuItem(this.tenant(c), this.id(c), input), "Menu item updated"));
  }

  async deleteMenuItem(c: Context) {
    return c.json(successResponse(await this.repository.deleteMenuItem(this.tenant(c), this.id(c)), "Menu item deleted"));
  }

  async orders(c: Context) {
    const query = validateQuery(c, listOrdersSchema);
    const data = await this.repository.listOrders(this.tenant(c), query);
    return c.json(successResponse(data.rows, "Orders loaded", { total: data.total, page: data.page, limit: data.limit }));
  }

  async kitchenOrders(c: Context) {
    const query = validateQuery(c, listOrdersSchema);
    const data = await this.repository.listKitchenOrders(this.tenant(c), query);
    return c.json(successResponse(data.rows, "Kitchen orders loaded", { total: data.total, page: data.page, limit: data.limit }));
  }

  async orderDetail(c: Context) {
    return c.json(successResponse(await this.repository.orderDetail(this.tenant(c), this.id(c)), "Order loaded"));
  }

  async createOrder(c: Context) {
    const input = await validateJson(c, createOrderSchema);
    return c.json(successResponse(await this.repository.createOrder(this.tenant(c), input), "Order created"), 201);
  }

  async addOrderItems(c: Context) {
    const input = await validateJson(c, addOrderItemsSchema);
    return c.json(successResponse(await this.repository.addOrderItems(this.tenant(c), this.id(c), input), "Order items added"), 201);
  }

  async serveOrder(c: Context) {
    return c.json(successResponse(await this.repository.updateOrderStatus(this.tenant(c), this.id(c), "SERVED"), "Order served"));
  }

  async sendToBilling(c: Context) {
    return c.json(successResponse(await this.repository.sendToBilling(this.tenant(c), this.id(c)), "Order sent to billing"), 201);
  }

  async notifications(c: Context) {
    const data = await this.repository.listNotifications(this.tenant(c), validateQuery(c, listOrdersSchema));
    return c.json(successResponse(data.rows, "Notifications loaded", { total: data.total, unread: data.unread, page: data.page, limit: data.limit }));
  }

  async readNotification(c: Context) {
    return c.json(successResponse(await this.repository.readNotification(this.tenant(c), this.id(c)), "Notification marked as read"));
  }

  async readAllNotifications(c: Context) {
    return c.json(successResponse(await this.repository.readAllNotifications(this.tenant(c)), "All notifications marked as read"));
  }

  async updateOrderStatus(c: Context) {
    const input = await validateJson(c, orderStatusSchema);
    return c.json(successResponse(await this.repository.updateOrderStatus(this.tenant(c), this.id(c), input.status), "Order status updated"));
  }

  async bills(c: Context) {
    const data = await this.repository.listBills(this.tenant(c), validateQuery(c, listOrdersSchema));
    return c.json(successResponse(data.rows, "Bills loaded", { total: data.total, page: data.page, limit: data.limit }));
  }

  async billDetail(c: Context) {
    return c.json(successResponse(await this.repository.billDetail(this.tenant(c), this.id(c)), "Bill loaded"));
  }

  async generateBill(c: Context) {
    return c.json(successResponse(await this.repository.generateBill(this.tenant(c), this.id(c)), "Bill generated"), 201);
  }

  async payBill(c: Context) {
    const input = await validateJson(c, paymentSchema);
    return c.json(successResponse(await this.repository.payBill(this.tenant(c), this.id(c), input), "Payment recorded"));
  }

  async uploadMenuImage(c: Context) {
    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Image file is required", 422, "IMAGE_FILE_REQUIRED");
    if (!allowedMenuImageTypes.has(file.type)) {
      throw new AppError(`Invalid menu image type: ${file.type || "unknown"}`, 422, "INVALID_IMAGE", { allowedTypes: Array.from(allowedMenuImageTypes) }, "Only JPG, PNG, and WEBP images are allowed.");
    }
    if (file.size <= 0) throw new AppError("Image file is empty", 422, "INVALID_IMAGE", undefined, "Image file is empty.");
    if (file.size > maxMenuImageSizeBytes) {
      throw new AppError("Menu image is too large", 413, "IMAGE_TOO_LARGE", { maxBytes: maxMenuImageSizeBytes }, "Image size must be less than 5 MB.");
    }
    return c.json(successResponse(await this.repository.uploadMenuImage(this.tenant(c), file, c.get("requestId") as string | undefined), "Image uploaded"));
  }

  private tenant(c: Context) {
    const user = c.get("user") as UserContext | undefined;
    const organization = c.get("organization") as { id?: string } | undefined;
    const restaurant = c.get("restaurant") as { id?: string } | undefined;
    if (!user?.id || !user.role) throw new AppError("Authentication context missing", 401, "AUTHENTICATION_REQUIRED");
    const organizationId = organization?.id ?? user.organizationId;
    const restaurantId = restaurant?.id ?? user.restaurantIds?.[0];
    if (!organizationId || !restaurantId) throw new AppError("Tenant context missing", 403, "TENANT_CONTEXT_MISSING");
    return { organizationId, restaurantId, userId: user.id, role: user.role };
  }

  private id(c: Context) {
    const id = c.req.param("id");
    if (!id) throw new AppError("Id is required", 400, "ID_REQUIRED");
    return id;
  }
}
