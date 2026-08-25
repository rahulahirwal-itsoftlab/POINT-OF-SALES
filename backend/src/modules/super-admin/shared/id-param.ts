import type { Context } from "hono";
import { AppError } from "../../../common/errors/app-error.js";

export function requiredId(c: Context, entityName: string) {
  const id = c.req.param("id");
  if (!id) {
    throw new AppError(`${entityName} id is required`, 400, `${entityName.toUpperCase()}_ID_REQUIRED`);
  }

  return id;
}
