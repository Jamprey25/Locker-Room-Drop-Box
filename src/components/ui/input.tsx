import { cn } from "@/lib/cn";

export function Label({
  className,
  label,
  children,
  hint,
  optional,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & {
  label?: string;
  hint?: string;
  optional?: boolean;
}) {
  return (
    <label
      className={cn("flex flex-col gap-2 text-xs font-medium text-slate-400", className)}
      {...props}
    >
      {label ? (
        <span>
          {label}
          {optional ? (
            <span className="ml-1 font-normal text-slate-600">optional</span>
          ) : null}
        </span>
      ) : (
        children
      )}
      {label ? children : null}
      {hint ? (
        <span className="text-xs font-normal leading-relaxed text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

const fieldCls =
  "rounded-xl border border-white/[0.08] bg-input-bg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 transition focus:border-sky-500/45 focus:bg-bg-elevated/80 focus:outline-none focus:ring-1 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldCls, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldCls, "min-h-[88px] resize-y", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldCls, className)} {...props}>
      {children}
    </select>
  );
}

export function FieldGroup({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-5 sm:grid-cols-2", className)}>{children}</div>
  );
}
