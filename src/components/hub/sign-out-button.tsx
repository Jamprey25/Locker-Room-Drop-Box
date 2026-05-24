"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white active:scale-[0.98]"
    >
      Sign out
    </button>
  );
}
