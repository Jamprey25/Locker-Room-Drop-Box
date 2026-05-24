"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { AuthPageHeader } from "@/components/auth/auth-page-header";

const inputCls =
  "rounded-xl border border-white/[0.08] bg-black/25 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-sky-500/45 focus:bg-black/35 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const rawCallback = params.get("callbackUrl");
  const callbackUrl =
    rawCallback &&
    rawCallback.startsWith("/") &&
    !rawCallback.startsWith("//")
      ? rawCallback
      : "/hub";
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-5 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl"
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          const res = await signIn("credentials", {
            redirect: false,
            email: String(fd.get("email")),
            password: String(fd.get("password")),
            callbackUrl,
          });
          if (res?.error) {
            setError("Email or password did not match.");
            return;
          }
          router.push(callbackUrl);
          router.refresh();
        })
      }
    >
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Welcome back
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Use the email and password from when you joined the locker.
        </p>
      </div>
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
          autoComplete="current-password"
          className={inputCls}
        />
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
        {pending ? "Signing in…" : "Continue"}
      </button>
      <p className="border-t border-white/[0.06] pt-5 text-center text-sm text-slate-500">
        New here?{" "}
        <Link
          href="/signup"
          className="font-semibold text-sky-400 hover:text-sky-300"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-16">
      <AuthPageHeader subtitle="login" />
      <Suspense
        fallback={
          <div className="h-48 animate-pulse rounded-3xl border border-white/[0.06] bg-white/[0.02]" />
        }
      >
        <LoginInner />
      </Suspense>
    </div>
  );
}
