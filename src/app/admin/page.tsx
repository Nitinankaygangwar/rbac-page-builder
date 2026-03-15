"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Shield, CheckCircle2, Eye, FileText, XCircle, Clock,
  RotateCcw, Loader2, Users, BookOpen, Filter, RefreshCw,
} from "lucide-react";
import { formatDateRelative } from "@/lib/utils";

type PageStatus = "draft" | "preview" | "published" | "archived";

interface Page {
  _id: string;
  title: string;
  slug: string;
  status: PageStatus;
  content: string;
  authorName: string;
  authorRole: string;
  updatedAt: string;
  publishedAt?: string;
}

const STATUS_CONFIG: Record<PageStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: "Draft",     color: "bg-ink-800 text-ink-400 border-ink-700",                   icon: <FileText size={11} /> },
  preview:   { label: "Preview",   color: "bg-sky-500/10 text-sky-400 border-sky-500/30",             icon: <Eye size={11} /> },
  published: { label: "Published", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 size={11} /> },
  archived:  { label: "Archived",  color: "bg-rose-500/10 text-rose-400 border-rose-500/30",          icon: <XCircle size={11} /> },
};

const ACTION_LABELS: Partial<Record<PageStatus, Array<{ action: string; label: string; style: string }>>> = {
  draft:     [{ action: "preview",  label: "Send to Preview", style: "border-sky-500/30 text-sky-400 hover:bg-sky-500/10" }],
  preview:   [
    { action: "publish",  label: "Publish",     style: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" },
    { action: "unpublish",label: "Back to Draft",style: "border-ink-700 text-ink-400 hover:bg-ink-800" },
  ],
  published: [
    { action: "archive",   label: "Archive",    style: "border-rose-500/30 text-rose-400 hover:bg-rose-500/10" },
    { action: "unpublish", label: "Unpublish",  style: "border-ink-700 text-ink-400 hover:bg-ink-800" },
  ],
  archived:  [{ action: "unpublish", label: "Restore to Draft", style: "border-ink-700 text-ink-400 hover:bg-ink-800" }],
};

export default function AdminPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [filterStatus, setFilterStatus] = useState<PageStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pages");
      const data = await res.json();
      setPages(data.data ?? []);
    } catch { showToast("Failed to load pages", "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const triggerAction = async (pageId: string, action: string) => {
    setActioning(a => ({ ...a, [pageId]: true }));
    try {
      const res = await fetch("/api/pages/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Page ${action}ed successfully!`);
      await fetchPages();
    } catch (e: unknown) {
      showToast((e as Error).message, "error");
    } finally {
      setActioning(a => ({ ...a, [pageId]: false }));
    }
  };

  const filtered = filterStatus === "all"
    ? pages
    : pages.filter(p => p.status === filterStatus);

  const counts = {
    all: pages.length,
    draft: pages.filter(p => p.status === "draft").length,
    preview: pages.filter(p => p.status === "preview").length,
    published: pages.filter(p => p.status === "published").length,
    archived: pages.filter(p => p.status === "archived").length,
  };

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      {toast && <Toast toast={toast} />}

      {/* Header */}
      <header className="border-b border-ink-800 bg-ink-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Shield size={14} className="text-amber-400" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-ink-50 leading-none">Admin Dashboard</h1>
              <p className="text-xs text-ink-500 mt-0.5">Manage and publish all pages</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchPages} className="p-2 text-ink-500 hover:text-ink-200 transition">
              <RefreshCw size={15} />
            </button>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-mono">
              role: admin
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {(["draft", "preview", "published", "archived"] as PageStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} className="bg-ink-900 border border-ink-800 rounded-xl px-4 py-3">
                <div className={`inline-flex items-center gap-1 text-xs mb-1 ${cfg.color.split(" ").slice(1).join(" ")}`}>
                  {cfg.icon} {cfg.label}
                </div>
                <div className="text-2xl font-display font-bold text-ink-50">{counts[s]}</div>
              </div>
            );
          })}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-6 bg-ink-900 border border-ink-800 rounded-xl p-1 w-fit">
          {(["all", "draft", "preview", "published", "archived"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${
                filterStatus === s
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/20"
                  : "text-ink-500 hover:text-ink-200"
              }`}
            >
              {s === "all" ? `All (${counts.all})` : `${s} (${counts[s]})`}
            </button>
          ))}
        </div>

        {/* Pages list */}
        {loading ? (
          <div className="flex items-center gap-2 justify-center text-ink-500 py-16">
            <Loader2 size={18} className="animate-spin" /> Loading pages…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-ink-600">
            <Filter size={28} className="mx-auto mb-3 text-ink-800" />
            No pages in this category
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(page => {
              const cfg = STATUS_CONFIG[page.status];
              const actions = ACTION_LABELS[page.status] ?? [];
              const isActioning = actioning[page._id];

              return (
                <div
                  key={page._id}
                  className="bg-ink-900 border border-ink-800 rounded-xl px-5 py-4 hover:border-ink-700 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <h3 className="font-semibold text-ink-100">{page.title}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-ink-600">
                        <span className="font-mono">/{page.slug}</span>
                        <span>by {page.authorName}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />{formatDateRelative(page.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isActioning ? (
                        <Loader2 size={15} className="animate-spin text-ink-500" />
                      ) : (
                        actions.map(({ action, label, style }) => (
                          <button
                            key={action}
                            onClick={() => triggerAction(page._id, action)}
                            className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-xs transition ${style}`}
                          >
                            {action === "publish" && <CheckCircle2 size={12} />}
                            {action === "preview" && <Eye size={12} />}
                            {action === "archive" && <XCircle size={12} />}
                            {(action === "unpublish" || action === "restore") && <RotateCcw size={12} />}
                            {label}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Toast({ toast }: { toast: { msg: string; type: "success" | "error" } }) {
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl text-sm animate-slide-up ${
      toast.type === "success"
        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
    }`}>
      {toast.type === "success" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      {toast.msg}
    </div>
  );
}
