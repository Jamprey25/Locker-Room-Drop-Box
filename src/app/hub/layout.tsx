import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { HubNav } from "@/components/hub/hub-nav";

export const metadata: Metadata = {
  title: "Hub · Locker Room Dropbox",
  description:
    "Shared investing videos and resources for your locker room cohort.",
};

export default async function HubLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  const user =
    session?.user?.id && session.user.email
      ? {
          ...session.user,
          id: session.user.id,
        }
      : null;

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <div className="max-w-sm rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <p className="text-sm leading-relaxed text-slate-300">
            Your session ended or is unavailable. Sign in again to open the
            locker.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-950/40 transition hover:brightness-110"
          >
            Return to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh text-slate-100">
      <HubNav user={user} />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}
