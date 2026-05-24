import { auth } from "@/auth";
import { HubNav } from "@/components/hub/hub-nav";

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
      <div className="min-h-dvh bg-zinc-950 px-4 py-12 text-center text-sm text-red-400">
        Session unavailable — refresh and sign back in.
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
