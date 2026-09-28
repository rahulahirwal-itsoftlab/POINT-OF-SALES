import { hashPassword } from "../../common/auth/password.js";
import { FranchiseAdminRepository } from "./franchise-admin.repository.js";
import type { z } from "zod";
import type {
  licenseRenewalSchema,
  superAdminInputSchema,
  superAdminStatusSchema,
  superAdminUpdateSchema,
} from "./franchise-admin.validation.js";

type SuperAdminInput = z.infer<typeof superAdminInputSchema>;
type SuperAdminUpdate = z.infer<typeof superAdminUpdateSchema>;
type SuperAdminStatus = z.infer<typeof superAdminStatusSchema>;
type LicenseRenewal = z.infer<typeof licenseRenewalSchema>;

export class FranchiseAdminService {
  private readonly repository = new FranchiseAdminRepository();

  getDashboard = this.repository.getDashboard.bind(this.repository);
  getFranchise = this.repository.getFranchise.bind(this.repository);
  listSuperAdmins = this.repository.listSuperAdmins.bind(this.repository);
  getSuperAdmin = this.repository.getSuperAdmin.bind(this.repository);

  async createSuperAdmin(franchiseId: string, input: SuperAdminInput, adminUserId?: string) {
    const passwordHash = await hashPassword(input.password);
    return this.repository.createSuperAdmin(franchiseId, input, passwordHash, adminUserId);
  }

  updateSuperAdmin = (franchiseId: string, id: string, input: SuperAdminUpdate, adminUserId?: string) =>
    this.repository.updateSuperAdmin(franchiseId, id, input, adminUserId);

  toggleSuperAdminStatus = (franchiseId: string, id: string, input: SuperAdminStatus, adminUserId?: string) =>
    this.repository.toggleSuperAdminStatus(franchiseId, id, input, adminUserId);

  renewLicense = (franchiseId: string, input: LicenseRenewal, adminUserId?: string) =>
    this.repository.renewLicense(franchiseId, input, adminUserId);

  listNotifications = this.repository.listNotifications.bind(this.repository);
  listAuditLogs = this.repository.listAuditLogs.bind(this.repository);
}
