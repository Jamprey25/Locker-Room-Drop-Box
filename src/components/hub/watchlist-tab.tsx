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
import { ChevronDown, Plus, TrendingUp } from "lucide-react";
import {
  addWatchlistItem,
  deleteWatchlistItem,
} from "@/app/actions/hub";
import {
  flattenWatchlistEntries,
  WATCHLIST_TYPES,
  watchlistTickers,
  type WatchlistSectorGroup,
  type WatchlistType,
} from "@/data/watchlist";
import type { StockQuote } from "@/lib/alpha-vantage";
import { WatchlistOverview } from "@/components/hub/watchlist-overview";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page-header";
import { FieldGroup, Input, Label, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

const REQUEST_GAP_MS = 1_200;

const emptyForm: {
  companyName: string;
  ticker: string;
  sector: string;
  type: WatchlistType;
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
  const [showAddForm, setShowAddForm] = useState(false);
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
      setShowAddForm(false);
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
    <section className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <CardTitle>Group watchlist</CardTitle>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
                {totalEntries} holdings · {props.groups.length} sectors · dashboard
                view below
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAddForm((s) => !s)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add holding
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition",
                    showAddForm && "rotate-180"
                  )}
                />
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => start(() => void loadQuotes(true))}
                disabled={
                  pending || loadingPrices || !apiConfigured || tickers.length === 0
                }
              >
                {pending || loadingPrices ? "Updating…" : "Refresh prices"}
              </Button>
            </div>
          </div>

          {!apiConfigured ? (
            <Alert variant="warning" className="mt-4">
              Add{" "}
              <code className="font-mono text-amber-50">ALPHA_VANTAGE_API_KEY</code>{" "}
              to your environment to enable live quotes and charts.
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

      {showAddForm ? (
        <Card>
          <CardContent>
            <CardTitle className="mb-6">Add to watchlist</CardTitle>
            <form onSubmit={handleAddStock} className="flex flex-col gap-5">
              <FieldGroup>
                <Label label="Ticker" htmlFor="wl-ticker">
                  <Input
                    id="wl-ticker"
                    required
                    maxLength={12}
                    value={form.ticker}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        ticker: e.target.value.toUpperCase(),
                      }))
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
                        type: e.target.value as WatchlistType,
                      }))
                    }
                  >
                    {WATCHLIST_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sector: e.target.value }))
                    }
                    placeholder="AI / Semiconductors"
                  />
                </Label>
                <Label
                  label="Investment thesis"
                  htmlFor="wl-thesis"
                  optional
                  className="sm:col-span-2"
                >
                  <Textarea
                    id="wl-thesis"
                    rows={2}
                    maxLength={2000}
                    value={form.thesis}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, thesis: e.target.value }))
                    }
                  />
                </Label>
                <Label label="Notes" htmlFor="wl-notes" optional className="sm:col-span-2">
                  <Textarea
                    id="wl-notes"
                    rows={2}
                    maxLength={2000}
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </Label>
              </FieldGroup>
              <Button type="submit" disabled={pending} className="w-fit">
                {pending ? "Saving…" : "Add to watchlist"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {props.groups.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No tickers yet"
          description="Add your first security with “Add holding” to populate the dashboard."
        />
      ) : (
        <WatchlistOverview
          groups={props.groups}
          quotes={quotes}
          apiConfigured={apiConfigured}
          loadingPrices={loadingPrices}
          pending={pending}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}
