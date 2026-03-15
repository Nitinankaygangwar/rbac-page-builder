"use client";

import React, { useState, useCallback } from "react";
import {
  BookOpen, PenLine, ShieldCheck, Crown,
  Trash2, UserCog, CheckCircle2, XCircle,
  Loader2, Search, ShieldAlert,
} from "lucide-react";
import { can, assignableRoles } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";
import { formatDateRelative } from "@/lib/utils";

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt?: string;
}

interface Props {
  users: UserRow[];
  actorRole: Role;
  actorId: string;
}

const ROLE_CFG: Record<Role, { label: string; color: string; icon: React.ReactNode }> = {
  viewer:        { label: "Viewer",      color: "bg-ink-800 text-ink-400 border-ink-700",                   icon: <BookOpen size={11} />   },
  editor:        { label: "Editor",      color: "bg-sky-500/10 text-sky-400 border-sky-500/30",             icon: <PenLine size={11} />    },
  admin:         { label: "Admin",       color: "bg-amber-500/10 text-amber-400 border-amber-500/30",       icon: <ShieldCheck size={11} />},
  "super-admin": { label: "Super Admin", color: "bg-rose-500/10 text-rose-400 border-rose-500/30",          icon: <Crown size={11} />      },
};

export default function UsersClient({ users: initial, actorRole, actorId }: Props) {
  const [users,      setUsers]      = useState<UserRow[]>(initial);
  const [search,     setSearch]     = useState("");
  const [roleModal,  setRoleModal]  = useState<UserRow | null>(null);
  const [acting,     setActing]     = useState<Record<string, boolean>>({});
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Change role ────────────────────────────────────────────────────────────
  const changeRole = useCallback(async (userId: string, role: Role) => {
    setActing(a => ({ ...a, [userId]: true }));
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update role");

      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role } : u));
      setRoleModal(null);
      showToast(`Role updated to ${role}`);
    } catch (e: unknown) {
      showToast((e as Error).message, false);
    } finally {
      setActing(a => ({ ...a, [userId]: false }));
    }
  }, []);

  // ── Delete user ────────────────────────────────────────────────────────────
  const deleteUser = useCallback(async (userId: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    setActing(a => ({ ...a, [userId]: true }));
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete user");

      setUsers(prev => prev.filter(u => u._id !== userId));
      showToast(`${name} deleted`);
    } catch (e: unknown) {
      showToast((e as Error).message, false);
    } finally {
      setActing(a => ({ ...a, [userId]: false }));
    }
  }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const canManage = can(actorRole, "user:manage");   // super-admin only
  const canAssign = assignableRoles(actorRole).length > 0;

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

      {/* Role-change modal */}
      {roleModal && (
        <RoleModal
          user={roleModal}
          actorRole={actorRole}
          saving={!!acting[roleModal._id]}
          onSave={(role) => changeRole(roleModal._id, role)}
          onClose={() => setRoleModal(null)}
        />
      )}

      {/* Permission note */}
      <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${
        canManage
          ? "bg-rose-500/5 border-rose-500/15 text-rose-400"
          : "bg-amber-500/5 border-amber-500/15 text-amber-400"
      }`}>
        <ShieldAlert size={13} className="shrink-0 mt-0.5" />
        {canManage
          ? "Super Admin — you can reassign any role and delete users."
          : "Admin — you can assign viewer and editor roles. Only super-admins can delete users or assign admin roles."}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-600 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2.5 bg-ink-900 border border-ink-800 rounded-xl text-sm text-ink-100 placeholder:text-ink-600 outline-none focus:border-ink-600 transition"
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["viewer","editor","admin","super-admin"] as Role[]).map(r => {
          const cfg   = ROLE_CFG[r];
          const count = users.filter(u => u.role === r).length;
          return (
            <div key={r} className="bg-ink-900 border border-ink-800 rounded-xl px-4 py-3">
              <div className={`inline-flex items-center gap-1 text-xs mb-1 ${cfg.color.split(" ").slice(1).join(" ")}`}>
                {cfg.icon} {cfg.label}
              </div>
              <div className="text-2xl font-bold text-ink-50" style={{ fontFamily: "'Playfair Display',serif" }}>
                {count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-600">
          No users match your search
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const cfg      = ROLE_CFG[u.role];
            const isMe     = u._id === actorId;
            const isActing = acting[u._id];

            return (
              <div
                key={u._id}
                className="group bg-ink-900 border border-ink-800 hover:border-ink-700 rounded-xl px-5 py-4 transition-all"
              >
                <div className="flex items-center gap-4">

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-ink-800 border border-ink-700 flex items-center justify-center text-sm font-semibold text-ink-200 shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
                      <span className="font-semibold text-ink-100">{u.name}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {isMe && (
                        <span className="text-[10px] text-ink-600 bg-ink-800 border border-ink-700 px-1.5 py-0.5 rounded-full">
                          you
                        </span>
                      )}
                      {!u.isActive && (
                        <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-full">
                          inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-ink-600">
                      <span>{u.email}</span>
                      {u.createdAt && (
                        <span>joined {formatDateRelative(u.createdAt)}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isActing ? (
                      <Loader2 size={14} className="animate-spin text-ink-500" />
                    ) : (
                      <>
                        {/* Change role — admin+ (not self) */}
                        {canAssign && !isMe && (
                          <button
                            onClick={() => setRoleModal(u)}
                            className="flex items-center gap-1.5 border border-ink-700 text-ink-400 hover:text-ink-100 hover:border-ink-500 px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            <UserCog size={12} /> Change Role
                          </button>
                        )}

                        {/* Delete — super-admin only, not self */}
                        {canManage && !isMe && (
                          <button
                            onClick={() => deleteUser(u._id, u.name)}
                            className="flex items-center gap-1.5 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
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

      <p className="text-xs text-ink-700 text-center pt-2">
        {filtered.length} of {users.length} user{users.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ── Role Modal ────────────────────────────────────────────────────────────────

function RoleModal({
  user, actorRole, saving, onSave, onClose,
}: {
  user: UserRow;
  actorRole: Role;
  saving: boolean;
  onSave: (role: Role) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Role>(user.role);
  const available = assignableRoles(actorRole);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-ink-900 border border-ink-700 rounded-2xl p-6 w-full max-w-sm mx-4 animate-slide-up shadow-2xl">
        <h2 className="font-semibold text-ink-50 mb-1" style={{ fontFamily: "'Playfair Display',serif" }}>
          Change Role
        </h2>
        <p className="text-xs text-ink-500 mb-5">
          Updating role for <strong className="text-ink-300">{user.name}</strong>
        </p>

        <div className="space-y-2 mb-6">
          {available.map(role => {
            const cfg = ROLE_CFG[role];
            return (
              <button
                key={role}
                onClick={() => setSelected(role)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition text-sm ${
                  selected === role
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-ink-800 hover:border-ink-600"
                }`}
              >
                <span className={`inline-flex items-center gap-2 ${cfg.color.split(" ").slice(1).join(" ")}`}>
                  {cfg.icon}
                  <span className="capitalize">{cfg.label}</span>
                </span>
                {selected === role && <CheckCircle2 size={14} className="text-amber-400" />}
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
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-ink-950 text-sm font-semibold transition"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "Saving…" : "Save Role"}
          </button>
        </div>
      </div>
    </div>
  );
}