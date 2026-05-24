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
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/hub" className="text-lg font-semibold tracking-tight">
          Locker Room Dropbox
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-zinc-400">{display}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
