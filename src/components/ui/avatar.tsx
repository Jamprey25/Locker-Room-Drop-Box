import { cn } from "@/lib/cn";
import { getInitials } from "@/lib/format";

const sizes = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
} as const;

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/80 to-indigo-600/80 font-bold text-white ring-2 ring-white/10",
        sizes[size],
        className
      )}
      aria-hidden
    >
      {getInitials(name)}
    </span>
  );
}

export function LogoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 text-[11px] font-bold text-white shadow-md shadow-sky-900/40",
        className
      )}
    >
      LR
    </span>
  );
}
