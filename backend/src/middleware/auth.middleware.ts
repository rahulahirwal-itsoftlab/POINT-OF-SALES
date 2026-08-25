import type { MiddlewareHandler } from "hono";
import { getAccessToken, getRefreshToken, setAccessCookie } from "../common/auth/cookies.js";
import { hashSessionToken } from "../common/auth/session-token.js";
import { Errors } from "../common/errors/error-codes.js";
import { runWithLoggerContext, getLoggerContext } from "../common/logger/logger.context.js";
import { logger } from "../common/logger/logger.js";
import { tokenService } from "../common/auth/token.service.js";
import { AuthRepository } from "../modules/auth/auth.repository.js";

const authRepository = new AuthRepository();

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const accessToken = getAccessToken(c);

  if (accessToken) {
    try {
      const payload = await tokenService.verifyAccessToken(accessToken);
      const principal =
        payload.type === "SUPER_ADMIN"
          ? await authRepository.findSuperAdminById(payload.sub)
          : payload.type === "ADMIN"
            ? await authRepository.findAdminById(payload.sub)
            : await authRepository.findEmployeeById(payload.sub);

      if (!principal || principal.status !== "ACTIVE") {
        throw Errors.userInactive();
      }

      const restaurantId = "restaurantId" in principal ? principal.restaurantId ?? undefined : undefined;
      const restaurantIds = restaurantId ? [restaurantId] : [];
      const organizationId = "organizationId" in principal ? principal.organizationId ?? undefined : undefined;
      if (organizationId) {
        const organization = await authRepository.findOrganizationById(organizationId);
        if (!organization || organization.status !== "ACTIVE") {
          throw Errors.forbidden("Organization is not active", "ORGANIZATION_INACTIVE");
        }
      }
    
      const userContext = {
        id: principal.id,
        publicId: principal.publicId,
        name: principal.name,
        email: principal.email,
        phone: principal.phone ?? null,
        role: principal.role,
        subjectType: payload.type,
        status: principal.status,
        isActive: principal.status === "ACTIVE",
        permissions: [] as string[],
        organizationId,
        organizationIds: organizationId ? [organizationId] : [],
        restaurantIds,
        lastLoginAt: principal.lastLoginAt,
      };

      c.set("user", userContext);

      const existingContext = getLoggerContext() ?? {};

      logger.debug(
        { principalId: principal.id, role: principal.role, organizationId, restaurantId },
        "AUTH: Token validated",
      );

      return runWithLoggerContext(
        {
          ...existingContext,
          principalId: principal.id,
          role: principal.role,
          organizationId,
          restaurantId,
        },
        () => next(),
      );
    } catch (error) {
      logger.warn({ error: error instanceof Error ? error.message : "Unknown token error" }, "AUTH: Invalid or expired access token");
    }
  }

  const refreshToken = getRefreshToken(c);
  if (!refreshToken) throw Errors.unauthorized();

  const session = await authRepository.findValidSession(hashSessionToken(refreshToken));
  if (!session) throw Errors.unauthorized();

  const principal =
    session.subjectType === "SUPER_ADMIN" && session.superAdminId
      ? await authRepository.findSuperAdminById(session.superAdminId)
      : session.subjectType === "ADMIN" && session.adminId
        ? await authRepository.findAdminById(session.adminId)
        : session.subjectType === "EMPLOYEE" && session.employeeId
          ? await authRepository.findEmployeeById(session.employeeId)
          : null;

  if (!principal || principal.status !== "ACTIVE") throw Errors.userInactive();

  await authRepository.touchSession(session.id);

  const restaurantId = "restaurantId" in principal ? principal.restaurantId ?? undefined : undefined;
  const restaurantIds = restaurantId ? [restaurantId] : [];
  const organizationId = "organizationId" in principal ? principal.organizationId ?? undefined : undefined;
  if (organizationId) {
    const organization = await authRepository.findOrganizationById(organizationId);
    if (!organization || organization.status !== "ACTIVE") {
      throw Errors.forbidden("Organization is not active", "ORGANIZATION_INACTIVE");
    }
  }
  const userContext = {
    id: principal.id,
    publicId: principal.publicId,
    name: principal.name,
    email: principal.email,
    phone: principal.phone ?? null,
    role: principal.role,
    subjectType: session.subjectType,
    status: principal.status,
    isActive: principal.status === "ACTIVE",
    permissions: [] as string[],
    organizationId,
    organizationIds: organizationId ? [organizationId] : [],
    restaurantIds,
    lastLoginAt: principal.lastLoginAt,
  };

  c.set("user", userContext);

  const refreshedAccessToken = await tokenService.generateAccessToken({
    sub: principal.id,
    type: session.subjectType,
    role: principal.role,
    organizationId,
    restaurantId,
  });
  setAccessCookie(c, refreshedAccessToken);

  const existingContext = getLoggerContext() ?? {};

  logger.debug(
    { principalId: principal.id, role: principal.role, organizationId, restaurantId },
    "AUTH: Session restored from refresh token",
  );

  return runWithLoggerContext(
    {
      ...existingContext,
      principalId: principal.id,
      role: principal.role,
      organizationId,
      restaurantId,
    },
    () => next(),
  );
};

export const rejectUnauthenticated = () => {
  throw Errors.unauthorized();
};
