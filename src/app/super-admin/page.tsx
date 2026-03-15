"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, CheckCircle2, Eye, FileText, XCircle, Clock,
  RotateCcw, Loader2, Users, Trash2, RefreshCw, UserCog,
  Crown, Filter, BookOpen, PenLine,
} from "lucide-react";
import { formatDateRelative } from "@/lib/utils";

type PageStatus = "draft" | "preview" | "published" | "archived";
type Role = "viewer" | "editor" | "admin" | "super-admin";
type TabView = "pages" | "users";

interface Page {
  _id: string;
  title: string;
  slug: string;
  status: PageStatus;
  authorName: string;
  authorRole: string;
  updatedAt: string;
  publishedAt?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

const STATUS_CONFIG: Record<PageStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: "Draft",     color: "bg-ink-800 text-ink-400 border-ink-700",                   icon: <FileText size={11} /> },
  preview:   { label: "Preview",   color: "bg-sky-500/10 text-sky-400 border-sky-500/30",             icon: <Eye size={11} /> },
  published: { label: "Published", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: <CheckCircle2 size={11} /> },
  archived:  { label: "Archived",  color: "bg-rose-500/10 text-rose-400 border-rose-500/30",          icon: <XCircle size={11} /> },
};

const ROLE_CONFIG: Record<Role, { color: string; icon: React.ReactNode }> = {
  viewer:       { color: "bg-ink-800 text-ink-400 border-ink-700",                   icon: <BookOpen size={11} /> },
  editor:       { color: "bg-sky-500/10 text-sky-400 border-sky-500/30",             icon: <PenLine size={11} /> },
  admin:        { color: "bg-amber-500/10 text-amber-400 border-amber-500/30",       icon: <Shield size={11} /> },
  "super-admin":{ color: "bg-rose-500/10 text-rose-400 border-rose-500/30",          icon: <Crown size={11} /> },
};

function Shield({ size }: { size: number }) {
  return <ShieldCheck size={size} />;
}

