"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Eye, EyeOff, UserPlus, Loader2, CheckCircle2,
  AlertCircle, User, Mail, Lock, ShieldCheck,
} from "lucide-react";

interface FieldError {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

// Password strength levels
function getPasswordStrength(pw: string): {
  score: number;    // 0-4
  label: string;
  color: string;
} {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { label: "Too short",  color: "bg-rose-500" },
    { label: "Weak",       color: "bg-rose-400" },
    { label: "Fair",       color: "bg-amber-400" },
    { label: "Good",       color: "bg-sky-400"   },
    { label: "Strong",     color: "bg-emerald-400" },
  ];
  return { score, ...levels[score] };
}

export default function SignupForm() {
  const router = useRouter();

  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors]           = useState<FieldError>({});
  const [apiError, setApiError]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);

  const pwStrength = getPasswordStrength(password);

  // ── Client-side validation ─────────────────────────────────────────────────

  function validate(): boolean {
    const e: FieldError = {};
    if (name.trim().length < 2)
      e.name = "Name must be at least 2 characters";
    if (!/^\S+@\S+\.\S+$/.test(email))
      e.email = "Please enter a valid email address";
    if (password.length < 8)
      e.password = "Password must be at least 8 characters";
    else if (!/[A-Z]/.test(password))
      e.password = "Password must contain at least one uppercase letter";
    else if (!/[0-9]/.test(password))
      e.password = "Password must contain at least one number";
    if (password !== confirmPw)
      e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword: confirmPw }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApiError(data.error ?? "Signup failed. Please try again.");
        return;
      }

      // Account created — auto sign-in
      setSuccess(true);
      await new Promise(r => setTimeout(r, 800)); // brief success flash

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Created but sign-in failed — send to login
        router.push("/login");
        return;
      }

      router.push("/viewer");
      router.refresh();
    } catch {
      setApiError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle2 size={22} className="text-emerald-400" />
        </div>
        <p className="text-emerald-400 font-medium text-sm">Account created!</p>
        <p className="text-ink-500 text-xs">Signing you in…</p>
        <Loader2 size={16} className="animate-spin text-ink-500 mt-1" />
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* API error */}
      {apiError && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm animate-fade-in">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Name */}
      <Field
        id="signup-name"
        label="Full Name"
        icon={<User size={14} />}
        error={errors.name}
      >
        <input
          id="signup-name"
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: undefined })); }}
          placeholder="Jane Smith"
          autoComplete="name"
          className={inputCls(!!errors.name)}
        />
      </Field>

      {/* Email */}
      <Field
        id="signup-email"
        label="Email Address"
        icon={<Mail size={14} />}
        error={errors.email}
      >
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }}
          placeholder="you@example.com"
          autoComplete="email"
          className={inputCls(!!errors.email)}
        />
      </Field>

      {/* Password */}
      <Field
        id="signup-password"
        label="Password"
        icon={<Lock size={14} />}
        error={errors.password}
      >
        <div className="relative">
          <input
            id="signup-password"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
            placeholder="Min 8 chars, one uppercase, one number"
            autoComplete="new-password"
            className={inputCls(!!errors.password) + " pr-10"}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 transition"
            tabIndex={-1}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {/* Strength meter */}
        {password.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i < pwStrength.score ? pwStrength.color : "bg-ink-800"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-ink-500">
              Strength: <span className={
                pwStrength.score <= 1 ? "text-rose-400" :
                pwStrength.score === 2 ? "text-amber-400" :
                pwStrength.score === 3 ? "text-sky-400" : "text-emerald-400"
              }>{pwStrength.label}</span>
            </p>
          </div>
        )}
      </Field>

      {/* Confirm password */}
      <Field
        id="signup-confirm"
        label="Confirm Password"
        icon={<Lock size={14} />}
        error={errors.confirmPassword}
      >
        <div className="relative">
          <input
            id="signup-confirm"
            type={showConfirm ? "text" : "password"}
            value={confirmPw}
            onChange={e => { setConfirmPw(e.target.value); setErrors(p => ({ ...p, confirmPassword: undefined })); }}
            placeholder="Repeat your password"
            autoComplete="new-password"
            className={inputCls(!!errors.confirmPassword) + " pr-10"}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-300 transition"
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          {/* Match indicator */}
          {confirmPw.length > 0 && (
            <div className="absolute right-9 top-1/2 -translate-y-1/2">
              {confirmPw === password
                ? <CheckCircle2 size={13} className="text-emerald-400" />
                : <AlertCircle size={13} className="text-rose-400" />
              }
            </div>
          )}
        </div>
      </Field>

      {/* Role note */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-ink-800/60 border border-ink-700 text-xs text-ink-500">
        <ShieldCheck size={13} className="shrink-0 mt-0.5 text-ink-400" />
        <span>New accounts start with <strong className="text-ink-300">Viewer</strong> access. Contact an admin to request a role upgrade.</span>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:bg-amber-500/40 disabled:cursor-not-allowed text-ink-950 font-semibold py-2.5 rounded-lg text-sm transition-all"
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /> Creating account…</>
          : <><UserPlus size={15} /> Create Account</>
        }
      </button>
    </form>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Field({
  id, label, icon, error, children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-medium text-ink-400 uppercase tracking-wider">
        <span className="text-ink-600">{icon}</span>
        {label}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-rose-400 animate-fade-in">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return [
    "w-full bg-ink-800 border rounded-lg px-3 py-2.5 text-sm text-ink-100",
    "placeholder:text-ink-600 outline-none transition-all",
    hasError
      ? "border-rose-500/50 focus:border-rose-500/80 focus:ring-1 focus:ring-rose-500/20"
      : "border-ink-700 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20",
  ].join(" ");
}
