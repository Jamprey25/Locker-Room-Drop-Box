import { FileQuestion } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/motion";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-8 px-6 py-20 text-center">
      <FadeIn className="flex flex-col items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06]">
          <FileQuestion className="h-7 w-7 text-slate-500" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-sky-400/90">404</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            This page doesn&apos;t exist
          </h1>
          <p className="mt-4 text-pretty text-slate-400">
            The link may be wrong or the route was removed. Head home or open
            your locker.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Home</ButtonLink>
          <ButtonLink href="/hub" variant="secondary">
            Hub
          </ButtonLink>
        </div>
      </FadeIn>
    </main>
  );
}
