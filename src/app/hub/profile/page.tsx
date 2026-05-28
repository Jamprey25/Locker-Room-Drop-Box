export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "@/components/hub/profile-client";

export default async function ProfilePage() {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return null;

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { name: true, email: true },
  });

  if (!user) return null;

  return (
    <ProfileClient initialName={user.name?.trim() ?? ""} email={user.email} />
  );
}
