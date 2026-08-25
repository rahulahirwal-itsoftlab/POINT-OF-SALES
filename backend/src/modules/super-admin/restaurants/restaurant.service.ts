import { AppError } from "../../../common/errors/app-error.js";
import { hashPassword } from "../../../common/auth/password.js";
import { createLicenseKey, createPublicId } from "../../../common/utils/id-generator.js";
import { RestaurantRepository } from "./restaurant.repository.js";
import type { CreateRestaurantRequest, ListRestaurantQuery, UpdateRestaurantInput } from "./restaurant.types.js";

export class RestaurantService {
  private readonly repository = new RestaurantRepository();

  list(query: ListRestaurantQuery) {
    return this.repository.list(query);
  }

  async detail(id: string) {
    const data = await this.repository.detail(id);
    if (!data) throw new AppError("Restaurant not found", 404, "RESTAURANT_NOT_FOUND");
    return data;
  }

  async create(input: CreateRestaurantRequest, actorSuperAdminId?: string) {
    if (!input.adminInitialPassword) {
      throw new AppError("Restaurant owner login password is required", 400, "RESTAURANT_OWNER_PASSWORD_REQUIRED");
    }
    const adminPasswordHash = await hashPassword(input.adminInitialPassword);
    const restaurantCode = createPublicId("REST-CODE");

    const result = await this.repository.createTransactional(
      {
        ...input,
        publicId: createPublicId("REST"),
        restaurantCode,
        adminPublicId: createPublicId("RADM"),
        adminPasswordHash,
        licenseKey: createLicenseKey(),
      },
      actorSuperAdminId,
    );

    return result;
  }

  async update(id: string, input: UpdateRestaurantInput) {
    const updated = await this.repository.update(id, input);
    if (!updated) throw new AppError("Restaurant not found", 404, "RESTAURANT_NOT_FOUND");
    return updated;
  }

  async changeStatus(id: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED" | "ARCHIVED", actorSuperAdminId?: string) {
    const updated = await this.repository.changeStatus(id, status, actorSuperAdminId);
    if (!updated) throw new AppError("Restaurant not found", 404, "RESTAURANT_NOT_FOUND");
    return updated;
  }

  delete(id: string, actorSuperAdminId?: string) {
    return this.changeStatus(id, "ARCHIVED", actorSuperAdminId);
  }
}
