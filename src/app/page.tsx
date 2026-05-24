import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-4 py-16">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-500/90">
          Group study vault
        </p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          One hub for investing &amp; real estate videos plus shared links.
        </h1>
        <p className="max-w-xl text-pretty text-zinc-400">
          Paste YouTube URLs like your Learning Tracker vault, bookmark articles
          or PDFs under Resources, and see who marked each lesson as watched.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/signup"
          className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-50 hover:border-zinc-400"
        >
          Log in
        </Link>
      </div>
      <p className="text-sm text-zinc-500">
        New accounts:{" "}
        <Link href="/signup" className="text-amber-400 underline-offset-4 hover:underline">
          /signup
        </Link>{" "}
        (aliases{" "}
        <Link href="/register" className="text-zinc-400 hover:underline">
          /register
        </Link>
        ).
      </p>
      <ul className="grid gap-2 text-sm text-zinc-500">
        <li>• Canonical YouTube ingest + thumbnails (oEmbed).</li>
        <li>• Separate tabs for Videos and Resources.</li>
        <li>• Watch list is per signed-in teammate.</li>
      </ul>
    </div>
  );
}
