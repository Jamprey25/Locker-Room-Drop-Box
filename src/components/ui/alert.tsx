import { cn } from "@/lib/cn";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

const variants = {
  error: {
    container: "border-red-500/25 bg-red-950/35 text-red-100",
    icon: AlertCircle,
  },
  success: {
    container: "border-emerald-500/25 bg-emerald-950/30 text-emerald-50",
    icon: CheckCircle2,
  },
  warning: {
    container: "border-amber-500/25 bg-amber-950/25 text-amber-100",
    icon: AlertCircle,
  },
  info: {
    container: "border-sky-500/25 bg-sky-950/25 text-sky-100",
    icon: Info,
  },
} as const;

export function Alert({
  variant = "error",
  className,
  children,
}: {
  variant?: keyof typeof variants;
  className?: string;
  children: React.ReactNode;
}) {
  const { container, icon: Icon } = variants[variant];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        container,
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
