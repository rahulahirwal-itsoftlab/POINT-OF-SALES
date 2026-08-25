import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "node:crypto";
import { env } from "../../config/env.js";

const jwtSecretKey = new TextEncoder().encode(env.JWT_SECRET);

export type TokenPayload = {
  sub: string;
  type: "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";
  role: string;
  organizationId?: string;
  restaurantId?: string;
};

export class TokenService {
  /**
   * Generates a short-lived access token (JWT)
   */
  async generateAccessToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({
      type: payload.type,
      role: payload.role,
      organizationId: payload.organizationId,
      restaurantId: payload.restaurantId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime("15m")
      .setJti(randomBytes(16).toString("hex"))
      .sign(jwtSecretKey);
  }

  /**
   * Verifies an access token (JWT)
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const { payload } = await jwtVerify(token, jwtSecretKey);
    return {
      sub: payload.sub as string,
      type: payload.type as "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE",
      role: payload.role as string,
      organizationId: payload.organizationId as string | undefined,
      restaurantId: payload.restaurantId as string | undefined,
    };
  }

  /**
   * Generates a secure, long-lived reference/refresh token
   */
  generateRefreshToken(): string {
    return randomBytes(48).toString("base64url");
  }
}

export const tokenService = new TokenService();
