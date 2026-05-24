"use client";

import Link from "next/link";

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
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-[11px] font-bold text-white shadow-md shadow-sky-900/40">
          LR
        </span>
        <span className="text-slate-200 transition group-hover:text-white">
          Locker Room Dropbox
        </span>
      </Link>
      <nav className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 text-sm backdrop-blur-md">
        <Link
          href="/login"
          aria-current={highlight.login ? "page" : undefined}
          className={
            highlight.login
              ? "rounded-full bg-white/[0.12] px-4 py-2 font-semibold text-white shadow-inner"
              : "rounded-full px-4 py-2 text-slate-400 transition hover:text-white"
          }
        >
          Log in
        </Link>
        <Link
          href="/signup"
          aria-current={highlight.signup ? "page" : undefined}
          className={
            highlight.signup
              ? "rounded-full bg-white/[0.12] px-4 py-2 font-semibold text-white shadow-inner"
              : "rounded-full px-4 py-2 text-slate-400 transition hover:text-white"
          }
        >
          Sign up
        </Link>
      </nav>
    </header>
  );
}