export default function SuperAdminPage() {
  const [tab, setTab] = useState<TabView>("pages");
  const [pages, setPages] = useState<Page[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterStatus, setFilterStatus] = useState<PageStatus | "all">("all");
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actioning, setActioning] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [roleModal, setRoleModal] = useState<User | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPages = useCallback(async () => {
    setLoadingPages(true);
    try {
      const res = await fetch("/api/pages");
      const data = await res.json();
      setPages(data.data ?? []);
    } catch { showToast("Failed to load pages", "error"); }
    finally { setLoadingPages(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.data?.items ?? []);
    } catch { showToast("Failed to load users", "error"); }
    finally { setLoadingUsers(false); }
  }, []);

  useEffect(() => { fetchPages(); fetchUsers(); }, [fetchPages, fetchUsers]);

  const triggerPageAction = async (pageId: string, action: string) => {
    setActioning(a => ({ ...a, [pageId]: true }));
    try {
      const res = await fetch("/api/pages/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Page ${action}ed!`);
      fetchPages();
    } catch (e: unknown) {
      showToast((e as Error).message, "error");
    } finally { setActioning(a => ({ ...a, [pageId]: false })); }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Permanently delete this user?")) return;
    setActioning(a => ({ ...a, [userId]: true }));
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("User deleted");
      fetchUsers();
    } catch (e: unknown) {
      showToast((e as Error).message, "error");
    } finally { setActioning(a => ({ ...a, [userId]: false })); }
  };

  const updateRole = async (userId: string, role: Role) => {
    setActioning(a => ({ ...a, [userId]: true }));
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast("Role updated!");
      setRoleModal(null);
      fetchUsers();
    } catch (e: unknown) {
      showToast((e as Error).message, "error");
    } finally { setActioning(a => ({ ...a, [userId]: false })); }
  };

  const filteredPages = filterStatus === "all" ? pages : pages.filter(p => p.status === filterStatus);
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
      {roleModal && (
        <RoleModal
          user={roleModal}
          onClose={() => setRoleModal(null)}
          onSave={(role) => updateRole(roleModal._id, role)}
          saving={!!actioning[roleModal._id]}
        />
      )}

      {/* Header */}
      <header className="border-b border-ink-800 bg-ink-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
              <Crown size={14} className="text-rose-400" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-ink-50 leading-none">Super Admin</h1>
              <p className="text-xs text-ink-500 mt-0.5">Full system control</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { fetchPages(); fetchUsers(); }} className="p-2 text-ink-500 hover:text-ink-200 transition">
              <RefreshCw size={15} />
            </button>
            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-full text-xs font-mono">
              role: super-admin
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-6 flex gap-1 pb-0">
          {(["pages", "users"] as TabView[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition capitalize ${
                tab === t
                  ? "border-rose-400 text-rose-300"
                  : "border-transparent text-ink-500 hover:text-ink-200"
              }`}
            >
              {t === "pages" ? <FileText size={14} /> : <Users size={14} />}
              {t === "pages" ? `Pages (${pages.length})` : `Users (${users.length})`}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">

        {/* ── PAGES TAB ──────────────────────────────────────────────────── */}
        {tab === "pages" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {(["draft","preview","published","archived"] as PageStatus[]).map(s => {
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

            {/* Filter */}
            <div className="flex items-center gap-1 mb-6 bg-ink-900 border border-ink-800 rounded-xl p-1 w-fit">
              {(["all","draft","preview","published","archived"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${
                    filterStatus === s
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/20"
                      : "text-ink-500 hover:text-ink-200"
                  }`}
                >
                  {s === "all" ? `All (${counts.all})` : `${s} (${counts[s]})`}
                </button>
              ))}
            </div>

            {loadingPages ? (
              <div className="flex items-center gap-2 justify-center text-ink-500 py-16">
                <Loader2 size={18} className="animate-spin" /> Loading…
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPages.map(page => {
                  const cfg = STATUS_CONFIG[page.status];
                  const isActioning = actioning[page._id];
                  return (
                    <div key={page._id} className="bg-ink-900 border border-ink-800 hover:border-ink-700 rounded-xl px-5 py-4 transition">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cfg.color}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                            <h3 className="font-semibold text-ink-100 truncate">{page.title}</h3>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-ink-600">
                            <span className="font-mono">/{page.slug}</span>
                            <span>by <span className="text-ink-400">{page.authorName}</span></span>
                            <span className="flex items-center gap-1"><Clock size={10} />{formatDateRelative(page.updatedAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isActioning ? (
                            <Loader2 size={15} className="animate-spin text-ink-500" />
                          ) : (
                            <>
                              {page.status !== "published" && (
                                <ActionBtn
                                  onClick={() => triggerPageAction(page._id, "publish")}
                                  className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                  icon={<CheckCircle2 size={12} />}
                                  label="Publish"
                                />
                              )}
                              {page.status === "published" && (
                                <ActionBtn
                                  onClick={() => triggerPageAction(page._id, "unpublish")}
                                  className="border-ink-700 text-ink-400 hover:bg-ink-800"
                                  icon={<RotateCcw size={12} />}
                                  label="Unpublish"
                                />
                              )}
                              {page.status !== "archived" && (
                                <ActionBtn
                                  onClick={() => triggerPageAction(page._id, "archive")}
                                  className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                                  icon={<XCircle size={12} />}
                                  label="Archive"
                                />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── USERS TAB ──────────────────────────────────────────────────── */}
        {tab === "users" && (
          <>
            <div className="mb-6 p-4 bg-rose-500/5 border border-rose-500/15 rounded-xl text-xs text-rose-400 flex items-center gap-2">
              <Crown size={13} />
              Super Admins can reassign any role and permanently delete users.
            </div>

            {loadingUsers ? (
              <div className="flex items-center gap-2 justify-center text-ink-500 py-16">
                <Loader2 size={18} className="animate-spin" /> Loading users…
              </div>
            ) : (
              <div className="space-y-3">
                {users.map(user => {
                  const roleCfg = ROLE_CONFIG[user.role];
                  const isActioning = actioning[user._id];
                  return (
                    <div key={user._id} className="bg-ink-900 border border-ink-800 hover:border-ink-700 rounded-xl px-5 py-4 transition">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-ink-800 border border-ink-700 flex items-center justify-center text-sm font-semibold text-ink-200">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-ink-100">{user.name}</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${roleCfg.color}`}>
                                {roleCfg.icon} {user.role}
                              </span>
                            </div>
                            <div className="text-xs text-ink-600 mt-0.5">{user.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isActioning ? (
                            <Loader2 size={15} className="animate-spin text-ink-500" />
                          ) : (
                            <>
                              <ActionBtn
                                onClick={() => setRoleModal(user)}
                                className="border-ink-700 text-ink-400 hover:bg-ink-800"
                                icon={<UserCog size={12} />}
                                label="Change Role"
                              />
                              <ActionBtn
                                onClick={() => deleteUser(user._id)}
                                className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                                icon={<Trash2 size={12} />}
                                label="Delete"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ActionBtn({
  onClick, className, icon, label,
}: {
  onClick: () => void;
  className: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-lg text-xs transition ${className}`}
    >
      {icon} {label}
    </button>
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

function RoleModal({
  user, onClose, onSave, saving,
}: {
  user: User;
  onClose: () => void;
  onSave: (role: Role) => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<Role>(user.role);
  const roles: Role[] = ["viewer", "editor", "admin", "super-admin"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-ink-900 border border-ink-700 rounded-2xl p-6 w-full max-w-sm mx-4 animate-slide-up shadow-2xl">
        <h2 className="font-display font-semibold text-ink-50 mb-1">Change Role</h2>
        <p className="text-xs text-ink-500 mb-5">Updating role for <strong className="text-ink-300">{user.name}</strong></p>

        <div className="space-y-2 mb-6">
          {roles.map(role => {
            const cfg = ROLE_CONFIG[role];
            return (
              <button
                key={role}
                onClick={() => setSelected(role)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition text-sm ${
                  selected === role
                    ? "border-rose-500/40 bg-rose-500/10"
                    : "border-ink-800 hover:border-ink-600"
                }`}
              >
                <span className={`inline-flex items-center gap-1.5 ${cfg.color.split(" ").slice(1).join(" ")}`}>
                  {cfg.icon}
                  <span className="capitalize">{role}</span>
                </span>
                {selected === role && <CheckCircle2 size={14} className="text-rose-400" />}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-ink-700 text-ink-400 hover:text-ink-200 text-sm transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(selected)}
            disabled={saving || selected === user.role}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white text-sm font-semibold transition"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "Saving…" : "Save Role"}
          </button>
        </div>
      </div>
    </div>
  );
}
