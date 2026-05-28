"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeDisplayName, changePassword } from "@/app/actions/hub";

const inputCls =
  "rounded-xl border border-white/[0.08] bg-black/25 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-sky-500/45 focus:bg-black/35 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition";

const glassPanel =
  "rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-xl shadow-black/30 backdrop-blur-xl sm:p-7";

export function ProfileClient(props: {
  initialName: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(props.initialName);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [namePending, startName] = useTransition();
  const [passwordPending, startPassword] = useTransition();

  function handleNameSubmit(form: HTMLFormElement) {
    startName(async () => {
      setNameError(null);
      setNameMessage(null);
      const fd = new FormData(form);
      const res = await changeDisplayName(fd);
      if (!res.ok) {
        setNameError(res.error);
        return;
      }
      setName(res.name);
      setNameMessage("Display name updated.");
      router.refresh();
    });
  }

  function handlePasswordSubmit(form: HTMLFormElement) {
    startPassword(async () => {
      setPasswordError(null);
      setPasswordMessage(null);
      const fd = new FormData(form);
      const res = await changePassword(fd);
      if (!res.ok) {
        setPasswordError(res.error);
        return;
      }
      form.reset();
      setPasswordMessage("Password updated.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-400/85">
          Account
        </p>
        <h1 className="text-pretty bg-gradient-to-br from-white to-slate-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
          Profile
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
          Update how your name appears in the locker and change your password.
        </p>
      </div>

      <form
        className={glassPanel}
        onSubmit={(e) => {
          e.preventDefault();
          handleNameSubmit(e.currentTarget);
        }}
      >
        <p className="mb-6 text-[15px] font-semibold text-white">
          Display name
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400 sm:col-span-2">
            Username
            <input
              name="name"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className={inputCls}
              placeholder="Jordan"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400 sm:col-span-2">
            Email
            <input
              value={props.email}
              readOnly
              disabled
              className={`${inputCls} cursor-not-allowed opacity-60`}
            />
            <span className="text-xs font-normal text-slate-500">
              Email cannot be changed here.
            </span>
          </label>
        </div>

        {nameError ? (
          <p className="mt-4 rounded-2xl border border-red-500/25 bg-red-950/35 px-4 py-3 text-sm text-red-100">
            {nameError}
          </p>
        ) : null}
        {nameMessage ? (
          <p className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-50">
            {nameMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={namePending || name.trim() === props.initialName.trim()}
          className="mt-8 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-10 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-950/40 transition hover:brightness-110 disabled:opacity-50"
        >
          {namePending ? "Saving…" : "Save display name"}
        </button>
      </form>

      <form
        className={glassPanel}
        onSubmit={(e) => {
          e.preventDefault();
          handlePasswordSubmit(e.currentTarget);
        }}
      >
        <p className="mb-6 text-[15px] font-semibold text-white">
          Change password
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400 sm:col-span-2">
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
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400">
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
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400">
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
        </div>

        {passwordError ? (
          <p className="mt-4 rounded-2xl border border-red-500/25 bg-red-950/35 px-4 py-3 text-sm text-red-100">
            {passwordError}
          </p>
        ) : null}
        {passwordMessage ? (
          <p className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-50">
            {passwordMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={passwordPending}
          className="mt-8 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-10 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-950/40 transition hover:brightness-110 disabled:opacity-50"
        >
          {passwordPending ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
