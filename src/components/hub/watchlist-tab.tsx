"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { WatchlistSectorGroup } from "@/data/watchlist";
import type { StockQuote } from "@/lib/alpha-vantage";
import { watchlistTickers } from "@/data/watchlist";

const glassPanel =
  "rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-xl shadow-black/30 backdrop-blur-xl sm:p-7";

const REQUEST_GAP_MS = 1_200;

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function WatchlistTab(props: {
  groups: WatchlistSectorGroup[];
  initialQuotes: Record<string, StockQuote>;
  apiConfigured: boolean;
}) {
  const tickers = watchlistTickers();
  const [quotes, setQuotes] = useState(props.initialQuotes);
  const [apiConfigured, setApiConfigured] = useState(props.apiConfigured);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fetchRunRef = useRef(0);

  const fetchOneQuote = useCallback(
    async (
      symbol: string,
      refresh: boolean
    ): Promise<{ shouldContinue: boolean; quote: StockQuote | null }> => {
      const res = await fetch(
        `/api/watchlist/quotes?symbol=${encodeURIComponent(symbol)}${refresh ? "&refresh=1" : ""}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        return { shouldContinue: false, quote: null };
      }

      const data = (await res.json()) as {
        quote: StockQuote | null;
        apiConfigured: boolean;
        error?: string;
        rateLimited?: boolean;
        refreshedAt?: string;
      };

      setApiConfigured(Boolean(data.apiConfigured));

      if (data.quote) {
        setQuotes((prev) => ({
          ...prev,
          [data.quote!.symbol.toUpperCase()]: data.quote!,
        }));
        setLastUpdated(data.refreshedAt ?? new Date().toISOString());
        return { shouldContinue: true, quote: data.quote };
      }

      if (data.error) {
        setQuoteError(data.error);
      }

      return { shouldContinue: !data.rateLimited, quote: null };
    },
    []
  );

  const loadQuotes = useCallback(
    async (refresh = false) => {
      const runId = ++fetchRunRef.current;
      setQuoteError(null);
      setLoadingPrices(true);

      let mergedQuotes: Record<string, StockQuote> = {};

      try {
        const cacheRes = await fetch("/api/watchlist/quotes", {
          cache: "no-store",
        });
        if (cacheRes.ok) {
          const cacheData = (await cacheRes.json()) as {
            quotes: Record<string, StockQuote>;
            apiConfigured: boolean;
            refreshedAt?: string;
          };
          mergedQuotes = { ...(cacheData.quotes ?? {}) };
          setQuotes((prev) => ({ ...prev, ...mergedQuotes }));
          setApiConfigured(Boolean(cacheData.apiConfigured));
          if (Object.keys(mergedQuotes).length > 0) {
            setLastUpdated(cacheData.refreshedAt ?? new Date().toISOString());
          }
        }

        if (!props.apiConfigured && Object.keys(mergedQuotes).length === 0) {
          return;
        }

        for (let i = 0; i < tickers.length; i++) {
          if (fetchRunRef.current !== runId) return;

          const symbol = tickers[i];
          if (!refresh && mergedQuotes[symbol]) continue;

          const { shouldContinue, quote } = await fetchOneQuote(symbol, refresh);
          if (quote) mergedQuotes[quote.symbol] = quote;
          if (!shouldContinue) break;

          if (i < tickers.length - 1) {
            await sleep(REQUEST_GAP_MS);
          }
        }
      } catch {
        setQuoteError("Network error while fetching prices.");
      } finally {
        if (fetchRunRef.current === runId) {
          setLoadingPrices(false);
        }
      }
    },
    [fetchOneQuote, props.apiConfigured, tickers]
  );

  useEffect(() => {
    if (props.apiConfigured) {
      void loadQuotes(false);
    }
    // Load cached + missing quotes once when the tab mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.apiConfigured]);

  const totalEntries = props.groups.reduce((n, g) => n + g.entries.length, 0);
  const loadedCount = tickers.filter((t) => quotes[t]).length;

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
            onClick={() => start(() => void loadQuotes(true))}
            disabled={pending || loadingPrices || !apiConfigured}
            className="shrink-0 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-sky-500/40 hover:bg-sky-500/10 disabled:opacity-50"
          >
            {pending || loadingPrices ? "Updating…" : "Refresh prices"}
          </button>
        </div>

        {!apiConfigured ? (
          <p className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
            Add <code className="font-mono text-amber-50">ALPHA_VANTAGE_API_KEY</code>{" "}
            to your environment to enable live quotes. Tickers and sectors still
            show below.
          </p>
        ) : null}

        {loadingPrices && apiConfigured ? (
          <p className="mt-4 text-sm text-slate-400">
            Loading prices… {loadedCount}/{tickers.length} loaded (Alpha Vantage
            free tier allows 1 request per second).
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
              ? ` · ${loadedCount}/${tickers.length} symbols loaded`
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
                            {!apiConfigured
                              ? "No API key"
                              : loadingPrices
                                ? "Loading…"
                                : "Unavailable"}
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
