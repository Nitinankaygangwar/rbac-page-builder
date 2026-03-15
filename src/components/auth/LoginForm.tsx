"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn, Loader2, AlertCircle, Mail, Lock } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    // Root page.tsx handles role-based redirect
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm animate-fade-in">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="flex items-center gap-1.5 text-xs font-medium text-ink-400 uppercase tracking-wider">
          <Mail size={12} className="text-ink-600" /> Email
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(""); }}
          required
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2.5 text-sm text-ink-100 placeholder:text-ink-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 outline-none transition"
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="login-password" className="flex items-center gap-1.5 text-xs font-medium text-ink-400 uppercase tracking-wider">
          <Lock size={12} className="text-ink-600" /> Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            required
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-ink-100 placeholder:text-ink-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 outline-none transition"
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 transition"
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-amber-500/40 disabled:cursor-not-allowed text-ink-950 font-semibold py-2.5 rounded-lg text-sm transition-all"
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Signing in…</>
          : <><LogIn size={15} /> Sign In</>
        }
      </button>
    </form>
  );
}