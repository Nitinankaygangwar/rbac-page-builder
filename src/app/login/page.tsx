import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import AuthTabs from "@/components/auth/AuthTabs";

export const metadata = { title: "Sign In — PageForge" };

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink-950 px-4 py-12">
      {/* Radial glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.05)_0%,_transparent_55%)] pointer-events-none" />
      {/* Subtle grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-md animate-slide-up">

        {/* ── Logo ──────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <span className="text-amber-400 font-bold font-display text-base">P</span>
            </div>
            <span
              className="text-xl font-semibold text-ink-50 tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              PageForge
            </span>
          </div>
          <h1
            className="text-2xl font-semibold text-ink-50 mb-1"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Welcome to PageForge
          </h1>
          <p className="text-ink-400 text-sm">
            Sign in or create an account to get started
          </p>
        </div>

        {/* ── Auth card ─────────────────────────────────────────── */}
        <AuthTabs />

        {/* ── Demo credentials ──────────────────────────────────── */}
        <div className="mt-5 p-4 rounded-xl border border-ink-800 bg-ink-900/60 backdrop-blur">
          <p className="text-[10px] font-mono text-ink-600 uppercase tracking-widest mb-3">
            Demo accounts (password: Demo1234!)
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {[
              { role: "super-admin", label: "Super Admin", email: "superadmin@demo.com", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
              { role: "admin",       label: "Admin",       email: "admin@demo.com",      color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
              { role: "editor",      label: "Editor",      email: "editor@demo.com",     color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
              { role: "viewer",      label: "Viewer",      email: "viewer@demo.com",     color: "text-ink-400 bg-ink-800 border-ink-700" },
            ].map(u => (
              <div key={u.role} className="space-y-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border ${u.color}`}>
                  {u.label}
                </span>
                <p className="text-[11px] text-ink-600 font-mono truncate">{u.email}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}