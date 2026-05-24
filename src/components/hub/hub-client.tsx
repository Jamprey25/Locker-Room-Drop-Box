"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  addResource,
  addYoutubeVideo,
  toggleVideoWatched,
} from "@/app/actions/hub";

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

function formatPerson(u: {
  id: string;
  name: string | null;
  email: string;
}) {
  return (
    u.name?.trim() || u.email.split("@")[0] || u.email.slice(0, 6)
  );
}

export function HubClient(props: {
  initialVideos: HubVideoRow[];
  initialResources: HubResourceRow[];
  watchedVideoIds: string[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"videos" | "resources">("videos");
  const [videoUrl, setVideoUrl] = useState("");
  const [resourceFields, setResourceFields] = useState({
    url: "",
    title: "",
    note: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [watchedIds, setWatchedIds] = useState(() => new Set(props.watchedVideoIds));

  const videos = props.initialVideos;
  const resources = props.initialResources;

  const watchedFingerprint = [...props.watchedVideoIds].sort().join("|");
  useEffect(() => {
    setWatchedIds(new Set(props.watchedVideoIds));
  }, [watchedFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps -- fingerprint tracks membership-only changes


  function handleAddVideo(fd: FormData) {
    const rawUrl = String(fd.get("rawUrl") ?? videoUrl);
    start(async () => {
      setError(null);
      setMessage(null);
      const res = await addYoutubeVideo({ rawUrl });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setVideoUrl("");
      setMessage(
        res.duplicate
          ? "That video was already in the locker — refreshed the vault."
          : "Video saved to the locker."
      );
      router.refresh();
    });
  }

  function handleAddResource(form: HTMLFormElement) {
    start(async () => {
      setError(null);
      setMessage(null);
      const fd = new FormData(form);
      const url = String(fd.get("url") ?? "").trim();
      const titleRaw = String(fd.get("title") ?? "").trim();
      const noteRaw = String(fd.get("note") ?? "").trim();

      const res = await addResource({
        url,
        title: titleRaw.length ? titleRaw : undefined,
        note: noteRaw.length ? noteRaw : undefined,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      form.reset();
      setResourceFields({ url: "", title: "", note: "" });
      setMessage("Resource added.");
      router.refresh();
    });
  }

  function handleToggleWatch(videoId: string, currently: boolean) {
    start(async () => {
      setError(null);
      setMessage(null);
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
        setError(res.error);
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
    <div className="flex flex-col gap-8">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-amber-500/80">
          Crew vault
        </p>
        <h1 className="text-3xl font-semibold text-white">Shared stash</h1>
        <p className="max-w-prose text-sm text-zinc-400">
          Drop underwriting walkthroughs, live deal reviews, glossary posts,
          or spreadsheets. Watching is tracked individually so mentors can see
          who&apos;s caught up ({watchedIds.size} logged for you personally).
        </p>
      </div>

      <div className="flex gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setTab("videos")}
          className={`flex-1 rounded-lg px-3 py-2 transition ${
            tab === "videos"
              ? "bg-zinc-100 text-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Videos
        </button>
        <button
          type="button"
          onClick={() => setTab("resources")}
          className={`flex-1 rounded-lg px-3 py-2 transition ${
            tab === "resources"
              ? "bg-zinc-100 text-black"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Resources
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-900/60 bg-red-950/60 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}

      {tab === "videos" ? (
        <section className="flex flex-col gap-6">
          <form
            className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
            action={(fd) => handleAddVideo(fd)}
          >
            <label className="flex flex-col gap-2 text-sm">
              Paste a YouTube link
              <textarea
                name="rawUrl"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                rows={2}
                required
                placeholder="https://www.youtube.com/watch?v=..."
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-base text-white outline-none focus:border-amber-500 sm:text-sm"
              />
              <span className="text-xs text-zinc-500">
                Accepts youtube.com, youtu.be, Shorts, and embed URLs · duplicates reuse the same row automatically.
              </span>
            </label>
            <button
              type="submit"
              disabled={pending}
              className="mt-4 w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60 sm:w-auto"
            >
              {pending ? "Saving..." : "Add to locker"}
            </button>
          </form>

          <div className="grid gap-6 sm:grid-cols-2">
            {videos.map((video) => {
              const watchers = [...video.watches].sort(
                (a, b) =>
                  new Date(a.watchedAt).getTime() -
                  new Date(b.watchedAt).getTime()
              );
              const viewerWatched = watchedIds.has(video.id);

              return (
                <article
                  key={video.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                    <Image
                      src={video.thumbnail}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex flex-col gap-3 p-4">
                    <h2 className="text-base font-semibold leading-snug text-white">
                      {video.title}
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Added by {formatPerson(video.addedBy)} ·{" "}
                      {formatDistance(video.createdAt)}
                    </p>
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300"
                    >
                      Open video ↗
                    </a>

                    <div className="space-y-2 rounded-xl border border-zinc-800/80 bg-black/40 p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                        Watched ({watchers.length})
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-zinc-100">
                        {watchers.length === 0 ? (
                          <span className="text-zinc-500">
                            No one has marked it yet.
                          </span>
                        ) : (
                          watchers.map((w) => (
                            <span
                              key={w.user.id}
                              className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1"
                            >
                              {formatPerson(w.user)}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleWatch(video.id, viewerWatched)}
                      disabled={pending}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        viewerWatched
                          ? "border-emerald-600 text-emerald-300 hover:border-emerald-400"
                          : "border-zinc-600 text-zinc-100 hover:border-amber-500"
                      }`}
                    >
                      {viewerWatched
                        ? "Mark as not watched"
                        : "I watched this"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {videos.length === 0 ? (
            <p className="text-center text-sm text-zinc-500">
              No lessons yet — paste the first walkthrough above.
            </p>
          ) : null}
        </section>
      ) : (
        <section className="flex flex-col gap-6">
          <form
            className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleAddResource(e.currentTarget);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm sm:col-span-2">
                Link
                <input
                  name="url"
                  type="url"
                  required
                  value={resourceFields.url}
                  onChange={(e) =>
                    setResourceFields((f) => ({ ...f, url: e.target.value }))
                  }
                  placeholder="https://"
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Title (optional)
                <input
                  name="title"
                  value={resourceFields.title}
                  onChange={(e) =>
                    setResourceFields((f) => ({ ...f, title: e.target.value }))
                  }
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm sm:col-span-2">
                Notes (optional)
                <textarea
                  name="note"
                  rows={3}
                  value={resourceFields.note}
                  onChange={(e) =>
                    setResourceFields((f) => ({ ...f, note: e.target.value }))
                  }
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {pending ? "Saving..." : "Save resource"}
            </button>
          </form>

          <ul className="space-y-3">
            {resources.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
              >
                <div className="flex flex-col gap-2">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-lg font-semibold text-white hover:text-amber-300"
                  >
                    {r.title?.trim() || friendlyHost(r.url)}
                  </a>
                  <p className="break-all text-xs text-zinc-500">{r.url}</p>
                  {r.note ? (
                    <p className="text-sm text-zinc-300">{r.note}</p>
                  ) : null}
                  <p className="text-xs text-zinc-500">
                    Added by {formatPerson(r.addedBy)} ·{" "}
                    {formatDistance(r.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {resources.length === 0 ? (
            <p className="text-center text-sm text-zinc-500">
              Drop underwriting templates, market reports, or glossary links
              here.
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}

function friendlyHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Resource";
  }
}

function formatDistance(date: Date) {
  const ms = Date.now() - new Date(date).getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  return `${weeks} wks ago`;
}
