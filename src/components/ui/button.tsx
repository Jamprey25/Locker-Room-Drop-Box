import { cn } from "@/lib/cn";

const variants = {
  primary:
    "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-950/40 hover:brightness-110 active:scale-[0.98]",
  secondary:
    "border border-white/10 bg-white/[0.03] text-slate-100 backdrop-blur-sm hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.98]",
  ghost:
    "border border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white active:scale-[0.98]",
  danger:
    "border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15 active:scale-[0.98]",
  success:
    "border border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15 active:scale-[0.98]",
  watched:
    "border border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15 active:scale-[0.98]",
  unwatched:
    "border border-white/15 bg-white/[0.04] text-white hover:border-sky-500/40 hover:bg-sky-500/10 active:scale-[0.98]",
} as const;

const sizes = {
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-8 py-3 text-sm",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  href: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold transition",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}
