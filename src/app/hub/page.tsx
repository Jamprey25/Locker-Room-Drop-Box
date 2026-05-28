export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { groupWatchlistBySector } from "@/data/watchlist";
import { isAlphaVantageConfigured } from "@/lib/alpha-vantage";
import { prisma } from "@/lib/prisma";
import { HubClient } from "@/components/hub/hub-client";

export default async function HubPage() {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return null;

  const [videos, resources] = await Promise.all([
    prisma.video.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        addedBy: { select: { id: true, name: true, email: true } },
        watches: {
          orderBy: { watchedAt: "asc" },
          select: {
            watchedAt: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    }),
    prisma.resource.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        addedBy: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  const watchedVideoIds = new Set(
    (
      await prisma.videoWatch.findMany({
        where: { userId: uid },
        select: { videoId: true },
      })
    ).map((w) => w.videoId)
  );

  return (
    <HubClient
      initialVideos={videos}
      initialResources={resources}
      watchedVideoIds={Array.from(watchedVideoIds)}
      watchlistGroups={groupWatchlistBySector()}
      watchlistQuotes={{}}
      watchlistApiConfigured={isAlphaVantageConfigured()}
    />
  );
}
