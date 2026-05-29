import type { ReactNode } from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { HubNav } from "@/components/hub/hub-nav";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <Card className="max-w-sm">
          <CardContent>
            <p className="text-sm leading-relaxed text-slate-300">
              Your session ended or is unavailable. Sign in again to open the
              locker.
            </p>
            <ButtonLink href="/login" className="mt-6 w-full">
              Return to login
            </ButtonLink>
          </CardContent>
        </Card>
      </main>
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
