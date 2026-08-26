// import type { Context } from "hono";
// import { deleteCookie, getCookie, setCookie } from "hono/cookie";
// import { env } from "../../config/env.js";

// const ACCESS_COOKIE_NAME = "pos_access_token";
// const REFRESH_COOKIE_NAME = "pos_refresh_token";

// const isProduction = env.NODE_ENV === "production";
// const sameSitePolicy = isProduction ? "None" : "Lax";
// const securePolicy = isProduction;

// console.log("production:",isProduction,"sameSitePolicy:",sameSitePolicy,"securePolicy:",securePolicy)

// export function getAccessToken(c: Context) {
//   const authHeader = c.req.header("Authorization");
//   if (authHeader?.startsWith("Bearer ")) {
//     return authHeader.substring(7);
//   }
//   return getCookie(c, ACCESS_COOKIE_NAME);
// }

// export function getRefreshToken(c: Context) {
//   return getCookie(c, REFRESH_COOKIE_NAME);
// }

// export function setAuthCookies(c: Context, accessToken: string, refreshToken: string, refreshExpiresAt: Date) {
//   setAccessCookie(c, accessToken);

//   // Refresh token cookie (long-lived)
//   setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
//     httpOnly: true,
//     secure: securePolicy,
//     sameSite: sameSitePolicy,
//     path: "/",
//     expires: refreshExpiresAt,
//     maxAge: Math.floor((refreshExpiresAt.getTime() - Date.now()) / 1000),
//   });
// }

// export function setAccessCookie(c: Context, accessToken: string) {
//   setCookie(c, ACCESS_COOKIE_NAME, accessToken, {
//     httpOnly: true,
//     secure: securePolicy,
//     sameSite: sameSitePolicy,
//     path: "/",
//     maxAge: 3600 * 60, // 15 minutes
//   });
// }

// export function clearAuthCookies(c: Context) {
//   deleteCookie(c, ACCESS_COOKIE_NAME, {
//     path: "/",
//     secure: securePolicy,
//     sameSite: sameSitePolicy,
//   });

//   deleteCookie(c, REFRESH_COOKIE_NAME, {
//     path: "/",
//     secure: securePolicy,
//     sameSite: sameSitePolicy,
//   });
// }
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { env } from "../../config/env.js";

const ACCESS_COOKIE_NAME = "pos_access_token";
const REFRESH_COOKIE_NAME = "pos_refresh_token";

const isProduction = env.NODE_ENV === "production";

const sameSitePolicy = isProduction ? "None" : "Lax";
const securePolicy = isProduction;

export function getAccessToken(c: Context) {
  const authHeader = c.req.header("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return getCookie(c, ACCESS_COOKIE_NAME);
}

export function getRefreshToken(c: Context) {
  return getCookie(c, REFRESH_COOKIE_NAME);
}

export function setAuthCookies(
  c: Context,
  accessToken: string,
  refreshToken: string,
  refreshExpiresAt: Date
) {
  setAccessCookie(c, accessToken);

  setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: securePolicy,
    sameSite: sameSitePolicy,
    path: "/",
    expires: refreshExpiresAt,
    maxAge: Math.max(
      0,
      Math.floor((refreshExpiresAt.getTime() - Date.now()) / 1000)
    ),
  });
}

export function setAccessCookie(c: Context, accessToken: string) {
  setCookie(c, ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: securePolicy,
    sameSite: sameSitePolicy,
    path: "/",
    maxAge: 15 * 60,
  });
}

export function clearAuthCookies(c: Context) {
  deleteCookie(c, ACCESS_COOKIE_NAME, {
    path: "/",
    secure: securePolicy,
    sameSite: sameSitePolicy,
  });

  deleteCookie(c, REFRESH_COOKIE_NAME, {
    path: "/",
    secure: securePolicy,
    sameSite: sameSitePolicy,
  });
}