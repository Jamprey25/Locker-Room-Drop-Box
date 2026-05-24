export function extractYoutubeVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const shorts = raw.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shorts?.[1]) return shorts[1];

  const embed = raw.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embed?.[1]) return embed[1];

  const vParam = raw.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (vParam?.[1]) return vParam[1];

  const youtuBe = raw.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (youtuBe?.[1]) return youtuBe[1];

  return null;
}

export function canonicalYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export type YoutubeOEmbed = {
  title: string;
  thumbnail_url?: string;
  author_name?: string;
};

export async function fetchYoutubeOEmbed(
  watchUrl: string
): Promise<YoutubeOEmbed> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    watchUrl
  )}&format=json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`YouTube metadata request failed (${res.status})`);
  }
  const data = (await res.json()) as YoutubeOEmbed;
  if (!data.title?.trim()) {
    throw new Error("YouTube metadata missing title");
  }
  return data;
}
