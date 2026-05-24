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
  children: React.ReactNode;
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
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-950 px-4 py-12 text-center text-sm text-red-300">
        <p>Session unavailable — refresh and sign back in.</p>
        <Link href="/login" className="text-amber-400 underline hover:text-amber-300">
          Return to login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-50">
      <HubNav user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
