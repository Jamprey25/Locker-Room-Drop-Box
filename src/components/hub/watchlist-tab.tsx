"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { LineChart, TrendingUp } from "lucide-react";
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
import { Alert } from "@/components/ui/alert";
import { Badge, TickerBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page-header";
import { FieldGroup, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/format";

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
  const { toast } = useToast();
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
      const res = await addWatchlistItem({
        companyName: form.companyName,
        ticker: form.ticker,
        sector: form.sector,
        type: form.type,
        thesis: form.thesis || undefined,
        notes: form.notes || undefined,
      });

      if (!res.ok) {
        toast(res.error, "error");
        return;
      }

      setForm(emptyForm);
      toast(`${form.ticker.toUpperCase()} added to the watchlist.`, "success");
      router.refresh();
    });
  }

  function handleDelete(id: string | undefined, ticker: string) {
    if (!id) return;
    if (!window.confirm(`Remove ${ticker} from the watchlist?`)) return;

    start(async () => {
      const res = await deleteWatchlistItem({ id });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast(`${ticker} removed from the watchlist.`, "success");
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
        <Card>
          <CardContent>
            <CardTitle>Watchlist setup required</CardTitle>
            <Alert variant="error" className="mt-4">
              {props.setupError}
            </Alert>
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
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-8">
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <CardTitle>Group watchlist</CardTitle>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
                {totalEntries} names across {props.groups.length} sectors — sorted
                alphabetically within each theme. Add or remove tickers below.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => start(() => void loadQuotes(true))}
              disabled={pending || loadingPrices || !apiConfigured || tickers.length === 0}
              className="shrink-0"
            >
              {pending || loadingPrices ? "Updating…" : "Refresh prices"}
            </Button>
          </div>

          {!apiConfigured ? (
            <Alert variant="warning" className="mt-4">
              Add{" "}
              <code className="font-mono text-amber-50">ALPHA_VANTAGE_API_KEY</code>{" "}
              to your environment to enable live quotes.
            </Alert>
          ) : null}

          {loadingPrices && apiConfigured ? (
            <p className="mt-4 text-sm text-slate-400">
              Loading prices… {loadedCount}/{tickers.length} loaded.
            </p>
          ) : null}

          {quoteError ? (
            <Alert variant="error" className="mt-4">
              {quoteError}
            </Alert>
          ) : null}

          {lastUpdated ? (
            <p className="mt-4 text-xs text-slate-500">
              Prices updated {formatRelativeTime(lastUpdated)}
              {apiConfigured
                ? ` · ${loadedCount}/${tickers.length} symbols loaded`
                : null}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardTitle className="mb-6">Add a stock or ETF</CardTitle>
          <form onSubmit={handleAddStock} className="flex flex-col gap-5">
            <FieldGroup>
              <Label label="Ticker" htmlFor="wl-ticker">
                <Input
                  id="wl-ticker"
                  required
                  maxLength={12}
                  value={form.ticker}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))
                  }
                  placeholder="NVDA"
                  className="font-mono uppercase"
                />
              </Label>
              <Label label="Type" htmlFor="wl-type">
                <Select
                  id="wl-type"
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as "Stock" | "ETF",
                    }))
                  }
                >
                  <option value="Stock">Stock</option>
                  <option value="ETF">ETF</option>
                </Select>
              </Label>
              <Label label="Company name" htmlFor="wl-company" className="sm:col-span-2">
                <Input
                  id="wl-company"
                  required
                  maxLength={200}
                  value={form.companyName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, companyName: e.target.value }))
                  }
                  placeholder="NVIDIA"
                />
              </Label>
              <Label label="Sector / theme" htmlFor="wl-sector" className="sm:col-span-2">
                <Input
                  id="wl-sector"
                  required
                  maxLength={120}
                  value={form.sector}
                  onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                  placeholder="AI / Semiconductors"
                />
              </Label>
              <Label label="Investment thesis" htmlFor="wl-thesis" optional className="sm:col-span-2">
                <Textarea
                  id="wl-thesis"
                  rows={2}
                  maxLength={2000}
                  value={form.thesis}
                  onChange={(e) => setForm((f) => ({ ...f, thesis: e.target.value }))}
                />
              </Label>
              <Label label="Notes" htmlFor="wl-notes" optional className="sm:col-span-2">
                <Textarea
                  id="wl-notes"
                  rows={2}
                  maxLength={2000}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </Label>
            </FieldGroup>
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Saving…" : "Add to watchlist"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {props.groups.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No tickers yet"
          description="Add your first stock or ETF above to start tracking prices and building your group watchlist."
        />
      ) : (
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

              <Stagger className="flex flex-col gap-3">
                {group.entries.map((entry) => {
                  const quote = quotes[entry.ticker.toUpperCase()];
                  return (
                    <StaggerItem key={entry.id ?? entry.ticker}>
                      <Card
                        hover
                        className="border-white/[0.07] bg-white/[0.02] p-5 sm:p-6"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <TickerBadge>{entry.ticker}</TickerBadge>
                              <Badge variant="muted">{entry.type}</Badge>
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
                                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                                  <LineChart className="h-3.5 w-3.5" aria-hidden />
                                  {!apiConfigured
                                    ? "No API key"
                                    : loadingPrices
                                      ? "Loading…"
                                      : "Unavailable"}
                                </span>
                              )}
                            </div>
                            {entry.id ? (
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(entry.id, entry.ticker)}
                                disabled={pending}
                              >
                                Remove
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </Card>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
