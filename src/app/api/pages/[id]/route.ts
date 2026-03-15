/**
 * GET    /api/pages/[id]  — get single page
 * PATCH  /api/pages/[id]  — update page (content, status)
 * DELETE /api/pages/[id]  — delete page (admin+)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDB from "@/lib/db";
import { requireAuth, ForbiddenError } from "@/lib/auth/guard";
import {
  can,
  canEditPage,
  canDeletePage,
} from "@/lib/rbac";
import PageModel from "@/models/Page";
import { createAuditLog } from "@/models/AuditLog";
import type { PageStatus } from "@/models/Page";

const UpdatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  content: z.string().optional(),
  status: z.enum(["draft", "preview", "published", "archived"]).optional(),
});

// ─── GET /api/pages/[id] ──────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const page = await PageModel.findById(params.id).lean();
    if (!page) {
      return NextResponse.json(
        { success: false, error: "Page not found" },
        { status: 404 }
      );
    }

    // Published pages are public; others require auth
    if (page.status !== "published") {
      const user = await requireAuth();
      if (
        user.role === "viewer" ||
        (user.role === "editor" && page.authorId.toString() !== user.id)
      ) {
        return NextResponse.json(
          { success: false, error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, data: page });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    return NextResponse.json(
      { success: false, error: error.message ?? "Server error" },
      { status: error.statusCode ?? 500 }
    );
  }
}

// ─── PATCH /api/pages/[id] ────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const user = await requireAuth();

    const page = await PageModel.findById(params.id);
    if (!page) {
      return NextResponse.json(
        { success: false, error: "Page not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = UpdatePageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status: newStatus, ...rest } = parsed.data;

    // ── Permission checks ──────────────────────────────────────────────────────

    // Content / metadata edits
    if (Object.keys(rest).length > 0) {
      const allowed = canEditPage(user.role, page.authorId.toString(), user.id);
      if (!allowed) throw new ForbiddenError("Cannot edit this page");
    }

    // Status transitions
    if (newStatus) {
      await checkStatusTransition(
        page.status as PageStatus,
        newStatus,
        user.role,
        page.authorId.toString(),
        user.id
      );
    }

    // ── Apply update ───────────────────────────────────────────────────────────

    if (Object.keys(rest).length > 0) {
      Object.assign(page, rest);
      page.lastEditedById = user.id;
      page.lastEditedByName = user.name;
    }

    if (newStatus) {
      page.status = newStatus;
      if (newStatus === "published" && !page.publishedAt) {
        page.publishedAt = new Date();
      }
      if (newStatus === "draft") {
        page.publishedAt = null;
      }
    }

    await page.save();

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: newStatus ? `page.status.${newStatus}` : "page.update",
      resource: "page",
      resourceId: page._id.toString(),
      details: { title: page.title, newStatus },
    });

    return NextResponse.json({ success: true, data: page.toJSON() });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    return NextResponse.json(
      { success: false, error: error.message ?? "Server error" },
      { status: error.statusCode ?? 500 }
    );
  }
}

// ─── DELETE /api/pages/[id] ───────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const user = await requireAuth();

    const page = await PageModel.findById(params.id);
    if (!page) {
      return NextResponse.json(
        { success: false, error: "Page not found" },
        { status: 404 }
      );
    }

    if (!canDeletePage(user.role, page.authorId.toString(), user.id)) {
      throw new ForbiddenError("Cannot delete this page");
    }

    await page.deleteOne();

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      action: "page.delete",
      resource: "page",
      resourceId: params.id,
      details: { title: page.title },
    });

    return NextResponse.json({ success: true, message: "Page deleted" });
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    return NextResponse.json(
      { success: false, error: error.message ?? "Server error" },
      { status: error.statusCode ?? 500 }
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validates allowed status transitions per role.
 *
 * Allowed transitions:
 *   editor:       draft → preview
 *   admin+:       draft → preview → published → archived (and back)
 */
async function checkStatusTransition(
  current: PageStatus,
  next: PageStatus,
  role: string,
  authorId: string,
  userId: string
) {
  // Publishing requires explicit permission
  if (next === "published" || next === "archived") {
    if (!can(role as never, "page:publish")) {
      throw new ForbiddenError("Only admins can publish or archive pages");
    }
    return;
  }

  // Editors can move to preview (their own pages only)
  if (next === "preview") {
    if (role === "editor" && authorId !== userId) {
      throw new ForbiddenError("Editors can only preview their own pages");
    }
    if (!can(role as never, "page:edit")) {
      throw new ForbiddenError("Insufficient permissions for status change");
    }
    return;
  }

  // Moving back to draft — editor (own) or admin+
  if (next === "draft") {
    if (role === "editor" && authorId !== userId) {
      throw new ForbiddenError("Editors can only revert their own pages");
    }
    return;
  }
}