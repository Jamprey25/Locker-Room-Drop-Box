import type { WatchlistType } from "@/data/watchlist";
import { watchlistTypeTickerClass } from "@/components/hub/watchlist-utils";
import { cn } from "@/lib/cn";

const variants = {
  default:
    "border-white/[0.08] bg-white/[0.05] text-slate-200",
  accent:
    "border-sky-500/30 bg-sky-500/10 text-sky-200",
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  muted:
    "border-white/[0.08] bg-white/[0.05] text-slate-400",
} as const;

export function Badge({
  variant = "default",
  className,
  children,
}: {
  variant?: keyof typeof variants;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function TickerBadge({
  children,
  className,
  type,
}: {
  children: React.ReactNode;
  className?: string;
  type?: WatchlistType;
}) {
  return (
    <span
      className={cn(
        "rounded-lg border px-2.5 py-1 font-mono text-sm font-bold tracking-wide",
        type
          ? watchlistTypeTickerClass(type)
          : "border-sky-500/30 bg-sky-500/10 text-sky-200",
        className
      )}
    >
      {children}
    </span>
  );
}
