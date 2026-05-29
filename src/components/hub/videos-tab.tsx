"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page-header";
import { Label, Textarea } from "@/components/ui/input";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { VideoCard } from "@/components/hub/video-card";
import type { HubVideoRow } from "@/components/hub/hub-client";

export function VideosTab({
  videos,
  watchedIds,
  pending,
  onAddVideo,
  onToggleWatch,
}: {
  videos: HubVideoRow[];
  watchedIds: Set<string>;
  pending: boolean;
  onAddVideo: (rawUrl: string) => Promise<boolean>;
  onToggleWatch: (videoId: string, currently: boolean) => void;
}) {
  const [videoUrl, setVideoUrl] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void onAddVideo(videoUrl).then((ok) => {
      if (ok) setVideoUrl("");
    });
  }

  return (
    <section className="flex flex-col gap-8">
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Label
              label="Add a YouTube link"
              htmlFor="video-url"
              hint="Supports watch URLs, shorts, embeds, and youtu.be. Duplicates merge into the same row."
            >
              <Textarea
                id="video-url"
                name="rawUrl"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                rows={3}
                required
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </Label>
            <Button
              type="submit"
              disabled={pending}
              className="w-full sm:w-auto sm:min-w-[200px]"
            >
              {pending ? "Saving…" : "Add to vault"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {videos.length === 0 ? (
        <EmptyState
          icon={Video}
          title="Your vault is empty"
          description="Drop the first walkthrough URL above to get started. Thumbnails and titles are fetched automatically."
        />
      ) : (
        <Stagger className="grid gap-8 sm:grid-cols-2">
          {videos.map((video) => (
            <StaggerItem key={video.id}>
              <VideoCard
                video={video}
                viewerWatched={watchedIds.has(video.id)}
                pending={pending}
                onToggleWatch={onToggleWatch}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  );
}
