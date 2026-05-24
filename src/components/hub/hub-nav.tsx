import Link from "next/link";
import type { Session } from "next-auth";
import { SignOutButton } from "@/components/hub/sign-out-button";

export function HubNav({
  user,
}: {
  user: NonNullable<Session["user"]> & { id: string };
}) {
  const display = user.name?.trim() || user.email?.split("@")[0] || "Member";

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#050508]/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link
          href="/hub"
          className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-[11px] font-bold text-white shadow-md shadow-sky-900/40">
            LR
          </span>
          Locker Room
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link
            href="/hub/profile"
            className="rounded-full px-3 py-1.5 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            Profile
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 ring-2 ring-white/10" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">{display}</span>
              <span className="text-xs text-slate-500">Signed in</span>
            </div>
          </div>
          <span className="text-sm text-slate-400 sm:hidden">{display}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
