"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  PenLine, Save, Eye, FileText, Clock, CheckCircle2,
  XCircle, Plus, ArrowLeft, Loader2, AlertCircle,
} from "lucide-react";
import { formatDateRelative, slugify } from "@/lib/utils";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

type PageStatus = "draft" | "preview" | "published" | "archived";

interface Page {
  _id: string;
  title: string;
  slug: string;
  status: PageStatus;
  content: string;
  authorName: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<PageStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: "Draft",     color: "bg-ink-800 text-ink-400 border-ink-700",                icon: <FileText size={11} /> },
  preview:   { label: "Preview",   color: "bg-sky-500/10 text-sky-400 border-sky-500/30",          icon: <Eye size={11} /> },
  published: { label: "Published", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 size={11} /> },
  archived:  { label: "Archived",  color: "bg-rose-500/10 text-rose-400 border-rose-500/30",       icon: <XCircle size={11} /> },
};

type ViewMode = "list" | "edit" | "new";

export default function EditorPage() {
  const { data: session } = useSession();
  const [view, setView] = useState<ViewMode>("list");
  const [pages, setPages] = useState<Page[]>([]);
  const [selected, setSelected] = useState<Page | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pages");
      const data = await res.json();
      setPages(data.data ?? []);
    } catch { showToast("Failed to load pages", "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPages(); }, [loadPages]);

  const openEdit = (page: Page) => {
    setSelected(page);
    setTitle(page.title);
    setContent(page.content);
    setView("edit");
  };

  const openNew = () => {
    setSelected(null);
    setTitle("");
    setContent("");
    setView("new");
  };

  const savePage = async (requestedStatus?: string) => {
    if (!title.trim()) { showToast("Title is required", "error"); return; }
    setSaving(true);
    try {
      if (view === "new") {
        const res = await fetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast("Draft created!");
        await loadPages();
        setView("list");
      } else if (selected) {
        const body: Record<string, string> = { title, content };
        if (requestedStatus) body.status = requestedStatus;
        const res = await fetch(`/api/pages/${selected._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast(requestedStatus === "preview" ? "Sent to preview!" : "Changes saved!");
        await loadPages();
        setView("list");
      }
    } catch (e: unknown) {
      showToast((e as Error).message ?? "Something went wrong", "error");
    } finally { setSaving(false); }
  };

  const myPages = pages.filter(p =>
    p.authorName === session?.user?.name || ["draft","preview"].includes(p.status)
  );

  // ── List view ──────────────────────────────────────────────────────────────

  if (view === "list") {
    return (
      <div className="min-h-screen bg-ink-950 text-ink-100">
        <Toast toast={toast} />

        {/* Top bar */}
        <header className="border-b border-ink-800 bg-ink-900/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
                <PenLine size={14} className="text-sky-400" />
              </div>
              <div>
                <h1 className="font-display font-semibold text-ink-50 leading-none">Editor Dashboard</h1>
                <p className="text-xs text-ink-500 mt-0.5">Create and manage your pages</p>
              </div>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-ink-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all active:scale-95"
            >
              <Plus size={15} /> New Page
            </button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
          {/* Role badge */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1 rounded-full text-xs font-mono">
              role: editor
            </span>
            <span className="text-ink-600">You can create drafts and request previews</span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-ink-500 py-12 justify-center">
              <Loader2 size={18} className="animate-spin" /> Loading pages…
            </div>
          ) : myPages.length === 0 ? (
            <EmptyState onNew={openNew} />
          ) : (
            <div className="space-y-3">
              {myPages.map((page) => (
                <PageRow key={page._id} page={page} onEdit={() => openEdit(page)} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Edit / New view ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <Toast toast={toast} />

      <header className="border-b border-ink-800 bg-ink-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-1.5 text-ink-400 hover:text-ink-100 text-sm transition"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div className="flex-1 text-center">
            <span className="text-sm text-ink-400">
              {view === "new" ? "New Page" : `Editing: ${selected?.title}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {view === "edit" && selected?.status === "draft" && (
              <button
                onClick={() => savePage("preview")}
                disabled={saving}
                className="flex items-center gap-1.5 border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 px-3 py-1.5 rounded-lg text-sm transition"
              >
                <Eye size={14} /> Request Preview
              </button>
            )}
            <button
              onClick={() => savePage()}
              disabled={saving}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-ink-950 font-semibold px-4 py-1.5 rounded-lg text-sm transition"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving…" : "Save Draft"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 animate-slide-up space-y-5">
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page title…"
            className="w-full bg-transparent text-3xl font-display font-bold text-ink-50 placeholder:text-ink-700 outline-none border-b border-ink-800 pb-3 focus:border-amber-500/40 transition"
          />
          {title && (
            <p className="text-xs text-ink-600 mt-1 font-mono">
              slug: /{slugify(title)}
            </p>
          )}
        </div>

        <Editor
          content={content}
          onChange={setContent}
          editable={true}
          placeholder="Start writing your page content here…"
        />

        <div className="flex items-center gap-2 text-xs text-ink-600 pt-2">
          <AlertCircle size={12} />
          Editors can save drafts and request previews. Publishing requires an Admin.
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PageRow({ page, onEdit }: { page: Page; onEdit: () => void }) {
  const cfg = STATUS_CONFIG[page.status];
  return (
    <div className="group flex items-center gap-4 bg-ink-900 border border-ink-800 hover:border-ink-700 rounded-xl px-5 py-4 transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </span>
          <h3 className="font-semibold text-ink-100 truncate">{page.title}</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-600">
          <span className="font-mono">/{page.slug}</span>
          <span className="flex items-center gap-1"><Clock size={10} />{formatDateRelative(page.updatedAt)}</span>
        </div>
      </div>
      <button
        onClick={onEdit}
        className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-xs border border-ink-700 text-ink-400 hover:text-ink-100 hover:border-ink-500 px-3 py-1.5 rounded-lg transition"
      >
        <PenLine size={12} /> Edit
      </button>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-ink-900 border border-ink-800 flex items-center justify-center mb-4">
        <FileText size={24} className="text-ink-600" />
      </div>
      <p className="text-ink-400 font-medium mb-1">No pages yet</p>
      <p className="text-ink-600 text-sm mb-6">Create your first page to get started</p>
      <button
        onClick={onNew}
        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-ink-950 font-semibold px-5 py-2.5 rounded-lg text-sm transition"
      >
        <Plus size={15} /> Create First Page
      </button>
    </div>
  );
}

function Toast({ toast }: { toast: { msg: string; type: "success" | "error" } | null }) {
  if (!toast) return null;
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