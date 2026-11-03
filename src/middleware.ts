import { NextResponse, type NextRequest } from "next/server";

/**
 * Presence-only gate for authenticated app areas. Deliberately imports nothing
 * app-specific — middleware runs in the Edge runtime (no better-sqlite3). Deep
 * HMAC verification + DB role checks happen server-side in getSessionUser() and
 * the role layouts on every page/handler.
 */
export function middleware(request: NextRequest) {
  if (!request.cookies.get("pp_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/client/:path*", "/freelancer/:path*", "/milestones/:path*", "/dashboard"],
};
