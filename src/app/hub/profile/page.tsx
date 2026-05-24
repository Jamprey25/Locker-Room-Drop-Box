"use client";

import Link from "next/link";
import { useTransition, useState, useRef } from "react";
import { changePassword } from "@/app/actions/hub";

const inputCls =
  "rounded-xl border border-white/[0.08] bg-black/25 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-sky-500/45 focus:bg-black/35 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition";

export default function ProfilePage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-sky-400/90">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Profile
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Update your sign-in password. You’ll stay logged in after a successful
          change.
        </p>
        <Link
          href="/hub"
          className="mt-4 inline-flex text-sm font-medium text-sky-400 hover:text-sky-300"
        >
          ← Back to hub
        </Link>
      </div>

      <form
        ref={formRef}
        className="flex flex-col gap-5 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl"
        action={(fd) =>
          startTransition(async () => {
            setError(null);
            setSuccess(null);
            const res = await changePassword(fd);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setSuccess("Your password has been updated.");
            formRef.current?.reset();
          })
        }
      >
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Change password
        </h2>
        <label className="flex flex-col gap-2 text-xs font-medium text-slate-400">
          Current password
          <input
            name="currentPassword"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-medium text-slate-400">
          New password
          <input
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-medium text-slate-400">
          Confirm new password
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </label>
        {error ? (
          <p className="rounded-xl border border-red-500/20 bg-red-950/35 px-3 py-2.5 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-3 py-2.5 text-sm text-emerald-100">
            {success}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-950/45 transition hover:brightness-110 active:brightness-95 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
