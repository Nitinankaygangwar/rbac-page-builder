import React from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import connectDB from "@/lib/db";
import PageModel from "@/models/Page";
import UserModel from "@/models/User";
import { can } from "@/lib/rbac";
import { formatDateRelative } from "@/lib/utils";
import Link from "next/link";
import {
  Plus, FileText, Eye, CheckCircle2, XCircle,
  BookOpen, Users, PenLine, Shield, Crown,
} from "lucide-react";
import type { Role } from "@/lib/rbac";
import PagesClient from "@/components/dashboard/PagesClient";
import LogoutButton from "@/components/dashboard/LogoutButton";

export const metadata = { title: "Dashboard — PageForge" };

type PageStatus = "draft" | "preview" | "published" | "archived";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const ROLE_META: Record<Role, { label: string; color: string; icon: React.ReactNode }> = {
  viewer:       { label: "Viewer",      color: "bg-ink-800 text-ink-400 border-ink-700",                   icon: <BookOpen size={12} /> },
  editor:       { label: "Editor",      color: "bg-sky-500/10 text-sky-400 border-sky-500/30",             icon: <PenLine size={12} /> },
  admin:        { label: "Admin",       color: "bg-amber-500/10 text-amber-400 border-amber-500/30",       icon: <Shield size={12} /> },
  "super-admin":{ label: "Super Admin", color: "bg-rose-500/10 text-rose-400 border-rose-500/30",          icon: <Crown size={12} /> },
};

const STATUS_META: Record<PageStatus, { label: string; color: string; dot: string }> = {
  draft:     { label: "Draft",     color: "bg-ink-800 text-ink-400 border-ink-700",                   dot: "bg-ink-500"     },
  preview:   { label: "Preview",   color: "bg-sky-500/10 text-sky-400 border-sky-500/30",             dot: "bg-sky-400"     },
  published: { label: "Published", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  archived:  { label: "Archived",  color: "bg-rose-500/10 text-rose-400 border-rose-500/30",          dot: "bg-rose-400"    },
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  await connectDB();

  // ── Role-filtered page query ─────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (user.role === "viewer") {
    // viewers: published only
    filter.status = "published";
  } else if (user.role === "editor") {
    // editors: their own pages + all published
    filter.$or = [{ authorId: user.id }, { status: "published" }];
  }
  // admin / super-admin: no filter → all pages

  const [pages, totalUsers] = await Promise.all([
    PageModel.find(filter).sort({ updatedAt: -1 }).limit(100).lean(),
    can(user.role, "user:read") ? UserModel.countDocuments() : null,
  ]);

  // ── Counts ───────────────────────────────────────────────────────────────
  const counts = {
    all:       pages.length,
    draft:     pages.filter(p => p.status === "draft").length,
    preview:   pages.filter(p => p.status === "preview").length,
    published: pages.filter(p => p.status === "published").length,
    archived:  pages.filter(p => p.status === "archived").length,
  };

  const roleMeta   = ROLE_META[user.role];

  // Serialize for client component (lean() returns plain objects but dates need toString)
  const serialized = pages.map(p => ({
    _id:        p._id.toString(),
    title:      p.title,
    slug:       p.slug,
    status:     p.status as PageStatus,
    authorName: p.authorName,
    authorRole: p.authorRole,
    authorId:   p.authorId?.toString(),
    updatedAt:  p.updatedAt?.toISOString(),
    publishedAt:p.publishedAt?.toISOString() ?? null,
  }));

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-ink-800 bg-ink-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <span className="text-amber-400 text-xs font-bold" style={{ fontFamily: "'Playfair Display',serif" }}>P</span>
            </div>
            <div>
              <h1 className="font-semibold text-ink-50 leading-none" style={{ fontFamily: "'Playfair Display',serif" }}>
                PageForge
              </h1>
              <p className="text-xs text-ink-500 mt-0.5">Content Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Role badge */}
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-mono ${roleMeta.color}`}>
              {roleMeta.icon} {roleMeta.label}
            </span>

            {/* User management link — admin+ */}
            {can(user.role, "user:read") && (
              <Link
                href="/dashboard/users"
                className="flex items-center gap-1.5 border border-ink-700 text-ink-400 hover:text-ink-100 hover:border-ink-500 px-3 py-1.5 rounded-lg text-xs transition"
              >
                <Users size={13} /> Users {totalUsers !== null && <span className="bg-ink-700 px-1.5 py-0.5 rounded-full">{totalUsers}</span>}
              </Link>
            )}

            {/* Create button — editor+ */}
            {can(user.role, "page:create") && (
              <Link
                href="/editor"
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-ink-950 font-semibold px-3 py-1.5 rounded-lg text-xs transition"
              >
                <Plus size={13} /> New Page
              </Link>
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-ink-800" />

            {/* User avatar + name */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-ink-700 border border-ink-600 flex items-center justify-center text-xs font-semibold text-ink-200 shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:block text-xs text-ink-400 max-w-[100px] truncate">
                {user.name}
              </span>
            </div>

            {/* Logout */}
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 animate-fade-in">

        {/* ── Welcome + stats row ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-semibold text-ink-50" style={{ fontFamily: "'Playfair Display',serif" }}>
              Hello, {user.name.split(" ")[0]} 👋
            </h2>
            <p className="text-ink-500 text-sm mt-0.5">
              {user.role === "viewer"
                ? "Browsing published pages"
                : user.role === "editor"
                ? "Your drafts and all published content"
                : "All pages across all authors"}
            </p>
          </div>

          {/* Mini stat pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["draft","preview","published","archived"] as PageStatus[]).map(s => {
              const m = STATUS_META[s];
              if (user.role === "viewer" && s !== "published") return null;
              const count = counts[s];
              return (
                <div key={s} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${m.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                  {count} {m.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Pages list (client component for filter tabs + publish actions) */}
        <PagesClient
          pages={serialized}
          userRole={user.role}
          userId={user.id}
        />
      </div>
    </div>
  );
}