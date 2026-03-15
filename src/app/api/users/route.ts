/**
 * GET  /api/users  — list users (admin+)
 * POST /api/users  — create user (super-admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/db";
import { withPermission, withAuth } from "@/lib/auth/guard";
import { assignableRoles } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";
import UserModel from "@/models/User";
import { createAuditLog } from "@/models/AuditLog";

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  // hyphen matches rbac.ts Role type
  role: z.enum(["viewer", "editor", "admin", "super-admin"]),
});

// ─── GET /api/users ───────────────────────────────────────────────────────────

export const GET = withAuth(async (_req, { user }) => {
  if (!["admin", "super-admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const users = await UserModel.find().sort({ createdAt: -1 }).lean();

  return NextResponse.json({
    success: true,
    data: { items: users, total: users.length },
  });
});

// ─── POST /api/users ──────────────────────────────────────────────────────────

export const POST = withAuth(async (req, { user }) => {
  if (!["admin", "super-admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const body = await req.json();
  const parsed = CreateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const allowed = assignableRoles(user.role as Role);
  if (!allowed.includes(parsed.data.role as Role)) {
    return NextResponse.json(
      { success: false, error: `Your role cannot assign '${parsed.data.role}'` },
      { status: 403 }
    );
  }

  const existing = await UserModel.findOne({ email: parsed.data.email });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "Email already in use" },
      { status: 409 }
    );
  }

  const newUser = await UserModel.create({
    ...parsed.data,
    role: parsed.data.role as Role,
  });

  await createAuditLog({
    userId: user.id,
    userName: user.name,
    action: "user.create",
    resource: "user",
    resourceId: newUser._id.toString(),
    details: { email: newUser.email, role: newUser.role },
  });

  return NextResponse.json(
    { success: true, data: newUser.toJSON() },
    { status: 201 }
  );
});