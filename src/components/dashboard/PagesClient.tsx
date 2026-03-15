"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import {
  FileText, Eye, CheckCircle2, XCircle, Clock,
  PenLine, RotateCcw, Loader2, Search, BookOpen,
  ArrowRight, Inbox,
} from "lucide-react";
import { formatDateRelative } from "@/lib/utils";
import type { Role } from "@/lib/rbac";
import { can } from "@/lib/rbac";

type PageStatus = "draft" | "preview" | "published" | "archived";
type FilterTab = "all" | PageStatus;

interface PageRow {
  _id: string;
  title: string;
  slug: string;
  status: PageStatus;
  authorName: string;
  authorRole: string;
  authorId?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

interface Props {
  pages: PageRow[];
  userRole: Role;
  userId: string;
}

const STATUS_CFG: Record<PageStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: "Draft",     color: "bg-ink-800 text-ink-400 border-ink-700",                   icon: <FileText size={11} /> },
  preview:   { label: "Preview",   color: "bg-sky-500/10 text-sky-400 border-sky-500/30",             icon: <Eye size={11} /> },
  published: { label: "Published", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 size={11} /> },
  archived:  { label: "Archived",  color: "bg-rose-500/10 text-rose-400 border-rose-500/30",          icon: <XCircle size={11} /> },
};

