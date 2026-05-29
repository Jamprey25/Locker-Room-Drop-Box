"use client";

import Link from "next/link";
import { LogoBadge } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

export function AuthPageHeader({
  subtitle,
}: {
  subtitle?: "login" | "signup";
}) {
  const highlight =
    subtitle === "login"
      ? { login: true, signup: false }
      : subtitle === "signup"
        ? { login: false, signup: true }
        : { login: false, signup: false };

  return (
    <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
      <Link
        href="/"
        className="group flex items-center gap-2 text-[15px] font-semibold tracking-tight text-white"
      >
        <LogoBadge />
        <span className="text-slate-200 transition group-hover:text-white">
          Locker Room Dropbox
        </span>
      </Link>
      <nav className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 text-sm backdrop-blur-md">
        <Link
          href="/login"
          aria-current={highlight.login ? "page" : undefined}
          className={cn(
            "rounded-full px-4 py-2 transition",
            highlight.login
              ? "bg-white/[0.12] font-semibold text-white shadow-inner"
              : "text-slate-400 hover:text-white"
          )}
        >
          Log in
        </Link>
        <Link
          href="/signup"
          aria-current={highlight.signup ? "page" : undefined}
          className={cn(
            "rounded-full px-4 py-2 transition",
            highlight.signup
              ? "bg-white/[0.12] font-semibold text-white shadow-inner"
              : "text-slate-400 hover:text-white"
          )}
        >
          Sign up
        </Link>
      </nav>
    </header>
  );
}
