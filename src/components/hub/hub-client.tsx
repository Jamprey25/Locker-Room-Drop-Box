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

const inputCls =
  "rounded-xl border border-white/[0.08] bg-black/25 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-sky-500/45 focus:bg-black/35 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition";

const glassPanel =
  "rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-xl shadow-black/30 backdrop-blur-xl sm:p-7";

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
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-400/85">
            Your crew vault
          </p>
          <h1 className="text-pretty bg-gradient-to-br from-white to-slate-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Shared stash
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Upload walkthroughs, live deal chats, glossary reads, or comps
            spreadsheets. Watch tracking is individual—mentors see who&apos;s
            current ({watchedIds.size}{" "}
            {watchedIds.size === 1 ? "clip" : "clips"} checked off by you).
          </p>
        </div>

        <div className="flex shrink-0 rounded-full border border-white/[0.08] bg-black/25 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setTab("videos")}
            className={`relative rounded-full px-6 py-2.5 text-sm font-semibold transition ${
              tab === "videos"
                ? "text-white shadow-md shadow-black/40"
                : "text-slate-500 hover:text-slate-200"
            }`}
          >
            {tab === "videos" ? (
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 opacity-[0.95]" />
            ) : null}
            <span className="relative z-[1]">Videos</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("resources")}
            className={`relative rounded-full px-6 py-2.5 text-sm font-semibold transition ${
              tab === "resources"
                ? "text-white shadow-md shadow-black/40"
                : "text-slate-500 hover:text-slate-200"
            }`}
          >
            {tab === "resources" ? (
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 opacity-[0.95]" />
            ) : null}
            <span className="relative z-[1]">Resources</span>
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-500/25 bg-red-950/35 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-2xl border border-emerald-500/25 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-50">
          {message}
        </p>
      ) : null}

      {tab === "videos" ? (
        <section className="flex flex-col gap-8">
          <form
            className={glassPanel}
            action={(fd) => handleAddVideo(fd)}
          >
            <label className="flex flex-col gap-3">
              <span className="text-[15px] font-semibold text-white">
                Add a YouTube link
              </span>
              <textarea
                name="rawUrl"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                rows={3}
                required
                placeholder="https://www.youtube.com/watch?v=…"
                className={`min-h-[88px] resize-y ${inputCls}`}
              />
              <span className="text-xs font-normal leading-relaxed text-slate-500">
                Supports watch URLs, shorts, embeds, and youtu.be. Duplicates merge
                into the same row.
              </span>
            </label>
            <button
              type="submit"
              disabled={pending}
              className="mt-6 w-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-950/40 transition hover:brightness-110 disabled:opacity-50 sm:w-auto sm:min-w-[200px]"
            >
              {pending ? "Saving…" : "Add to vault"}
            </button>
          </form>

          <div className="grid gap-8 sm:grid-cols-2">
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
                  className="group/card flex flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02] shadow-lg shadow-black/30 transition hover:border-white/[0.14] hover:shadow-2xl hover:shadow-sky-950/25"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                    <Image
                      src={video.thumbnail}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 45vw, 100vw"
                      className="object-cover transition duration-500 group-hover/card:scale-[1.03]"
                      unoptimized
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
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
                      Open in YouTube{" "}
                      <span aria-hidden className="text-[10px]">
                        ↗
                      </span>
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
                            <span
                              key={w.user.id}
                              className="rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs font-medium text-slate-200"
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
                      className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 ${
                        viewerWatched
                          ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                          : "border-white/15 bg-white/[0.04] text-white hover:border-sky-500/40 hover:bg-sky-500/10"
                      }`}
                    >
                      {viewerWatched ? "Undo watched" : "Mark as watched"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {videos.length === 0 ? (
            <p className="text-center text-sm text-slate-500">
              Empty vault — drop the first walkthrough URL above.
            </p>
          ) : null}
        </section>
      ) : (
        <section className="flex flex-col gap-8">
          <form
            className={glassPanel}
            onSubmit={(e) => {
              e.preventDefault();
              handleAddResource(e.currentTarget);
            }}
          >
            <p className="mb-6 text-[15px] font-semibold text-white">
              New resource link
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400 sm:col-span-2">
                URL
                <input
                  name="url"
                  type="url"
                  required
                  value={resourceFields.url}
                  onChange={(e) =>
                    setResourceFields((f) => ({ ...f, url: e.target.value }))
                  }
                  placeholder="https://"
                  className={inputCls}
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400">
                Title <span className="font-normal text-slate-600">optional</span>
                <input
                  name="title"
                  value={resourceFields.title}
                  onChange={(e) =>
                    setResourceFields((f) => ({ ...f, title: e.target.value }))
                  }
                  className={inputCls}
                />
              </label>
              <div className="hidden sm:block" />
              <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400 sm:col-span-2">
                Notes <span className="font-normal text-slate-600">optional</span>
                <textarea
                  name="note"
                  rows={3}
                  value={resourceFields.note}
                  onChange={(e) =>
                    setResourceFields((f) => ({ ...f, note: e.target.value }))
                  }
                  className={inputCls}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={pending}
              className="mt-8 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-10 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-950/40 transition hover:brightness-110 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save resource"}
            </button>
          </form>

          <ul className="flex flex-col gap-4">
            {resources.map((r) => (
              <li
                key={r.id}
                className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 transition hover:border-white/[0.12] hover:bg-white/[0.035] sm:p-6"
              >
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-lg font-semibold text-white decoration-sky-500/50 underline-offset-4 hover:text-sky-200 hover:underline"
                >
                  {r.title?.trim() || friendlyHost(r.url)}
                </a>
                <p className="mt-2 break-all text-xs font-mono text-slate-500">
                  {r.url}
                </p>
                {r.note ? (
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {r.note}
                  </p>
                ) : null}
                <p className="mt-4 text-xs text-slate-500">
                  Added by {formatPerson(r.addedBy)} · {formatDistance(r.createdAt)}
                </p>
              </li>
            ))}
          </ul>

          {resources.length === 0 ? (
            <p className="text-center text-sm text-slate-500">
              Add templates, underwriting PDFs, or market intel links above.
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
