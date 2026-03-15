import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "./options";
import { can } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type Permission =
  | "page:read" | "page:create" | "page:edit"
  | "page:delete" | "page:publish"
  | "user:read" | "user:manage";

export class AuthError extends Error {
  statusCode: number;
  constructor(message = "Authentication required", statusCode = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError();
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireAuth();
  if (!can(user.role, permission as never)) throw new ForbiddenError();
  return user;
}

type RouteHandler = (
  req: NextRequest,
  ctx: { user: SessionUser; params?: Record<string, string> }
) => Promise<NextResponse>;

export function withPermission(permission: Permission, handler: RouteHandler) {
  return async (req: NextRequest, ctx?: { params?: Record<string, string> }): Promise<NextResponse> => {
    try {
      const user = await requirePermission(permission);
      return await handler(req, { user, params: ctx?.params });
    } catch (err) {
      if (err instanceof AuthError)    return NextResponse.json({ error: err.message }, { status: 401 });
      if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
      throw err;
    }
  };
}

export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest, ctx?: { params?: Record<string, string> }): Promise<NextResponse> => {
    try {
      const user = await requireAuth();
      return await handler(req, { user, params: ctx?.params });
    } catch (err) {
      if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
      throw err;
    }
  };
}