// Which action buttons to show per current status (admin+ only)
const STATUS_ACTIONS: Record<PageStatus, Array<{ action: string; label: string; style: string; icon: React.ReactNode }>> = {
  draft:     [{ action: "preview",   label: "Preview",       style: "border-sky-500/30 text-sky-400 hover:bg-sky-500/10",         icon: <Eye size={11} /> }],
  preview:   [
    { action: "publish",   label: "Publish",       style: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10", icon: <CheckCircle2 size={11} /> },
    { action: "unpublish", label: "Back to Draft", style: "border-ink-700 text-ink-400 hover:bg-ink-800",                  icon: <RotateCcw size={11} /> },
  ],
  published: [
    { action: "archive",   label: "Archive",       style: "border-rose-500/30 text-rose-400 hover:bg-rose-500/10",         icon: <XCircle size={11} /> },
    { action: "unpublish", label: "Unpublish",     style: "border-ink-700 text-ink-400 hover:bg-ink-800",                  icon: <RotateCcw size={11} /> },
  ],
  archived:  [{ action: "unpublish", label: "Restore",       style: "border-ink-700 text-ink-400 hover:bg-ink-800",                  icon: <RotateCcw size={11} /> }],
};

export default function PagesClient({ pages: initialPages, userRole, userId }: Props) {
  const [pages,    setPages]    = useState<PageRow[]>(initialPages);
  const [tab,      setTab]      = useState<FilterTab>("all");
  const [search,   setSearch]   = useState("");
  const [acting,   setActing]   = useState<Record<string, boolean>>({});
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Status action (publish / archive / etc) ──────────────────────────────
  const triggerAction = useCallback(async (pageId: string, action: string) => {
    setActing(a => ({ ...a, [pageId]: true }));
    try {
      const res = await fetch("/api/pages/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");

      // Update local state — no full reload needed
      setPages(prev =>
        prev.map(p =>
          p._id === pageId
            ? { ...p, status: data.data.status as PageStatus }
            : p
        )
      );
      showToast(`Page ${action}ed successfully`);
    } catch (e: unknown) {
      showToast((e as Error).message, false);
    } finally {
      setActing(a => ({ ...a, [pageId]: false }));
    }
  }, []);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = pages.filter(p => {
    const matchTab    = tab === "all" || p.status === tab;
    const matchSearch = search === "" || p.title.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const counts = {
    all:       pages.length,
    draft:     pages.filter(p => p.status === "draft").length,
    preview:   pages.filter(p => p.status === "preview").length,
    published: pages.filter(p => p.status === "published").length,
    archived:  pages.filter(p => p.status === "archived").length,
  };

  const canPublish = can(userRole, "page:publish");
  const canEdit    = can(userRole, "page:edit");

  // ── Tabs to show per role ─────────────────────────────────────────────────
  const visibleTabs: FilterTab[] = userRole === "viewer"
    ? ["all", "published"]
    : ["all", "draft", "preview", "published", "archived"];

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl text-sm animate-slide-up ${
          toast.ok
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-rose-500/10 border-rose-500/30 text-rose-400"
        }`}>
          {toast.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Search + filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-600 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pages by title…"
            className="w-full pl-9 pr-4 py-2 bg-ink-900 border border-ink-800 rounded-xl text-sm text-ink-100 placeholder:text-ink-600 outline-none focus:border-ink-600 transition"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-ink-900 border border-ink-800 rounded-xl p-1 shrink-0">
          {visibleTabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize whitespace-nowrap ${
                tab === t
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/20"
                  : "text-ink-500 hover:text-ink-200"
              }`}
            >
              {t === "all" ? `All (${counts.all})` : `${t} (${counts[t]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Pages list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Inbox size={32} className="text-ink-800" />
          <p className="text-ink-500 text-sm">
            {search ? `No pages match "${search}"` : "No pages in this category"}
          </p>
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-amber-400 hover:text-amber-300 transition">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(page => {
            const cfg     = STATUS_CFG[page.status];
            const actions = STATUS_ACTIONS[page.status];
            const isMe    = page.authorId === userId;
            const isActing = acting[page._id];

            return (
              <div
                key={page._id}
                className="group bg-ink-900 border border-ink-800 hover:border-ink-700 rounded-xl px-5 py-4 transition-all"
              >
                <div className="flex items-center gap-4">

                  {/* Status dot */}
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${
                    page.status === "published" ? "bg-emerald-400" :
                    page.status === "preview"   ? "bg-sky-400"     :
                    page.status === "archived"  ? "bg-rose-400"    :
                    "bg-ink-600"
                  }`} />

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <h3 className="font-semibold text-ink-100 truncate group-hover:text-amber-300 transition">
                        {page.title}
                      </h3>
                      {isMe && (
                        <span className="text-[10px] text-ink-600 bg-ink-800 border border-ink-700 px-1.5 py-0.5 rounded-full">
                          mine
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-ink-600">
                      <span className="font-mono truncate">/{page.slug}</span>
                      <span>by {page.authorName}</span>
                      {page.updatedAt && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatDateRelative(page.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isActing ? (
                      <Loader2 size={14} className="animate-spin text-ink-500" />
                    ) : (
                      <>
                        {/* View published page */}
                        {page.status === "published" && (
                          <Link
                            href={`/preview/${page.slug}`}
                            className="flex items-center gap-1 border border-ink-700 text-ink-400 hover:text-ink-100 hover:border-ink-500 px-2.5 py-1.5 rounded-lg text-xs transition"
                          >
                            <BookOpen size={11} /> Read
                          </Link>
                        )}

                        {/* Edit — editor (own) or admin+ */}
                        {canEdit && (isMe || can(userRole, "page:delete")) && (
                          <Link
                            href={`/editor?id=${page._id}`}
                            className="flex items-center gap-1 border border-ink-700 text-ink-400 hover:text-ink-100 hover:border-ink-500 px-2.5 py-1.5 rounded-lg text-xs transition"
                          >
                            <PenLine size={11} /> Edit
                          </Link>
                        )}

                        {/* Publish / archive actions — admin+ */}
                        {canPublish && actions.map(({ action, label, style, icon }) => (
                          <button
                            key={action}
                            onClick={() => triggerAction(page._id, action)}
                            className={`flex items-center gap-1 border px-2.5 py-1.5 rounded-lg text-xs transition ${style}`}
                          >
                            {icon} {label}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className="text-xs text-ink-700 text-center pt-2">
          Showing {filtered.length} of {pages.length} page{pages.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
