import { env } from "../../config/env.js";
import { AppError } from "../../common/errors/app-error.js";
import { Errors } from "../../common/errors/error-codes.js";
import { verifyPassword } from "../../common/auth/password.js";
import { hashSessionToken } from "../../common/auth/session-token.js";
import { tokenService } from "../../common/auth/token.service.js";
import { AuthRepository } from "./auth.repository.js";
import type { AuthSubjectType, LoginInput, RequestMetadata } from "./auth.types.js";

type PrincipalWithPassword = {
  subjectType: AuthSubjectType;
  id: string;
  publicId: string;
  name: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  role: string;
  status: string;
  organizationId?: string | null;
  restaurantId?: string | null;
  lastLoginAt?: Date | null;
};

type Principal = Omit<PrincipalWithPassword, "passwordHash">;

export class AuthService {
  private readonly repository = new AuthRepository();

  async login(input: LoginInput, requestMeta: RequestMetadata) {
    const email = input.email.trim().toLowerCase();
    const principal = await this.findPrincipalForLogin(email);

    if (!principal) {
      await this.recordLoginFailure(requestMeta, "INVALID_CREDENTIALS");
      throw Errors.invalidCredentials();
    }

    await this.assertActivePrincipal(principal, requestMeta);

    const passwordMatches = await verifyPassword(principal.passwordHash, input.password);
    if (!passwordMatches) {
      await this.recordLoginFailure(requestMeta, "INVALID_CREDENTIALS", principal);
      throw Errors.invalidCredentials();
    }

    if (principal.subjectType !== "SUPER_ADMIN") {
      await this.assertRestaurantAndLicenseAccess(principal.restaurantId);
    }

    const { accessToken, refreshToken, refreshExpiresAt } = await this.generateAndSaveTokens(principal, requestMeta);

    await this.touchLastLogin(principal);
    await this.recordLoginSuccess(principal, requestMeta);

    return {
      accessToken,
      refreshToken,
      refreshExpiresAt,
    };
  }

  async refresh(refreshToken: string, requestMeta: RequestMetadata) {
    const sessionTokenHash = hashSessionToken(refreshToken);
    const session = await this.repository.findValidSession(sessionTokenHash);
    
    if (!session) {
      throw new AppError("Invalid or expired refresh token", 401, "REFRESH_TOKEN_INVALID");
    }

    const principal = await this.findPrincipalForSession(session);
    if (!principal || principal.status !== "ACTIVE") {
      await this.repository.revokeSession(session.id);
      throw Errors.userInactive();
    }

    if (principal.subjectType !== "SUPER_ADMIN") {
      await this.assertRestaurantAndLicenseAccess(principal.restaurantId);
    }

    // Revoke old session and create a new one (Token Rotation)
    await this.repository.revokeSession(session.id);
    const { accessToken, refreshToken: newRefreshToken, refreshExpiresAt } = await this.generateAndSaveTokens(principal, requestMeta);

    // Optional: Log token refresh event
    if (principal.subjectType === "SUPER_ADMIN") {
      await this.repository.recordAudit({
        actorSuperAdminId: principal.id,
        actorRole: "SUPER_ADMIN",
        action: "AUTH_TOKEN_REFRESH",
        module: "AUTH",
        entityType: "auth_session",
        entityPublicId: principal.publicId,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      });
    } else if (principal.subjectType === "ADMIN") {
      await this.repository.recordAudit({
        actorAdminId: principal.id,
        actorRole: "RESTAURANT_ADMIN",
        restaurantId: principal.restaurantId ?? null,
        action: "AUTH_TOKEN_REFRESH",
        module: "AUTH",
        entityType: "auth_session",
        entityPublicId: principal.publicId,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      });
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      refreshExpiresAt,
    };
  }

  async currentUser(principalId: string, subjectType: AuthSubjectType) {
    let principal: Principal | null = null;
    
    if (subjectType === "SUPER_ADMIN") {
      const superAdmin = await this.repository.findSuperAdminById(principalId);
      if (superAdmin) principal = { ...superAdmin, subjectType: "SUPER_ADMIN" };
    } else if (subjectType === "ADMIN") {
      const admin = await this.repository.findAdminById(principalId);
      if (admin) principal = { ...admin, subjectType: "ADMIN" };
    } else if (subjectType === "EMPLOYEE") {
      const employee = await this.repository.findEmployeeById(principalId);
      if (employee) principal = { ...employee, subjectType: "EMPLOYEE" };
    }

    if (!principal || principal.status !== "ACTIVE") {
      throw Errors.userInactive();
    }

    if (principal.subjectType !== "SUPER_ADMIN") {
      await this.assertRestaurantAndLicenseAccess(principal.restaurantId);
    }
    
    return this.safeUser(principal);
  }

