"use client";

import Image from "next/image";
import { ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScaleOnHover } from "@/components/ui/motion";
import { formatDistance, formatPerson } from "@/lib/format";
import type { HubVideoRow } from "@/components/hub/hub-client";

export function VideoCard({
  video,
  viewerWatched,
  pending,
  onToggleWatch,
}: {
  video: HubVideoRow;
  viewerWatched: boolean;
  pending: boolean;
  onToggleWatch: (videoId: string, currently: boolean) => void;
}) {
  const watchers = [...video.watches].sort(
    (a, b) =>
      new Date(a.watchedAt).getTime() - new Date(b.watchedAt).getTime()
  );

  return (
    <ScaleOnHover>
      <Card
        hover
        className="group/card overflow-hidden border-white/[0.07] bg-white/[0.02] p-0 shadow-lg shadow-black/30"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
          <Image
            src={video.thumbnail}
            alt=""
            fill
            sizes="(min-width: 640px) 45vw, 100vw"
            className="object-cover transition duration-500 group-hover/card:scale-[1.04]"
            unoptimized
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition group-hover/card:opacity-100">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Play className="h-5 w-5 fill-white text-white" />
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold leading-snug text-white">
            {video.title}
          </h2>
          <p className="text-xs text-slate-500">
            Added by {formatPerson(video.addedBy)} ·{" "}
            {formatDistance(video.createdAt)}
          </p>
          <a
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-sky-400 transition hover:text-sky-300"
          >
            Open in YouTube
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>

          <div className="rounded-2xl border border-white/[0.06] bg-black/25 p-4">
            <p className="text-xs font-semibold text-slate-400">
              Watched ·{" "}
              <span className="text-slate-200">{watchers.length}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {watchers.length === 0 ? (
                <span className="text-xs text-slate-500">
                  No confirmations yet.
                </span>
              ) : (
                watchers.map((w) => (
                  <Badge key={w.user.id}>{formatPerson(w.user)}</Badge>
                ))
              )}
            </div>
          </div>

          <Button
            type="button"
            variant={viewerWatched ? "watched" : "unwatched"}
            className="w-full sm:w-auto"
            onClick={() => onToggleWatch(video.id, viewerWatched)}
            disabled={pending}
          >
            {viewerWatched ? "Undo watched" : "Mark as watched"}
          </Button>
        </div>
      </Card>
    </ScaleOnHover>
  );
}
