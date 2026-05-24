import { prisma } from "@/lib/prisma";
import {
  canonicalYoutubeWatchUrl,
  extractYoutubeVideoId,
  fetchYoutubeOEmbed,
} from "@/lib/youtube";

function defaultThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export async function ingestYoutubeVideo(
  rawUrl: string,
  addedById: string
) {
  const videoId = extractYoutubeVideoId(rawUrl);
  if (!videoId) {
    throw new Error("Paste a valid YouTube link (watch, shorts, embed, or youtu.be)");
  }

  const url = canonicalYoutubeWatchUrl(videoId);
  const existing = await prisma.video.findUnique({
    where: { url },
    include: {
      watches: {
        select: {
          watchedAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { watchedAt: "asc" },
      },
      addedBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (existing) return { duplicate: true as const, video: existing };

  const oembed = await fetchYoutubeOEmbed(url).catch(() => ({
    title: `YouTube video ${videoId}`,
    thumbnail_url: defaultThumbnail(videoId),
  }));

  const thumbnail =
    (oembed.thumbnail_url?.trim()?.length ?? 0) > 0
      ? (oembed.thumbnail_url as string)
      : defaultThumbnail(videoId);

  const row = await prisma.video.create({
    data: {
      url,
      title: oembed.title.trim(),
      thumbnail,
      addedById,
    },
    include: {
      watches: {
        select: {
          watchedAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      addedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return { duplicate: false as const, video: row };
}
