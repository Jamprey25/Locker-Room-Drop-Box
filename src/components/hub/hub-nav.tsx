"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Session } from "next-auth";
import { Menu, X } from "lucide-react";
import { SignOutButton } from "@/components/hub/sign-out-button";
import { Avatar, LogoBadge } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

export function HubNav({
  user,
}: {
  user: NonNullable<Session["user"]> & { id: string };
}) {
  const display = user.name?.trim() || user.email?.split("@")[0] || "Member";
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/hub", label: "Hub" },
    { href: "/hub/profile", label: "Profile" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-bg-base/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link
          href="/hub"
          className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-white"
        >
          <LogoBadge />
          Locker Room
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                pathname === link.href
                  ? "bg-white/[0.08] text-white"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-2.5">
            <Avatar name={display} size="sm" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">{display}</span>
              <span className="text-xs text-slate-500">Signed in</span>
            </div>
          </div>
          <SignOutButton />
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="rounded-xl border border-white/10 p-2 text-slate-300 transition hover:bg-white/[0.06] hover:text-white md:hidden"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/[0.06] bg-bg-base/95 px-5 py-4 backdrop-blur-xl md:hidden">
          <div className="flex items-center gap-3 pb-4">
            <Avatar name={display} size="md" />
            <div>
              <p className="text-sm font-medium text-white">{display}</p>
              <p className="text-xs text-slate-500">Signed in</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-xl px-4 py-3 text-sm font-medium transition",
                  pathname === link.href
                    ? "bg-white/[0.08] text-white"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <SignOutButton className="w-full justify-center" />
          </div>
        </div>
      ) : null}
    </header>
  );
}
