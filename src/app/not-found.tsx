import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-8 px-6 py-20 text-center">
      <div>
        <p className="text-sm font-semibold text-sky-400/90">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          This page doesn&apos;t exist
        </h1>
        <p className="mt-4 text-pretty text-slate-400">
          The link may be wrong or the route was removed. Head home or open your
          locker.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-950/40 transition hover:brightness-110"
        >
          Home
        </Link>
        <Link
          href="/hub"
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-7 py-3 text-sm font-semibold text-slate-100 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          Hub
        </Link>
      </div>
    </div>
  );
}
