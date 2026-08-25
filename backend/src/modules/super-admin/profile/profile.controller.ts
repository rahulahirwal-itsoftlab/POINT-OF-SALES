import type { Context } from "hono";
import { Errors } from "../../../common/errors/error-codes.js";
import { successResponse } from "../../../common/responses/success-response.js";
import { ProfileService } from "./profile.service.js";

export class ProfileController {
  private readonly service = new ProfileService();

  async me(c: Context) {
    const user = c.get("user") as { id?: string } | undefined;
    if (!user?.id) throw Errors.unauthorized();
    const data = await this.service.me(user.id);
    return c.json(successResponse(data, "Profile loaded"));
  }
}
