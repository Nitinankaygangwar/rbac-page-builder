/**
 * Server-side route guard utilities.
 *
 * Usage in API routes:
 *   const { user } = await requireAuth(req);
 *   await requirePermission(req, "page:publish");
 */

import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "./options";
import { hasPermission } from "@/lib/rbac/permissions";
import type { Permission, SessionUser } from "@/types";

// ─── Auth Errors ──────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
    this.statusCode = 403;
  }
  statusCode: number = 403;
}

// ─── Session Retrieval ────────────────────────────────────────────────────────

/**
 * Get the current session user from a request.
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as SessionUser;
}

/**
 * Require authentication. Throws AuthError if not signed in.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("Authentication required");
  }
  return user;
}

/**
 * Require a specific permission. Throws ForbiddenError if lacking it.
 */
export async function requirePermission(
  permission: Permission
): Promise<SessionUser> {
  const user = await requireAuth();
  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError(
      `Role '${user.role}' lacks permission '${permission}'`
    );
  }
  return user;
}

// ─── API Route Wrapper ────────────────────────────────────────────────────────

type RouteHandler = (
  req: NextRequest,
  ctx: { user: SessionUser; params?: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Wrap an API route handler with auth + permission check.
 * Returns a standard Next.js route handler.
 *
 * @example
 * export const GET = withPermission("page:read", async (req, { user }) => {
 *   // user is guaranteed to have page:read
 * });
 */
export function withPermission(
  permission: Permission,
  handler: RouteHandler
) {
  return async (
    req: NextRequest,
    ctx?: { params?: Record<string, string> }
  ): Promise<NextResponse> => {
    try {
      const user = await requirePermission(permission);
      return await handler(req, { user, params: ctx?.params });
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: 401 });
      }
      if (err instanceof ForbiddenError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }
  };
}

/**
 * Wrap an API route handler requiring only authentication (no specific perm).
 */
export function withAuth(handler: RouteHandler) {
  return async (
    req: NextRequest,
    ctx?: { params?: Record<string, string> }
  ): Promise<NextResponse> => {
    try {
      const user = await requireAuth();
      return await handler(req, { user, params: ctx?.params });
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: 401 });
      }
      throw err;
    }
  };
}
