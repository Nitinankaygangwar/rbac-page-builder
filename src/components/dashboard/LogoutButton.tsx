"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-1.5 border border-ink-700 text-ink-500 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/5 px-3 py-1.5 rounded-lg text-xs transition-all"
      title="Sign out"
    >
      <LogOut size={13} />
      <span className="hidden sm:inline">Sign Out</span>
    </button>
  );
}