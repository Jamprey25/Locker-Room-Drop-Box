"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  addResource,
  addYoutubeVideo,
  toggleVideoWatched,
} from "@/app/actions/hub";
import type { WatchlistSectorGroup } from "@/data/watchlist";
import type { StockQuote } from "@/lib/alpha-vantage";
import { ResourcesTab } from "@/components/hub/resources-tab";
import { VideosTab } from "@/components/hub/videos-tab";
import { WatchlistTab } from "@/components/hub/watchlist-tab";
import { PageHeader } from "@/components/ui/page-header";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { AnimatePresence } from "framer-motion";

export type HubVideoRow = {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  createdAt: Date;
  addedBy: { id: string; name: string | null; email: string };
  watches: {
    watchedAt: Date;
    user: { id: string; name: string | null; email: string };
  }[];
};

export type HubResourceRow = {
  id: string;
  url: string;
  title: string | null;
  note: string | null;
  createdAt: Date;
  addedBy: { id: string; name: string | null; email: string };
};

const HUB_TABS = [
  { id: "videos" as const, label: "Videos" },
  { id: "resources" as const, label: "Resources" },
  { id: "watchlist" as const, label: "Watchlist" },
];

export function HubClient(props: {
  initialVideos: HubVideoRow[];
  initialResources: HubResourceRow[];
  watchedVideoIds: string[];
  watchlistGroups: WatchlistSectorGroup[];
  watchlistQuotes: Record<string, StockQuote>;
  watchlistApiConfigured: boolean;
  watchlistSetupError?: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<(typeof HUB_TABS)[number]["id"]>("videos");
  const [pending, start] = useTransition();
  const [watchedIds, setWatchedIds] = useState(
    () => new Set(props.watchedVideoIds)
  );

  const watchedFingerprint = [...props.watchedVideoIds].sort().join("|");
  useEffect(() => {
    setWatchedIds(new Set(props.watchedVideoIds));
  }, [watchedFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAddVideo(rawUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      start(async () => {
        const res = await addYoutubeVideo({ rawUrl });
        if (!res.ok) {
          toast(res.error, "error");
          resolve(false);
          return;
        }
        toast(
          res.duplicate
            ? "That video was already in the locker — refreshed the vault."
            : "Video saved to the locker.",
          "success"
        );
        router.refresh();
        resolve(true);
      });
    });
  }

  function handleAddResource(data: {
    url: string;
    title?: string;
    note?: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      start(async () => {
        const res = await addResource(data);
        if (!res.ok) {
          toast(res.error, "error");
          resolve(false);
          return;
        }
        toast("Resource added.", "success");
        router.refresh();
        resolve(true);
      });
    });
  }

  function handleToggleWatch(videoId: string, currently: boolean) {
    start(async () => {
      const optimistic = !currently;
      setWatchedIds((prev) => {
        const n = new Set(prev);
        if (optimistic) n.add(videoId);
        else n.delete(videoId);
        return n;
      });

      const res = await toggleVideoWatched({ videoId });
      if (!res.ok) {
        setWatchedIds((prev) => {
          const n = new Set(prev);
          if (currently) n.add(videoId);
          else n.delete(videoId);
          return n;
        });
        toast(res.error, "error");
        return;
      }

      setWatchedIds((prev) => {
        const n = new Set(prev);
        if (res.watched) n.add(videoId);
        else n.delete(videoId);
        return n;
      });

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-12">
      <PageHeader
        eyebrow="Your crew vault"
        title="Shared stash"
        description={`Upload walkthroughs, live deal chats, glossary reads, or comps spreadsheets. Watch tracking is individual—mentors see who's current (${watchedIds.size} ${watchedIds.size === 1 ? "clip" : "clips"} checked off by you).`}
        action={
          <Tabs tabs={HUB_TABS} active={tab} onChange={setTab} />
        }
      />

      <AnimatePresence mode="wait">
        {tab === "watchlist" ? (
          <TabPanel key="watchlist">
            <WatchlistTab
              groups={props.watchlistGroups}
              initialQuotes={props.watchlistQuotes}
              apiConfigured={props.watchlistApiConfigured}
              setupError={props.watchlistSetupError}
            />
          </TabPanel>
        ) : tab === "videos" ? (
          <TabPanel key="videos">
            <VideosTab
              videos={props.initialVideos}
              watchedIds={watchedIds}
              pending={pending}
              onAddVideo={handleAddVideo}
              onToggleWatch={handleToggleWatch}
            />
          </TabPanel>
        ) : (
          <TabPanel key="resources">
            <ResourcesTab
              resources={props.initialResources}
              pending={pending}
              onAddResource={handleAddResource}
            />
          </TabPanel>
        )}
      </AnimatePresence>
    </div>
  );
}
