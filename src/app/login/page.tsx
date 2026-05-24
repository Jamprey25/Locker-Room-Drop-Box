"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { signIn } from "next-auth/react";

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
      className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
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
        <h1 className="text-xl font-semibold text-white">Log in</h1>
        <p className="text-sm text-zinc-400">
          Use the email and password from signup.
        </p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-50 outline-none focus:border-amber-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-50 outline-none focus:border-amber-500"
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <Suspense fallback={<p className="text-sm text-zinc-400">Loading…</p>}>
        <LoginInner />
      </Suspense>
    </div>
  );
}
