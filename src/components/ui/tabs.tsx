"use client";

import { cn } from "@/lib/cn";
import { motion } from "framer-motion";

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-wrap rounded-full border border-white/[0.08] bg-white/[0.04] p-1 backdrop-blur-md",
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative rounded-full px-5 py-2.5 text-sm font-semibold transition sm:px-6",
              isActive ? "text-white" : "text-slate-500 hover:text-slate-200"
            )}
          >
            {isActive ? (
              <motion.span
                layoutId="tab-indicator"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 shadow-md shadow-black/40"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            ) : null}
            <span className="relative z-[1]">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