  async logout(refreshToken: string | undefined, requestMeta: RequestMetadata) {
    if (!refreshToken) return { loggedOut: true };

    const sessionTokenHash = hashSessionToken(refreshToken);
    const session = await this.repository.findValidSession(sessionTokenHash);

    if (session) {
      const principal = await this.findPrincipalForSession(session);
      await this.repository.revokeSession(session.id);

      if (principal?.subjectType === "SUPER_ADMIN") {
        await this.repository.recordLoginActivity({
          superAdminId: principal.id,
          status: "LOGOUT",
          ipAddress: requestMeta.ipAddress,
          userAgent: requestMeta.userAgent,
        });
        await this.repository.recordAudit({
          actorSuperAdminId: principal.id,
          actorRole: "SUPER_ADMIN",
          action: "AUTH_LOGOUT",
          module: "AUTH",
          entityType: "auth_session",
          entityPublicId: principal.publicId,
          ipAddress: requestMeta.ipAddress,
          userAgent: requestMeta.userAgent,
        });
      } else if (principal?.subjectType === "ADMIN") {
        await this.repository.recordLoginActivity({
          adminId: principal.id,
          status: "LOGOUT",
          ipAddress: requestMeta.ipAddress,
          userAgent: requestMeta.userAgent,
        });
      } else if (principal?.subjectType === "EMPLOYEE") {
        await this.repository.recordLoginActivity({
          employeeId: principal.id,
          status: "LOGOUT",
          ipAddress: requestMeta.ipAddress,
          userAgent: requestMeta.userAgent,
        });
      }
    } else {
      await this.repository.revokeSessionByTokenHash(sessionTokenHash);
    }

    return { loggedOut: true };
  }

