import type { Context } from "hono";
import { successResponse } from "../../../common/responses/success-response.js";
import { validateQuery } from "../../../common/validation/validation.helper.js";
import { requiredId } from "../shared/id-param.js";
import { LoginActivityService } from "./login-activity.service.js";
import { listLoginActivitySchema } from "./login-activity.validation.js";

export class LoginActivityController {
  private readonly service = new LoginActivityService();

  async list(c: Context) {
    const query = validateQuery(c, listLoginActivitySchema);
    const data = await this.service.list(query);
    return c.json(successResponse(data.rows, "Login activity loaded", { total: data.total, page: data.page, limit: data.limit }));
  }

  async detail(c: Context) {
    const data = await this.service.detail(requiredId(c, "login_activity"));
    return c.json(successResponse(data, "Login activity details loaded"));
  }
}
