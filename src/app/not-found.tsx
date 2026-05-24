import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-semibold text-white">Page not found</h1>
      <p className="text-zinc-400">
        That route does not exist. Head back home or jump into the locker.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black"
        >
          Home
        </Link>
        <Link
          href="/hub"
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-200"
        >
          Hub
        </Link>
      </div>
    </div>
  );
}
