"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  Settings,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { hasPermission } from "@/lib/rbac/permissions";
import type { SessionUser } from "@/types";
import { cn } from "@/lib/utils";

const ROLE_COLORS: Record<string, string> = {
  viewer: "text-ink-400",
  editor: "text-sky-400",
  admin: "text-amber-400",
  super_admin: "text-rose-400",
};

export default function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/dashboard/pages",
      label: "Pages",
      icon: FileText,
    },
    ...(hasPermission(user.role, "user:read")
      ? [{ href: "/dashboard/users", label: "Users", icon: Users }]
      : []),
    ...(hasPermission(user.role, "settings:read")
      ? [{ href: "/dashboard/settings", label: "Settings", icon: Settings }]
      : []),
  ];

  return (
    <aside className="w-60 flex flex-col bg-ink-900 border-r border-ink-800 shrink-0">
      {/* Brand */}
      <div className="p-5 border-b border-ink-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <span className="text-amber-400 text-xs font-bold font-display">P</span>
          </div>
          <span className="font-display font-semibold text-ink-100">PageForge</span>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-ink-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-ink-700 border border-ink-600 flex items-center justify-center text-xs font-semibold text-ink-200">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-ink-100 truncate">{user.name}</div>
            <div className={cn("text-xs capitalize flex items-center gap-1", ROLE_COLORS[user.role])}>
              <ShieldCheck size={10} />
              {user.role.replace("_", " ")}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition group",
                active
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "text-ink-400 hover:text-ink-100 hover:bg-ink-800"
              )}
            >
              <item.icon size={16} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight size={12} className="opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-ink-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-500 hover:text-rose-400 hover:bg-rose-500/5 transition"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
