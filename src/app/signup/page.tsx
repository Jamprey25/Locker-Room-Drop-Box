"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registerAndSignIn } from "@/app/actions/hub";
import { AuthPageHeader } from "@/components/auth/auth-page-header";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-12">
      <AuthPageHeader subtitle="signup" />
      <form
        className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
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
          <h1 className="text-xl font-semibold text-white">Sign up</h1>
          <p className="text-sm text-zinc-400">
            Create your account once. After that everyone shares the same
            Videos and Resources lockers.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Display name
          <input
            name="name"
            required
            maxLength={80}
            autoComplete="name"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-50 outline-none focus:border-amber-500"
          />
        </label>
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
            autoComplete="new-password"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-50 outline-none focus:border-amber-500"
          />
          <span className="text-xs text-zinc-500">Minimum 8 characters.</span>
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {pending ? "Creating account..." : "Create account"}
        </button>
        <p className="border-t border-zinc-800 pt-4 text-center text-sm text-zinc-400">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-amber-400 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
