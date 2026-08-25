import { SettingsRepository } from "./settings.repository.js";
import type { UpdateSettingBody } from "./settings.types.js";

export class SettingsService {
  private readonly repository = new SettingsRepository();

  async get() {
    return this.repository.get();
  }

  async update(body: UpdateSettingBody, actorSuperAdminId?: string) {
    return this.repository.update(body, actorSuperAdminId);
  }
}
