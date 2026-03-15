/**
 * GET  /api/users  — list users (admin+)
 * POST /api/users  — create user (super_admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/db/connect";
import { withPermission } from "@/lib/auth/guard";
import { assignableRoles } from "@/lib/rbac/permissions";
import UserModel from "@/models/User";
import { createAuditLog } from "@/models/AuditLog";

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["viewer", "editor", "admin", "super_admin"]),
});

// ─── GET /api/users ───────────────────────────────────────────────────────────

export const GET = withPermission("user:read", async (req) => {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    UserModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    UserModel.countDocuments(),
  ]);

  return NextResponse.json({
    success: true,
    data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

// ─── POST /api/users ──────────────────────────────────────────────────────────

export const POST = withPermission("user:create", async (req, { user }) => {
  await connectDB();

  const body = await req.json();
  const parsed = CreateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Validate actor can assign this role
  const allowed = assignableRoles(user.role);
  if (!allowed.includes(parsed.data.role)) {
    return NextResponse.json(
      {
        success: false,
        error: `Your role cannot assign '${parsed.data.role}'`,
      },
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

  const newUser = await UserModel.create(parsed.data);

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
