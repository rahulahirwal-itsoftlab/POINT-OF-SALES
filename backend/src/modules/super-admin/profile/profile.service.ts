import { AppError } from "../../../common/errors/app-error.js";
import { ProfileRepository } from "./profile.repository.js";

export class ProfileService {
  private readonly repository = new ProfileRepository();

  async me(superAdminId: string) {
    const profile = await this.repository.me(superAdminId);
    if (!profile) throw new AppError("Profile not found", 404, "PROFILE_NOT_FOUND");
    return profile;
  }
}
