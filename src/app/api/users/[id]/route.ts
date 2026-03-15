import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/db";
import { requireAuth, ForbiddenError } from "@/lib/auth/guard";
import { can, assignableRoles } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";
import UserModel from "@/models/User";
import { createAuditLog } from "@/models/AuditLog";

const UpdateUserSchema = z.object({
  role: z.enum(["viewer", "editor", "admin", "super-admin"]).optional(),
  name: z.string().min(1).max(100).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const actor = await requireAuth();

    // "user:read" is the minimum — admins and super-admins have it
    if (!can(actor.role, "user:read")) {
      throw new ForbiddenError();
    }

    const target = await UserModel.findById(params.id);
    if (!target) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (target._id.toString() === actor.id) {
      return NextResponse.json(
        { success: false, error: "Cannot modify your own account" },
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
      if (!allowed.includes(parsed.data.role as Role)) {
        throw new ForbiddenError(`Cannot assign role '${parsed.data.role}'`);
      }
      target.role = parsed.data.role as Role;
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const actor = await requireAuth();

    // Only super-admin can delete users
    if (!can(actor.role, "user:manage")) {
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