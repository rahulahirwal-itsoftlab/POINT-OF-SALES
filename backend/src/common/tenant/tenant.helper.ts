import { AppError } from "../errors/app-error.js";

export function assertTenantAccess(userRestaurantIds: string[], requestedRestaurantId: string) {
  if (!userRestaurantIds.includes(requestedRestaurantId)) {
    throw new AppError("Tenant access denied", 403, "TENANT_ACCESS_DENIED");
  }
}

export function assertOrganizationAccess(userOrganizationIds: string[], requestedOrganizationId: string) {
  if (!userOrganizationIds.includes(requestedOrganizationId)) {
    throw new AppError("Organization access denied", 403, "ORGANIZATION_ACCESS_DENIED");
  }
}
