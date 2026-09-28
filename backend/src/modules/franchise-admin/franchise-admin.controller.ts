import type { Context } from "hono";
import { AppError } from "../../common/errors/app-error.js";
import { successResponse } from "../../common/responses/success-response.js";
import { validateJson } from "../../common/validation/validation.helper.js";
import { FranchiseAdminService } from "./franchise-admin.service.js";
import {
  licenseRenewalSchema,
  superAdminInputSchema,
  superAdminStatusSchema,
  superAdminUpdateSchema,
} from "./franchise-admin.validation.js";

type UserContext = {
  id?: string;
  role?: string;
  franchiseId?: string;
};

export class FranchiseAdminController {
  private readonly service = new FranchiseAdminService();

  async dashboard(c: Context) {
    const { franchiseId } = this.getFranchiseContext(c);
    const data = await this.service.getDashboard(franchiseId);
    return c.json(successResponse(data, "Franchise Steward dashboard loaded"));
  }

  async listSuperAdmins(c: Context) {
    const { franchiseId } = this.getFranchiseContext(c);
    const data = await this.service.listSuperAdmins(franchiseId);
    return c.json(successResponse(data, "Super Admins loaded"));
  }

  async getSuperAdmin(c: Context) {
    const { franchiseId } = this.getFranchiseContext(c);
    const id = c.req.param("id");
    if (!id) throw new AppError("Super Admin ID is required", 400, "ID_REQUIRED");
    const data = await this.service.getSuperAdmin(franchiseId, id);
    return c.json(successResponse(data, "Super Admin loaded"));
  }

  async createSuperAdmin(c: Context) {
    const { franchiseId, userId } = this.getFranchiseContext(c);
    const input = await validateJson(c, superAdminInputSchema);
    const data = await this.service.createSuperAdmin(franchiseId, input, userId);
    return c.json(successResponse(data, "Super Admin created successfully"), 201);
  }

  async updateSuperAdmin(c: Context) {
    const { franchiseId, userId } = this.getFranchiseContext(c);
    const id = c.req.param("id");
    if (!id) throw new AppError("Super Admin ID is required", 400, "ID_REQUIRED");
    const input = await validateJson(c, superAdminUpdateSchema);
    const data = await this.service.updateSuperAdmin(franchiseId, id, input, userId);
    return c.json(successResponse(data, "Super Admin updated successfully"));
  }

  async toggleSuperAdminStatus(c: Context) {
    const { franchiseId, userId } = this.getFranchiseContext(c);
    const id = c.req.param("id");
    if (!id) throw new AppError("Super Admin ID is required", 400, "ID_REQUIRED");
    const input = await validateJson(c, superAdminStatusSchema);
    const data = await this.service.toggleSuperAdminStatus(franchiseId, id, input, userId);
    return c.json(
      successResponse(
        data,
        data.status === "ACTIVE" ? "Super Admin activated" : "Super Admin deactivated",
      ),
    );
  }

  async getLicense(c: Context) {
    const { franchiseId } = this.getFranchiseContext(c);
    const data = await this.service.getFranchise(franchiseId);
    return c.json(successResponse(data, "Franchise license details loaded"));
  }

  async renewLicense(c: Context) {
    const { franchiseId, userId } = this.getFranchiseContext(c);
    const input = await validateJson(c, licenseRenewalSchema);
    const data = await this.service.renewLicense(franchiseId, input, userId);
    return c.json(successResponse(data, "Franchise license renewed successfully"));
  }

  async notifications(c: Context) {
    const { franchiseId } = this.getFranchiseContext(c);
    const data = await this.service.listNotifications(franchiseId);
    return c.json(successResponse(data, "Franchise Steward notifications loaded"));
  }

  async auditLogs(c: Context) {
    const { franchiseId } = this.getFranchiseContext(c);
    const data = await this.service.listAuditLogs(franchiseId);
    return c.json(successResponse(data, "Franchise Steward audit logs loaded"));
  }

  private getFranchiseContext(c: Context) {
    const user = c.get("user") as UserContext | undefined;
    if (!user || user.role !== "FRANCHISE_STEWARD") {
      throw new AppError("Unauthorized access", 403, "FORBIDDEN");
    }
    if (!user.franchiseId) {
      throw new AppError("Franchise context missing", 403, "FRANCHISE_CONTEXT_MISSING");
    }
    return { franchiseId: user.franchiseId, userId: user.id };
  }
}
