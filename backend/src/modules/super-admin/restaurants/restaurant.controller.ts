import type { Context } from "hono";
import { AppError } from "../../../common/errors/app-error.js";
import { successResponse } from "../../../common/responses/success-response.js";
import { validateJson, validateQuery } from "../../../common/validation/validation.helper.js";
import { RestaurantService } from "./restaurant.service.js";
import {
  createRestaurantSchema,
  listRestaurantsSchema,
  restaurantStatusSchema,
  updateRestaurantSchema,
} from "./restaurant.validation.js";

export class RestaurantController {
  private readonly service = new RestaurantService();

  async list(c: Context) {
    const query = validateQuery(c, listRestaurantsSchema);
    const data = await this.service.list(query);
    return c.json(successResponse(data.rows, "Restaurants loaded", { total: data.total, page: data.page, limit: data.limit }));
  }

  async detail(c: Context) {
    const id = c.req.param("id");
    if (!id) throw new AppError("Restaurant id is required", 400, "RESTAURANT_ID_REQUIRED");
    const data = await this.service.detail(id);
    return c.json(successResponse(data, "Restaurant details loaded"));
  }

  async create(c: Context) {
    const input = await validateJson(c, createRestaurantSchema);
    const user = c.get("user") as { id?: string } | undefined;
    const data = await this.service.create(input, user?.id);
    return c.json(successResponse(data, "Restaurant created successfully"), 201);
  }

  async update(c: Context) {
    const input = await validateJson(c, updateRestaurantSchema);
    const id = c.req.param("id");
    if (!id) throw new AppError("Restaurant id is required", 400, "RESTAURANT_ID_REQUIRED");
    const data = await this.service.update(id, input);
    return c.json(successResponse(data, "Restaurant updated successfully"));
  }

  async changeStatus(c: Context) {
    const input = await validateJson(c, restaurantStatusSchema);
    const id = c.req.param("id");
    if (!id) throw new AppError("Restaurant id is required", 400, "RESTAURANT_ID_REQUIRED");
    const user = c.get("user") as { id?: string } | undefined;
    const data = await this.service.changeStatus(id, input.status, user?.id);
    return c.json(successResponse(data, "Restaurant status updated successfully"));
  }

  async setStatus(c: Context, status: "ACTIVE" | "INACTIVE" | "BLOCKED") {
    const id = c.req.param("id");
    if (!id) throw new AppError("Restaurant id is required", 400, "RESTAURANT_ID_REQUIRED");
    const user = c.get("user") as { id?: string } | undefined;
    const data = await this.service.changeStatus(id, status, user?.id);
    return c.json(successResponse(data, "Restaurant status updated successfully"));
  }

  async uploadLogo(c: Context) {
    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Image file is required", 422, "IMAGE_FILE_REQUIRED");
    const result = await this.service.uploadLogo(file, c.get("requestId") as string | undefined);
    return c.json(successResponse(result, "Logo uploaded successfully"));
  }

  async delete(c: Context) {
    const id = c.req.param("id");
    if (!id) throw new AppError("Restaurant id is required", 400, "RESTAURANT_ID_REQUIRED");
    const user = c.get("user") as { id?: string } | undefined;
    const data = await this.service.delete(id, user?.id);
    return c.json(successResponse(data, "Restaurant archived successfully"));
  }
}
