"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpen, Clock, Search, Eye, ArrowRight, Loader2, Inbox } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Page {
  _id: string;
  title: string;
  slug: string;
  content: string;
  authorName: string;
  publishedAt: string;
  updatedAt: string;
}

export default function ViewerPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [selected, setSelected] = useState<Page | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pages?status=published");
      const data = await res.json();
      setPages(data.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const filtered = pages.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  // ── Reading view ────────────────────────────────────────────────────────────

  if (selected) {
    return (
      <div className="min-h-screen bg-ink-950 text-ink-100">
        <header className="border-b border-ink-800 bg-ink-900/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1.5 text-ink-400 hover:text-ink-100 text-sm transition"
            >
              ← Back to pages
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs">
                Published
              </span>
            </div>
          </div>
        </header>

        <article className="max-w-3xl mx-auto px-6 py-12 animate-fade-in">
          <header className="mb-10 pb-8 border-b border-ink-800">
            <h1 className="text-4xl font-display font-bold text-ink-50 leading-tight mb-4">
              {selected.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-ink-500">
              <span>By {selected.authorName}</span>
              {selected.publishedAt && (
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {formatDate(selected.publishedAt)}
                </span>
              )}
            </div>
          </header>

          <div
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: selected.content }}
          />
        </article>
      </div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <header className="border-b border-ink-800 bg-ink-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-ink-800 border border-ink-700 flex items-center justify-center">
              <BookOpen size={14} className="text-ink-400" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-ink-50 leading-none">Published Pages</h1>
              <p className="text-xs text-ink-500 mt-0.5">Read-only · Viewer access</p>
            </div>
          </div>
          <span className="bg-ink-800 text-ink-400 border border-ink-700 px-2.5 py-1 rounded-full text-xs font-mono">
            role: viewer
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 animate-fade-in">
        {/* Search */}
        <div className="relative mb-8">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pages…"
            className="w-full pl-9 pr-4 py-2.5 bg-ink-900 border border-ink-800 rounded-xl text-sm text-ink-100 placeholder:text-ink-600 outline-none focus:border-ink-600 transition"
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 justify-center text-ink-500 py-16">
            <Loader2 size={18} className="animate-spin" /> Loading published pages…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Inbox size={32} className="text-ink-700 mx-auto mb-3" />
            <p className="text-ink-500">
              {search ? "No pages match your search" : "No published pages yet"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((page) => (
              <button
                key={page._id}
                onClick={() => setSelected(page)}
                className="group text-left bg-ink-900 border border-ink-800 hover:border-ink-600 rounded-xl p-5 transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h2 className="font-semibold text-ink-100 group-hover:text-amber-300 transition line-clamp-2 leading-snug">
                    {page.title}
                  </h2>
                  <ArrowRight size={14} className="text-ink-700 group-hover:text-amber-400 shrink-0 mt-0.5 transition" />
                </div>
                <div
                  className="text-xs text-ink-600 line-clamp-2 mb-4"
                  dangerouslySetInnerHTML={{
                    __html: page.content.replace(/<[^>]*>/g, " ").slice(0, 120) + "…",
                  }}
                />
                <div className="flex items-center justify-between text-xs text-ink-600">
                  <span className="flex items-center gap-1">
                    <Eye size={10} /> {page.authorName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {page.publishedAt ? formatDate(page.publishedAt) : formatDate(page.updatedAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Viewer read-only notice */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 bg-ink-900/90 backdrop-blur border border-ink-700 px-4 py-2 rounded-full text-xs text-ink-500 shadow-lg">
          <BookOpen size={11} />
          Viewer access — read only
        </div>
      </div>
    </div>
  );
}