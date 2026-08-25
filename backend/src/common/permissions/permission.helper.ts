import { AppError } from "../errors/app-error.js";

export function assertHasPermission(userPermissions: string[], required: string) {
  if (!userPermissions.includes(required)) {
    throw new AppError("You do not have permission to perform this action", 403, "FORBIDDEN");
  }
}
