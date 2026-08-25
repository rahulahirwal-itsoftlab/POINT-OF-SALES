import { AppError } from "../../../common/errors/app-error.js";
import { LicenseRepository } from "./license.repository.js";
import type { ListLicensesQuery, RenewLicenseBody } from "./license.types.js";

export class LicenseService {
  private readonly repository = new LicenseRepository();

  list(query: ListLicensesQuery) {
    return this.repository.list(query);
  }

  async detail(id: string) {
    const license = await this.repository.detail(id);
    if (!license) throw new AppError("License not found", 404, "LICENSE_NOT_FOUND");
    return license;
  }

  async history(id: string) {
    const history = await this.repository.history(id);
    if (!history) throw new AppError("License not found", 404, "LICENSE_NOT_FOUND");
    return history;
  }

  changeStatus(id: string, status: "ACTIVE" | "EXPIRED" | "SUSPENDED" | "BLOCKED" | "CANCELLED" | "REVOKED", actorSuperAdminId?: string) {
    return this.repository.changeStatus(id, status, actorSuperAdminId);
  }

  extend(id: string, additionalDays: number, actorSuperAdminId?: string) {
    return this.repository.extendLicense(id, additionalDays, actorSuperAdminId);
  }

  renew(id: string, body: RenewLicenseBody, actorSuperAdminId?: string) {
    return this.repository.renewSubscription(id, body, actorSuperAdminId);
  }

  triggerExpiry(actorSuperAdminId?: string) {
    return this.repository.triggerExpiry(actorSuperAdminId);
  }
}
