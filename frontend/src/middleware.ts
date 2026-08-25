import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const accessCookieName = process.env.NEXT_PUBLIC_ACCESS_COOKIE_NAME ?? "pos_access_token";
const refreshCookieName = process.env.NEXT_PUBLIC_REFRESH_COOKIE_NAME ?? "pos_refresh_token";

export function middleware(request: NextRequest) {
  const hasSessionCookie = Boolean(
    request.cookies.get(accessCookieName)?.value || request.cookies.get(refreshCookieName)?.value,
  );

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/super-admin/:path*", "/admin/:path*", "/waiter/:path*", "/kitchen/:path*", "/reception/:path*", "/receptionist/:path*"],
};
