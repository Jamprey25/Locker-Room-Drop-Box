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
    <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-6">
      <Link
        href="/"
        className="text-base font-semibold tracking-tight text-white hover:text-amber-200"
      >
        Locker Room Dropbox
      </Link>
      <nav className="flex flex-wrap gap-4 text-sm">
        <Link
          href="/login"
          aria-current={highlight.login ? "page" : undefined}
          className={
            highlight.login
              ? "font-semibold text-amber-400"
              : "text-zinc-400 hover:text-white"
          }
        >
          Log in
        </Link>
        <Link
          href="/signup"
          aria-current={highlight.signup ? "page" : undefined}
          className={
            highlight.signup
              ? "font-semibold text-amber-400"
              : "text-zinc-400 hover:text-white"
          }
        >
          Sign up
        </Link>
      </nav>
    </header>
  );
}
