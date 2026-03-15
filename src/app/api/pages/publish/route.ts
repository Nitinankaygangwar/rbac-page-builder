/**
 * POST /api/pages/publish
 * Transitions a page to "published". Requires page:publish permission (admin+).
 *
 * Body: { pageId: string, action?: "publish" | "unpublish" | "archive" }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import connectDB from "@/lib/db";
import PageModel from "@/models/Page";
import { can } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role: Role }).role;

  if (!can(role, "page:publish")) {
    return NextResponse.json(
      { error: "Forbidden: requires admin or super-admin role" },
      { status: 403 }
    );
  }

  await connectDB();

  const body = await req.json();
  const { pageId, action = "publish" } = body;

  if (!pageId) {
    return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  }

  const page = await PageModel.findById(pageId);
  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // Validate transition
  const transitions: Record<string, string> = {
    publish: "published",
    unpublish: "draft",
    preview: "preview",
    archive: "archived",
  };

  const nextStatus = transitions[action];
  if (!nextStatus) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  page.status = nextStatus as typeof page.status;
  if (nextStatus === "published") page.publishedAt = new Date();
  if (nextStatus === "draft") page.publishedAt = null;

  await page.save();

  return NextResponse.json({ success: true, data: page });
}