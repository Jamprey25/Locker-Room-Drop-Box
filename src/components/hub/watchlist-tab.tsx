"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { WatchlistSectorGroup } from "@/data/watchlist";
import type { StockQuote } from "@/lib/alpha-vantage";

const glassPanel =
  "rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-xl shadow-black/30 backdrop-blur-xl sm:p-7";

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function changeTone(change: number) {
  if (change > 0) return "text-emerald-400";
  if (change < 0) return "text-red-400";
  return "text-slate-400";
}

export function WatchlistTab(props: {
  groups: WatchlistSectorGroup[];
  initialQuotes: Record<string, StockQuote>;
  apiConfigured: boolean;
}) {
  const [quotes, setQuotes] = useState(props.initialQuotes);
  const [apiConfigured, setApiConfigured] = useState(props.apiConfigured);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const loadQuotes = useCallback((refresh = false) => {
    start(async () => {
      setQuoteError(null);
      try {
        const res = await fetch(
          `/api/watchlist/quotes${refresh ? "?refresh=1" : ""}`,
          { cache: "no-store" }
        );
        if (!res.ok) {
          setQuoteError("Could not load live prices.");
          return;
        }
        const data = (await res.json()) as {
          quotes: Record<string, StockQuote>;
          apiConfigured: boolean;
          refreshedAt?: string;
        };
        setQuotes(data.quotes ?? {});
        setApiConfigured(Boolean(data.apiConfigured));
        setLastUpdated(data.refreshedAt ?? new Date().toISOString());
      } catch {
        setQuoteError("Network error while fetching prices.");
      }
    });
  }, []);

  useEffect(() => {
    if (Object.keys(props.initialQuotes).length === 0 && props.apiConfigured) {
      loadQuotes(false);
    }
  }, [props.initialQuotes, props.apiConfigured, loadQuotes]);

  const totalEntries = props.groups.reduce((n, g) => n + g.entries.length, 0);

  return (
    <section className="flex flex-col gap-8">
      <div className={glassPanel}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-[15px] font-semibold text-white">
              Group watchlist
            </p>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              {totalEntries} names across {props.groups.length} sectors — sorted
              alphabetically within each theme. Live prices come from Alpha
              Vantage.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadQuotes(true)}
            disabled={pending || !apiConfigured}
            className="shrink-0 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-sky-500/40 hover:bg-sky-500/10 disabled:opacity-50"
          >
            {pending ? "Updating…" : "Refresh prices"}
          </button>
        </div>

        {!apiConfigured ? (
          <p className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
            Add <code className="font-mono text-amber-50">ALPHA_VANTAGE_API_KEY</code>{" "}
            to your environment to enable live quotes. Tickers and sectors still
            show below.
          </p>
        ) : null}

        {quoteError ? (
          <p className="mt-4 rounded-2xl border border-red-500/25 bg-red-950/35 px-4 py-3 text-sm text-red-100">
            {quoteError}
          </p>
        ) : null}

        {lastUpdated ? (
          <p className="mt-4 text-xs text-slate-500">
            Prices updated {formatRelativeTime(lastUpdated)}
            {apiConfigured
              ? " · Free Alpha Vantage tier limits how many symbols refresh per minute"
              : null}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-10">
        {props.groups.map((group) => (
          <div key={group.sector} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/[0.06] pb-3">
              <h2 className="text-lg font-semibold text-white">{group.sector}</h2>
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {group.entries.length}{" "}
                {group.entries.length === 1 ? "name" : "names"}
              </span>
            </div>

            <ul className="flex flex-col gap-3">
              {group.entries.map((entry) => {
                const quote = quotes[entry.ticker.toUpperCase()];
                return (
                  <li
                    key={entry.ticker}
                    className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5 transition hover:border-white/[0.12] hover:bg-white/[0.035] sm:p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-sky-200">
                            {entry.ticker}
                          </span>
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {entry.type}
                          </span>
                        </div>
                        <h3 className="text-[17px] font-semibold text-white">
                          {entry.companyName}
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-400">
                          {entry.thesis}
                        </p>
                        {entry.notes ? (
                          <p className="text-xs text-slate-500">{entry.notes}</p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col items-start gap-1 rounded-2xl border border-white/[0.06] bg-black/25 px-4 py-3 lg:min-w-[140px] lg:items-end">
                        {quote ? (
                          <>
                            <span className="text-lg font-semibold tabular-nums text-white">
                              {formatUsd(quote.price)}
                            </span>
                            <span
                              className={`text-sm font-medium tabular-nums ${changeTone(quote.change)}`}
                            >
                              {quote.change >= 0 ? "+" : ""}
                              {quote.change.toFixed(2)} ({quote.changePercent})
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-slate-500">
                            {apiConfigured ? "Price pending" : "No API key"}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatRelativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins <= 0) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs === 1 ? "1 hr ago" : `${hrs} hr ago`;
}
