"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addWatchlistItem,
  deleteWatchlistItem,
} from "@/app/actions/hub";
import {
  flattenWatchlistEntries,
  watchlistTickers,
  type WatchlistSectorGroup,
} from "@/data/watchlist";
import type { StockQuote } from "@/lib/alpha-vantage";

const glassPanel =
  "rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-xl shadow-black/30 backdrop-blur-xl sm:p-7";

const inputCls =
  "rounded-xl border border-white/[0.08] bg-black/25 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-sky-500/45 focus:bg-black/35 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition";

const REQUEST_GAP_MS = 1_200;

const emptyForm: {
  companyName: string;
  ticker: string;
  sector: string;
  type: "Stock" | "ETF";
  thesis: string;
  notes: string;
} = {
  companyName: "",
  ticker: "",
  sector: "",
  type: "Stock",
  thesis: "",
  notes: "",
};

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
  setupError?: string | null;
}) {
  const router = useRouter();
  const entries = useMemo(
    () => flattenWatchlistEntries(props.groups),
    [props.groups]
  );
  const tickers = useMemo(() => watchlistTickers(entries), [entries]);
  const tickersKey = tickers.join("|");

  const [quotes, setQuotes] = useState(props.initialQuotes);
  const [apiConfigured, setApiConfigured] = useState(props.apiConfigured);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
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
    async (refresh = false, symbols = tickers) => {
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

        for (let i = 0; i < symbols.length; i++) {
          if (fetchRunRef.current !== runId) return;

          const symbol = symbols[i];
          if (!refresh && mergedQuotes[symbol]) continue;

          const { shouldContinue, quote } = await fetchOneQuote(symbol, refresh);
          if (quote) mergedQuotes[quote.symbol] = quote;
          if (!shouldContinue) break;

          if (i < symbols.length - 1) {
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
    if (props.apiConfigured && tickers.length > 0) {
      void loadQuotes(false, tickers);
    }
  }, [props.apiConfigured, tickersKey, loadQuotes, tickers]);

  function handleAddStock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    start(async () => {
      setFormError(null);
      setFormMessage(null);

      const res = await addWatchlistItem({
        companyName: form.companyName,
        ticker: form.ticker,
        sector: form.sector,
        type: form.type,
        thesis: form.thesis || undefined,
        notes: form.notes || undefined,
      });

      if (!res.ok) {
        setFormError(res.error);
        return;
      }

      setForm(emptyForm);
      setFormMessage(`${form.ticker.toUpperCase()} added to the watchlist.`);
      router.refresh();
    });
  }

  function handleDelete(id: string | undefined, ticker: string) {
    if (!id) return;
    if (!window.confirm(`Remove ${ticker} from the watchlist?`)) return;

    start(async () => {
      setFormError(null);
      setFormMessage(null);
      const res = await deleteWatchlistItem({ id });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setFormMessage(`${ticker} removed from the watchlist.`);
      setQuotes((prev) => {
        const next = { ...prev };
        delete next[ticker.toUpperCase()];
        return next;
      });
      router.refresh();
    });
  }

  const totalEntries = entries.length;
  const loadedCount = tickers.filter((t) => quotes[t]).length;

  if (props.setupError) {
    return (
      <section className="flex flex-col gap-6">
        <div className={glassPanel}>
          <p className="text-[15px] font-semibold text-white">
            Watchlist setup required
          </p>
          <p className="mt-3 text-sm leading-relaxed text-red-100">
            {props.setupError}
          </p>
          <div className="mt-5 space-y-3 text-sm leading-relaxed text-slate-300">
            <p className="font-semibold text-white">Fix (pick one):</p>
            <ol className="list-decimal space-y-2 pl-5 text-slate-400">
              <li>
                Set <code className="text-slate-200">DIRECT_URL</code> to your
                Supabase <strong className="text-slate-200">Session pool</strong>{" "}
                URL (port <code className="text-slate-200">5432</code>, not{" "}
                <code className="text-slate-200">6543</code>), then run{" "}
                <code className="text-slate-200">npm run db:push</code>.
              </li>
              <li>
                Or open Supabase → SQL Editor and run{" "}
                <code className="text-slate-200">scripts/create-watchlist-items.sql</code>{" "}
                from this repo, then refresh the page.
              </li>
            </ol>
          </div>
        </div>
      </section>
    );
  }

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
              alphabetically within each theme. Add or remove tickers below.
            </p>
          </div>
          <button
            type="button"
            onClick={() => start(() => void loadQuotes(true))}
            disabled={pending || loadingPrices || !apiConfigured || tickers.length === 0}
            className="shrink-0 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-sky-500/40 hover:bg-sky-500/10 disabled:opacity-50"
          >
            {pending || loadingPrices ? "Updating…" : "Refresh prices"}
          </button>
        </div>

        {!apiConfigured ? (
          <p className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
            Add <code className="font-mono text-amber-50">ALPHA_VANTAGE_API_KEY</code>{" "}
            to your environment to enable live quotes.
          </p>
        ) : null}

        {loadingPrices && apiConfigured ? (
          <p className="mt-4 text-sm text-slate-400">
            Loading prices… {loadedCount}/{tickers.length} loaded.
          </p>
        ) : null}

        {quoteError ? (
          <p className="mt-4 rounded-2xl border border-red-500/25 bg-red-950/35 px-4 py-3 text-sm text-red-100">
            {quoteError}
          </p>
        ) : null}

        {formError ? (
          <p className="mt-4 rounded-2xl border border-red-500/25 bg-red-950/35 px-4 py-3 text-sm text-red-100">
            {formError}
          </p>
        ) : null}

        {formMessage ? (
          <p className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-50">
            {formMessage}
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

      <form className={glassPanel} onSubmit={handleAddStock}>
        <p className="mb-6 text-[15px] font-semibold text-white">Add a stock or ETF</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400">
            Ticker
            <input
              required
              maxLength={12}
              value={form.ticker}
              onChange={(e) =>
                setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))
              }
              placeholder="NVDA"
              className={`${inputCls} font-mono uppercase`}
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400">
            Type
            <select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as "Stock" | "ETF",
                }))
              }
              className={inputCls}
            >
              <option value="Stock">Stock</option>
              <option value="ETF">ETF</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400 sm:col-span-2">
            Company name
            <input
              required
              maxLength={200}
              value={form.companyName}
              onChange={(e) =>
                setForm((f) => ({ ...f, companyName: e.target.value }))
              }
              placeholder="NVIDIA"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400 sm:col-span-2">
            Sector / theme
            <input
              required
              maxLength={120}
              value={form.sector}
              onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
              placeholder="AI / Semiconductors"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400 sm:col-span-2">
            Investment thesis{" "}
            <span className="font-normal text-slate-600">optional</span>
            <textarea
              rows={2}
              maxLength={2000}
              value={form.thesis}
              onChange={(e) => setForm((f) => ({ ...f, thesis: e.target.value }))}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400 sm:col-span-2">
            Notes <span className="font-normal text-slate-600">optional</span>
            <textarea
              rows={2}
              maxLength={2000}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className={inputCls}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-8 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 px-10 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-950/40 transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add to watchlist"}
        </button>
      </form>

      <div className="flex flex-col gap-10">
        {props.groups.length === 0 ? (
          <p className="text-center text-sm text-slate-500">
            No tickers yet — add your first stock above.
          </p>
        ) : null}

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
                    key={entry.id ?? entry.ticker}
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
                        {entry.thesis ? (
                          <p className="text-sm leading-relaxed text-slate-400">
                            {entry.thesis}
                          </p>
                        ) : null}
                        {entry.notes ? (
                          <p className="text-xs text-slate-500">{entry.notes}</p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col gap-3 lg:items-end">
                        <div className="flex flex-col items-start gap-1 rounded-2xl border border-white/[0.06] bg-black/25 px-4 py-3 lg:min-w-[140px] lg:items-end">
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
                        {entry.id ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id, entry.ticker)}
                            disabled={pending}
                            className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/15 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        ) : null}
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
