import Link from "next/link";

function IconYoutube() {
  return (
    <svg
      aria-hidden
      className="h-5 w-5 text-sky-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function IconLink() {
  return (
    <svg
      aria-hidden
      className="h-5 w-5 text-indigo-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg
      aria-hidden
      className="h-5 w-5 text-emerald-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-6 py-20 lg:py-28">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center lg:mx-0 lg:items-start lg:text-left">
        <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-sky-200/90 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
          </span>
          Shared investing & real estate locker
        </span>

        <h1 className="text-pretty bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl lg:text-[3.35rem] lg:leading-[1.1]">
          Investment Learning Drop Box
        </h1>

        <p className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-slate-400 sm:text-lg">
          Paste YouTube URLs with automatic titles and thumbnails, save essays
          and spreadsheets alongside them, and see who marked each lesson
          watched—all with sign-in so the roster stays trustworthy.
        </p>

        <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-950/50 transition hover:brightness-110 active:brightness-95"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-8 py-3.5 text-sm font-semibold text-slate-100 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            Log in
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-20 grid w-full max-w-3xl gap-4 sm:grid-cols-3 lg:mx-0 lg:max-w-none">
        {[
          {
            icon: <IconYoutube />,
            title: "Video vault",
            body: "Canonical YouTube ingest, thumbnails via oEmbed, duplicate-safe.",
          },
          {
            icon: <IconLink />,
            title: "Resources",
            body: "Articles, PDFs, sheets—anything with a URL, plus notes.",
          },
          {
            icon: <IconUsers />,
            title: "Who watched",
            body: "Per-member confirmations so mentors see who caught up.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm transition hover:border-white/[0.12] hover:bg-white/[0.04]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
              {item.icon}
            </div>
            <h3 className="mt-4 text-sm font-semibold text-white">
              {item.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
