import type { Context } from "hono";
import { clearAuthCookies, getRefreshToken, setAuthCookies } from "../../common/auth/cookies.js";
import { Errors } from "../../common/errors/error-codes.js";
import { successResponse } from "../../common/responses/success-response.js";
import { validateJson } from "../../common/validation/validation.helper.js";
import { AuthService } from "./auth.service.js";
import { loginSchema } from "./auth.validation.js";

export class AuthController {
  private readonly service = new AuthService();

  async login(c: Context) {
    const input = await validateJson(c, loginSchema);
    const { accessToken, refreshToken, refreshExpiresAt } = await this.service.login(input, this.requestMeta(c));

    setAuthCookies(c, accessToken, refreshToken, refreshExpiresAt);

    return c.json(
      successResponse(
        {
          accessToken,
          referenceToken: refreshToken,
          tokenType: "Bearer",
          expiresIn: 15 * 60, // 15 mins
        },
        "Login successful",
      ),
    );
  }

  async refresh(c: Context) {
    // Check header/body first, then fallback to cookie
    let oldRefreshToken = getRefreshToken(c);
    
    if (!oldRefreshToken && c.req.header("Content-Type")?.includes("application/json")) {
      try {
        const body = await c.req.json();
        if (body?.referenceToken) {
          oldRefreshToken = body.referenceToken;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    if (!oldRefreshToken) throw Errors.unauthorized();

    const { accessToken, refreshToken, refreshExpiresAt } = await this.service.refresh(oldRefreshToken, this.requestMeta(c));

    setAuthCookies(c, accessToken, refreshToken, refreshExpiresAt);

    return c.json(
      successResponse(
        {
          accessToken,
          referenceToken: refreshToken,
          tokenType: "Bearer",
          expiresIn: 15 * 60, // 15 mins
        },
        "Refresh successful",
      ),
    );
  }

  async me(c: Context) {
    const userContext = c.get("user");
    if (!userContext || !userContext.id) throw Errors.unauthorized();

    if (userContext.subjectType === "SUPER_ADMIN") {
      return c.json(successResponse({ user: {
        id: userContext.publicId,
        name: userContext.name,
        email: userContext.email,
        phone: userContext.phone,
        role: userContext.role,
        subjectType: userContext.subjectType,
        status: userContext.status,
        isActive: userContext.isActive,
        permissions: userContext.permissions ?? [],
        organizationId: userContext.organizationId ?? null,
        restaurantId: userContext.restaurantIds?.[0] ?? null,
        organizationIds: userContext.organizationIds ?? [],
        restaurantIds: userContext.restaurantIds ?? [],
        lastLoginAt: userContext.lastLoginAt,
      } }, "Authenticated user loaded"));
    }
    
    // Resolve the full safe user from the DB
    const user = await this.service.currentUser(userContext.id, userContext.subjectType);
    return c.json(successResponse({ user }, "Authenticated user loaded"));
  }

  async logout(c: Context) {
    let refreshToken = getRefreshToken(c);
    
    if (!refreshToken && c.req.header("Content-Type")?.includes("application/json")) {
      try {
        const body = await c.req.json();
        if (body?.referenceToken) {
          refreshToken = body.referenceToken;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    const data = await this.service.logout(refreshToken, this.requestMeta(c));
    clearAuthCookies(c);
    return c.json(successResponse(data, "Logout successful"));
  }

  private requestMeta(c: Context) {
    return {
      ipAddress: c.req.header("x-forwarded-for") ?? null,
      userAgent: c.req.header("user-agent") ?? null,
    };
  }
}
