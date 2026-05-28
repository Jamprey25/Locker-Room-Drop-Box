export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { isAlphaVantageConfigured } from "@/lib/alpha-vantage";
import { prisma } from "@/lib/prisma";
import { prismaToUserMessage } from "@/lib/prisma-user-message";
import {
  ensureWatchlistSeeded,
  loadWatchlistGroups,
} from "@/lib/watchlist-db";
import type { WatchlistSectorGroup } from "@/data/watchlist";
import { HubClient } from "@/components/hub/hub-client";

export default async function HubPage() {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return null;

  let watchlistGroups: WatchlistSectorGroup[] = [];
  let watchlistSetupError: string | null = null;

  try {
    await ensureWatchlistSeeded(uid);
    watchlistGroups = await loadWatchlistGroups();
  } catch (e) {
    watchlistSetupError = prismaToUserMessage(e);
  }

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
      watchlistGroups={watchlistGroups}
      watchlistQuotes={{}}
      watchlistApiConfigured={isAlphaVantageConfigured()}
      watchlistSetupError={watchlistSetupError}
    />
  );
}
