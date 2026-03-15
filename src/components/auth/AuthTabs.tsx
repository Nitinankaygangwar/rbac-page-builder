"use client";

import React, { useState, Suspense } from "react";
import { LogIn, UserPlus } from "lucide-react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

type Tab = "login" | "signup";

export default function AuthTabs() {
  const [tab, setTab] = useState<Tab>("login");

  return (
    <div className="bg-ink-900 border border-ink-800 rounded-2xl shadow-2xl overflow-hidden">

      {/* ── Tab bar ──────────────────────────────────────────────── */}
      <div className="flex border-b border-ink-800 bg-ink-950/40">
        <TabButton
          active={tab === "login"}
          onClick={() => setTab("login")}
          icon={<LogIn size={14} />}
          label="Sign In"
        />
        <TabButton
          active={tab === "signup"}
          onClick={() => setTab("signup")}
          icon={<UserPlus size={14} />}
          label="Create Account"
        />
      </div>

      {/* ── Form area ────────────────────────────────────────────── */}
      <div className="p-6">
        {tab === "login" && (
          <div key="login" className="animate-fade-in space-y-1">
            <p className="text-xs text-ink-500 mb-4">
              Sign in with your email and password.
            </p>
            <Suspense>
              <LoginForm />
            </Suspense>
            <p className="text-center text-xs text-ink-600 pt-3">
              Don&apos;t have an account?{" "}
              <button
                onClick={() => setTab("signup")}
                className="text-amber-400 hover:text-amber-300 transition underline underline-offset-2"
              >
                Create one
              </button>
            </p>
          </div>
        )}

        {tab === "signup" && (
          <div key="signup" className="animate-fade-in space-y-1">
            <p className="text-xs text-ink-500 mb-4">
              Free account · Viewer access by default
            </p>
            <SignupForm />
            <p className="text-center text-xs text-ink-600 pt-3">
              Already have an account?{" "}
              <button
                onClick={() => setTab("login")}
                className="text-amber-400 hover:text-amber-300 transition underline underline-offset-2"
              >
                Sign in
              </button>
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

function TabButton({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all border-b-2 ${
        active
          ? "border-amber-500 text-amber-400 bg-amber-500/5"
          : "border-transparent text-ink-500 hover:text-ink-300 hover:bg-ink-800/40"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}