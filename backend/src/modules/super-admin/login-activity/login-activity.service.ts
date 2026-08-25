import { AppError } from "../../../common/errors/app-error.js";
import { LoginActivityRepository } from "./login-activity.repository.js";
import type { ListLoginActivityQuery } from "./login-activity.types.js";

export class LoginActivityService {
  private readonly repository = new LoginActivityRepository();

  list(query: ListLoginActivityQuery) {
    return this.repository.list(query);
  }

  async detail(id: string) {
    const activity = await this.repository.detail(id);
    if (!activity) throw new AppError("Login activity not found", 404, "LOGIN_ACTIVITY_NOT_FOUND");
    return activity;
  }
}
