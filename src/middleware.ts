import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

type Role = "viewer" | "editor" | "admin" | "super-admin";

const ROLE_HOME: Record<Role, string> = {
  viewer:       "/viewer",
  editor:       "/editor",
  admin:        "/admin",
  "super-admin":"/super-admin",
};

const ROLE_ALLOWED: Record<Role, string[]> = {
  viewer:       ["/viewer", "/api"],
  editor:       ["/editor", "/api"],
  admin:        ["/admin", "/api"],
  "super-admin":["/admin", "/super-admin", "/api"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow NextAuth, login, and public assets
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Not authenticated → redirect to login
  if (!token && (
    pathname.startsWith("/editor") ||
    pathname.startsWith("/viewer") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin") ||
    pathname.startsWith("/api/pages") ||
    pathname.startsWith("/api/users")
  )) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Role guard — only block page routes, not API (API handles its own auth)
  if (token && !pathname.startsWith("/api")) {
    const role = token.role as Role;
    const allowed = ROLE_ALLOWED[role] ?? [];
    const permitted = allowed.some(p => pathname.startsWith(p)) || pathname === "/";
    if (!permitted) {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/editor/:path*",
    "/viewer/:path*",
    "/admin/:path*",
    "/super-admin/:path*",
    "/api/pages/:path*",
    "/api/users/:path*",
  ],
};
