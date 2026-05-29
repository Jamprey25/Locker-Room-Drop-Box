import { Link2, Play, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { FeatureCard } from "@/components/ui/card";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";

const features = [
  {
    icon: <Play className="h-5 w-5 text-sky-400" aria-hidden />,
    title: "Video vault",
    body: "Canonical YouTube ingest, thumbnails via oEmbed, duplicate-safe.",
  },
  {
    icon: <Link2 className="h-5 w-5 text-indigo-400" aria-hidden />,
    title: "Resources",
    body: "Articles, PDFs, sheets—anything with a URL, plus notes.",
  },
  {
    icon: <Users className="h-5 w-5 text-emerald-400" aria-hidden />,
    title: "Who watched",
    body: "Per-member confirmations so mentors see who caught up.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-6 py-20 lg:py-28">
      <FadeIn className="mx-auto flex w-full max-w-3xl flex-col items-center text-center lg:mx-0 lg:items-start lg:text-left">
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
          <ButtonLink href="/signup" size="lg">
            Get started
          </ButtonLink>
          <ButtonLink href="/login" variant="secondary" size="lg">
            Log in
          </ButtonLink>
        </div>
      </FadeIn>

      <Stagger className="mx-auto mt-20 grid w-full max-w-3xl gap-4 sm:grid-cols-3 lg:mx-0 lg:max-w-none">
        {features.map((item) => (
          <StaggerItem key={item.title}>
            <FeatureCard
              icon={item.icon}
              title={item.title}
              body={item.body}
            />
          </StaggerItem>
        ))}
      </Stagger>
    </main>
  );
}
