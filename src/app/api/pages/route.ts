/**
 * GET  /api/pages  – list pages (role-filtered)
 * POST /api/pages  – create draft (editor+)
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import connectDB from "@/lib/db";
import PageModel from "@/models/Page";
import { can } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";
import { slugify } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role: Role }).role;
  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (role === "viewer") {
    filter.status = "published";
  } else if (role === "editor") {
    filter.$or = [
      { authorId: (session.user as { id: string }).id },
      { status: "published" },
    ];
    if (status) filter.status = status;
  } else {
    if (status) filter.status = status;
  }

  const pages = await PageModel.find(filter).sort({ updatedAt: -1 }).lean();
  return NextResponse.json({ success: true, data: pages });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role: Role }).role;
  const userId = (session.user as { id: string }).id;
  const userName = session.user.name ?? "Unknown";

  if (!can(role, "page:create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await connectDB();
  const { title, content } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const base = slugify(title);
  let slug = base;
  let i = 0;
  while (await PageModel.findOne({ slug })) slug = `${base}-${++i}`;

  const page = await PageModel.create({
    title: title.trim(),
    slug,
    content: content ?? "",
    status: "draft",
    authorId: userId,
    authorName: userName,
    authorRole: role,
  });

  return NextResponse.json({ success: true, data: page }, { status: 201 });
}
