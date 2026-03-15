import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import connectDB from "@/lib/db";
import UserModel from "@/models/User";
import { can } from "@/lib/rbac";
import type { Role } from "@/lib/rbac";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import LogoutButton from "@/components/dashboard/LogoutButton";
import UsersClient from "@/components/dashboard/UsersClient";

export const metadata = { title: "Users — PageForge" };

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;

  // Only admin+ can access this page
  if (!can(user.role, "user:read")) redirect("/dashboard");

  await connectDB();

  const users = await UserModel.find()
    .sort({ createdAt: -1 })
    .lean();

  const serialized = users.map(u => ({
    _id:       u._id.toString(),
    name:      u.name,
    email:     u.email,
    role:      u.role as Role,
    isActive:  u.isActive,
    createdAt: u.createdAt?.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="border-b border-ink-800 bg-ink-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-ink-500 hover:text-ink-100 text-sm transition"
            >
              <ArrowLeft size={15} /> Dashboard
            </Link>
            <div className="w-px h-4 bg-ink-800" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Users size={13} className="text-amber-400" />
              </div>
              <div>
                <h1 className="font-semibold text-ink-50 text-sm leading-none"
                  style={{ fontFamily: "'Playfair Display',serif" }}>
                  User Management
                </h1>
                <p className="text-xs text-ink-500 mt-0.5">{serialized.length} registered users</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-ink-700 border border-ink-600 flex items-center justify-center text-xs font-semibold text-ink-200">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:block text-xs text-ink-400">{user.name}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
        <UsersClient
          users={serialized}
          actorRole={user.role}
          actorId={user.id}
        />
      </div>
    </div>
  );
}
