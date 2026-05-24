"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registerAndSignIn } from "@/app/actions/hub";
import { AuthPageHeader } from "@/components/auth/auth-page-header";

const inputCls =
  "rounded-xl border border-white/[0.08] bg-black/25 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-sky-500/45 focus:bg-black/35 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-16">
      <AuthPageHeader subtitle="signup" />
      <form
        className="flex flex-col gap-5 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl"
        action={(fd) =>
          startTransition(async () => {
            setError(null);
            const res = await registerAndSignIn(fd);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.push("/hub");
            router.refresh();
          })
        }
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Join the locker
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            One signup per teammate. Everyone shares the same Videos and
            Resources after that.
          </p>
        </div>
        <label className="flex flex-col gap-2 text-xs font-medium text-slate-400">
          Display name
          <input
            name="name"
            required
            maxLength={80}
            autoComplete="name"
            className={inputCls}
            placeholder="Jordan"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-medium text-slate-400">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputCls}
            placeholder="you@school.edu"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-medium text-slate-400">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
          <span className="text-xs font-normal text-slate-500">
            At least 8 characters
          </span>
        </label>
        {error ? (
          <p className="rounded-xl border border-red-500/20 bg-red-950/35 px-3 py-2.5 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-950/45 transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
        >
          {pending ? "Creating your account…" : "Create account"}
        </button>
        <p className="border-t border-white/[0.06] pt-5 text-center text-sm text-slate-500">
          Already in?{" "}
          <Link
            href="/login"
            className="font-semibold text-sky-400 hover:text-sky-300"
          >
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
