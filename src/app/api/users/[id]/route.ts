/**
 * PATCH  /api/users/[id]  — update user role (super_admin / admin limited)
 * DELETE /api/users/[id]  — delete user (super_admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/db/connect";
import { requireAuth, ForbiddenError } from "@/lib/auth/guard";
import { hasPermission, assignableRoles } from "@/lib/rbac/permissions";
import UserModel from "@/models/User";
import { createAuditLog } from "@/models/AuditLog";

const UpdateUserSchema = z.object({
  role: z.enum(["viewer", "editor", "admin", "super_admin"]).optional(),
  name: z.string().min(1).max(100).optional(),
});

// ─── PATCH /api/users/[id] ────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const actor = await requireAuth();

    if (!hasPermission(actor.role, "user:update")) {
      throw new ForbiddenError();
    }

    const target = await UserModel.findById(params.id);
    if (!target) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent self-demotion
    if (target._id.toString() === actor.id && actor.role === "super_admin") {
      return NextResponse.json(
        { success: false, error: "Super admins cannot modify themselves" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.role) {
      const allowed = assignableRoles(actor.role);
      if (!allowed.includes(parsed.data.role)) {
        throw new ForbiddenError(
          `Cannot assign role '${parsed.data.role}'`
        );
      }
      target.role = parsed.data.role;
    }

    if (parsed.data.name) target.name = parsed.data.name;

    await target.save();

    await createAuditLog({
      userId: actor.id,
      userName: actor.name,
      action: "user.update",
      resource: "user",
      resourceId: target._id.toString(),
      details: { newRole: parsed.data.role },
    });

    return NextResponse.json({ success: true, data: target.toJSON() });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode ?? 500 }
    );
  }
}

// ─── DELETE /api/users/[id] ───────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const actor = await requireAuth();

    if (!hasPermission(actor.role, "user:delete")) {
      throw new ForbiddenError();
    }

    if (params.id === actor.id) {
      return NextResponse.json(
        { success: false, error: "Cannot delete your own account" },
        { status: 403 }
      );
    }

    const target = await UserModel.findByIdAndDelete(params.id);
    if (!target) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    await createAuditLog({
      userId: actor.id,
      userName: actor.name,
      action: "user.delete",
      resource: "user",
      resourceId: params.id,
      details: { email: target.email },
    });

    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode ?? 500 }
    );
  }
}
