import type { Context } from "hono";
import { successResponse } from "../../../common/responses/success-response.js";
import { validateJson } from "../../../common/validation/validation.helper.js";
import { SettingsService } from "./settings.service.js";
import { updateSettingSchema } from "./settings.validation.js";

export class SettingsController {
  private readonly service = new SettingsService();

  async get(c: Context) {
    const data = await this.service.get();
    return c.json(successResponse(data || {}, "Settings loaded"));
  }

  async update(c: Context) {
    const body = await validateJson(c, updateSettingSchema);
    const user = c.get("user");
    const data = await this.service.update(body, user?.id);
    return c.json(successResponse(data, "Settings updated"));
  }
}