  private async generateAndSaveTokens(principal: PrincipalWithPassword | Principal, requestMeta: RequestMetadata) {
    const accessToken = await tokenService.generateAccessToken({
      sub: principal.id,
      type: principal.subjectType,
      role: principal.role,
      organizationId: principal.organizationId ?? undefined,
      restaurantId: principal.restaurantId ?? undefined,
    });

    const refreshToken = tokenService.generateRefreshToken();
    const sessionTokenHash = hashSessionToken(refreshToken);
    const refreshExpiresAt = new Date(Date.now() + env.AUTH_SESSION_DAYS * 24 * 60 * 60 * 1000);

    await this.repository.createSession({
      subjectType: principal.subjectType,
      superAdminId: principal.subjectType === "SUPER_ADMIN" ? principal.id : null,
      adminId: principal.subjectType === "ADMIN" ? principal.id : null,
      employeeId: principal.subjectType === "EMPLOYEE" ? principal.id : null,
      sessionTokenHash,
      expiresAt: refreshExpiresAt,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    return { accessToken, refreshToken, refreshExpiresAt };
  }

  private async findPrincipalForLogin(email: string): Promise<PrincipalWithPassword | null> {
    const superAdmin = await this.repository.findSuperAdminByEmail(email);
    if (superAdmin?.role === "SUPER_ADMIN") {
      return { ...superAdmin, subjectType: "SUPER_ADMIN" };
    }

    const admin = await this.repository.findAdminByEmail(email);
    if (admin) return { ...admin, subjectType: "ADMIN" };

    const employee = await this.repository.findEmployeeByEmail(email);
    if (employee) return { ...employee, subjectType: "EMPLOYEE" };

    return null;
  }

  private async findPrincipalForSession(session: {
    subjectType: AuthSubjectType;
    superAdminId: string | null;
    adminId: string | null;
    employeeId: string | null;
  }): Promise<Principal | null> {
    if (session.subjectType === "SUPER_ADMIN" && session.superAdminId) {
      const superAdmin = await this.repository.findSuperAdminById(session.superAdminId);
      return superAdmin ? { ...superAdmin, subjectType: "SUPER_ADMIN" } : null;
    }

    if (session.subjectType === "ADMIN" && session.adminId) {
      const admin = await this.repository.findAdminById(session.adminId);
      return admin ? { ...admin, subjectType: "ADMIN" } : null;
    }

    if (session.subjectType === "EMPLOYEE" && session.employeeId) {
      const employee = await this.repository.findEmployeeById(session.employeeId);
      return employee ? { ...employee, subjectType: "EMPLOYEE" } : null;
    }

    return null;
  }

  private async assertActivePrincipal(principal: PrincipalWithPassword, requestMeta: RequestMetadata) {
    if (principal.status === "ACTIVE") return;

    await this.recordLoginFailure(requestMeta, `ACCOUNT_${principal.status}`, principal);

    if (principal.status === "INVITED") {
      throw new AppError(
        "Account is not active. Please contact your platform administrator.",
        403,
        "ACCOUNT_NOT_ACTIVATED",
      );
    }

    if (principal.status === "BLOCKED") throw Errors.userBlocked();
    throw Errors.userInactive();
  }

  private async assertRestaurantAndLicenseAccess(restaurantId?: string | null) {
    if (!restaurantId) throw Errors.restaurantMissing();

    const restaurant = await this.repository.findRestaurantById(restaurantId);
    if (!restaurant || restaurant.status !== "ACTIVE") {
      throw new AppError("Restaurant is not active", 403, "RESTAURANT_INACTIVE");
    }

    const organization = await this.repository.findOrganizationById(restaurant.organizationId);
    if (!organization || organization.status !== "ACTIVE") {
      throw new AppError("Organization is not active", 403, "ORGANIZATION_INACTIVE");
    }

    const result = await this.repository.findActiveLicenseForRestaurant(restaurantId);
    if (!result || !result.license) throw Errors.licenseMissing();
    
    const { license, subscription } = result;

    if (license.status === "EXPIRED" || license.expiresAt <= new Date()) throw Errors.licenseExpired();
    if (license.status === "SUSPENDED") throw Errors.licenseSuspended();
    if (license.status === "BLOCKED") throw Errors.licenseBlocked();
    if (license.status === "REVOKED") throw Errors.licenseRevoked();
    if (license.status !== "ACTIVE") throw Errors.licenseInactive();

    if (subscription) {
      if (
        subscription.status === "CANCELLED" ||
        subscription.status === "SUSPENDED" ||
        subscription.status === "EXPIRED" ||
        subscription.status === "PENDING" ||
        subscription.endDate <= new Date()
      ) {
        throw new AppError("Restaurant subscription is inactive or cancelled", 403, "SUBSCRIPTION_INACTIVE");
      }
    }
  }

  private async touchLastLogin(principal: PrincipalWithPassword) {
    if (principal.subjectType === "SUPER_ADMIN") {
      await this.repository.touchSuperAdminLastLogin(principal.id);
      return;
    }
    if (principal.subjectType === "ADMIN") {
      await this.repository.touchAdminLastLogin(principal.id);
      return;
    }
    await this.repository.touchEmployeeLastLogin(principal.id);
  }

  private async recordLoginFailure(
    requestMeta: RequestMetadata,
    reason: string,
    principal?: PrincipalWithPassword,
  ) {
    await this.repository.recordLoginActivity({
      superAdminId: principal?.subjectType === "SUPER_ADMIN" ? principal.id : undefined,
      adminId: principal?.subjectType === "ADMIN" ? principal.id : undefined,
      employeeId: principal?.subjectType === "EMPLOYEE" ? principal.id : undefined,
      status: principal?.status === "BLOCKED" ? "BLOCKED" : "FAILED",
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
      failureReason: reason,
    });

    if (principal?.subjectType === "ADMIN") {
      await this.repository.recordAudit({
        actorAdminId: principal.id,
        actorRole: "RESTAURANT_ADMIN",
        restaurantId: principal.restaurantId ?? null,
        action: "ADMIN_LOGIN_FAILED",
        module: "AUTH",
        entityType: "admin",
        entityPublicId: principal.publicId,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
        metadata: { reason },
      });
    }
  }

  private async recordLoginSuccess(principal: PrincipalWithPassword, requestMeta: RequestMetadata) {
    if (principal.subjectType === "SUPER_ADMIN") {
      await this.repository.recordLoginActivity({
        superAdminId: principal.id,
        status: "SUCCESS",
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      });
      await this.repository.recordAudit({
        actorSuperAdminId: principal.id,
        actorRole: "SUPER_ADMIN",
        action: "AUTH_LOGIN_SUCCESS",
        module: "AUTH",
        entityType: "auth_session",
        entityPublicId: principal.publicId,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      });
      return;
    }

    if (principal.subjectType === "ADMIN") {
      await this.repository.recordLoginActivity({
        adminId: principal.id,
        status: "SUCCESS",
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      });
      await this.repository.recordAudit({
        actorAdminId: principal.id,
        actorRole: "ADMIN",
        restaurantId: principal.restaurantId ?? null,
        action: "ADMIN_LOGIN_SUCCESS",
        module: "AUTH",
        entityType: "admin",
        entityPublicId: principal.publicId,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      });
      return;
    }

    if (principal.subjectType === "EMPLOYEE") {
      await this.repository.recordLoginActivity({
        employeeId: principal.id,
        status: "SUCCESS",
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      });
    }
  }

  private async safeUser(user: Principal) {
    const permissions: string[] = []; // Permissions are handled via role now
    const restaurantIds = user.restaurantId ? [user.restaurantId] : [];
    const organizationIds = user.organizationId ? [user.organizationId] : [];

    return {
      id: user.publicId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      subjectType: user.subjectType,
      status: user.status,
      isActive: user.status === "ACTIVE",
      permissions,
      organizationId: user.organizationId ?? null,
      restaurantId: user.restaurantId ?? null,
      organizationIds,
      restaurantIds,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
