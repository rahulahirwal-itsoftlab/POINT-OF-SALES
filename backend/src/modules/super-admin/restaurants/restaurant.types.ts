import type { z } from "zod";
import type {
  createRestaurantSchema,
  listRestaurantsSchema,
  updateRestaurantSchema,
} from "./restaurant.validation.js";

export type ListRestaurantQuery = z.infer<typeof listRestaurantsSchema>;
export type CreateRestaurantRequest = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;

export type CreateRestaurantInput = CreateRestaurantRequest & {
  publicId: string;
  restaurantCode: string;
  adminPublicId: string;
  adminPasswordHash: string;
  licenseKey: string;
};
