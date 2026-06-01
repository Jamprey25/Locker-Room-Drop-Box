"use client";

import { Fragment, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { WatchlistSectorGroup } from "@/data/watchlist";
import type { StockQuote } from "@/lib/alpha-vantage";
import { Badge, TickerBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  buildWatchlistRows,
  changeBg,
  changeTone,
  formatUsd,
  sectorCounts,
  sortRows,
  type SortKey,
  type WatchlistRow,
} from "@/components/hub/watchlist-utils";
import { flattenWatchlistEntries } from "@/data/watchlist";

function StatPill({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums text-white",
          tone === "up" && "text-emerald-400",
          tone === "down" && "text-red-400"
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function PerformanceChart({ rows }: { rows: WatchlistRow[] }) {
  const withQuotes = rows.filter((r) => r.quote);
  if (withQuotes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Load prices to see the performance chart.
      </p>
    );
  }

  const sorted = [...withQuotes].sort((a, b) => b.changePct - a.changePct);
  const maxAbs = Math.max(
    ...sorted.map((r) => Math.abs(r.changePct)),
    0.01
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Daily % change</span>
        <span className="tabular-nums">
          {sorted.length} symbols
        </span>
      </div>
      <div className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
        {sorted.map((row) => {
          const pct = row.changePct;
          const width = (Math.abs(pct) / maxAbs) * 100;
          const positive = pct >= 0;
          return (
            <div
              key={row.ticker}
              className="grid grid-cols-[52px_1fr_56px] items-center gap-2"
            >
              <span className="font-mono text-xs font-bold text-sky-200">
                {row.ticker}
              </span>
              <div className="relative h-7 overflow-hidden rounded-lg bg-white/[0.03]">
                {positive ? (
                  <div
                    className="absolute left-1/2 top-0 h-full rounded-r-md bg-emerald-500/55"
                    style={{ width: `${width / 2}%` }}
                  />
                ) : (
                  <div
                    className="absolute right-1/2 top-0 h-full rounded-l-md bg-red-500/55"
                    style={{ width: `${width / 2}%` }}
                  />
                )}
                <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
              </div>
              <span
                className={cn(
                  "text-right text-xs font-semibold tabular-nums",
                  changeTone(pct)
                )}
              >
                {pct >= 0 ? "+" : ""}
                {pct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeatmapGrid({ rows }: { rows: WatchlistRow[] }) {
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.changePct)), 0.01);

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
      {rows.map((row) => {
        const intensity = Math.min(Math.abs(row.changePct) / maxAbs, 1);
        return (
          <div
            key={row.ticker}
            title={`${row.companyName} · ${row.changePct >= 0 ? "+" : ""}${row.changePct.toFixed(2)}%`}
            className="flex flex-col items-center justify-center rounded-xl border border-white/[0.06] px-1 py-2.5 transition hover:border-white/15"
            style={{ backgroundColor: changeBg(row.changePct, intensity) }}
          >
            <span className="font-mono text-[11px] font-bold text-white">
              {row.ticker}
            </span>
            <span
              className={cn(
                "mt-0.5 text-[10px] font-medium tabular-nums",
                changeTone(row.changePct)
              )}
            >
              {row.quote
                ? `${row.changePct >= 0 ? "+" : ""}${row.changePct.toFixed(1)}%`
                : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SectorBreakdown({
  sectors,
}: {
  sectors: { sector: string; count: number }[];
}) {
  const max = Math.max(...sectors.map((s) => s.count), 1);
  return (
    <div className="space-y-2">
      {sectors.slice(0, 6).map(({ sector, count }) => (
        <div key={sector} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="truncate text-slate-400">{sector}</span>
            <span className="shrink-0 tabular-nums text-slate-500">{count}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500/80 to-indigo-500/80"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  active,
  asc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  asc: boolean;
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="inline-flex items-center gap-1 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 transition hover:text-slate-300"
    >
      {label}
      {active ? (
        asc ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

export function WatchlistOverview({
  groups,
  quotes,
  apiConfigured,
  loadingPrices,
  pending,
  onDelete,
}: {
  groups: WatchlistSectorGroup[];
  quotes: Record<string, StockQuote>;
  apiConfigured: boolean;
  loadingPrices: boolean;
  pending: boolean;
  onDelete: (id: string | undefined, ticker: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("change");
  const [sortAsc, setSortAsc] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const entries = useMemo(() => flattenWatchlistEntries(groups), [groups]);
  const rows = useMemo(
    () => buildWatchlistRows(entries, quotes),
    [entries, quotes]
  );
  const sorted = useMemo(
    () => sortRows(rows, sortKey, sortAsc),
    [rows, sortKey, sortAsc]
  );
  const sectors = useMemo(() => sectorCounts(rows), [rows]);

  const withQuotes = rows.filter((r) => r.quote);
  const advancers = withQuotes.filter((r) => r.changePct > 0).length;
  const decliners = withQuotes.filter((r) => r.changePct < 0).length;
  const best = [...withQuotes].sort((a, b) => b.changePct - a.changePct)[0];
  const worst = [...withQuotes].sort((a, b) => a.changePct - b.changePct)[0];

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(key === "ticker" || key === "company" || key === "sector");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label="Holdings" value={rows.length} />
        <StatPill
          label="Movers"
          value={withQuotes.length ? `${advancers}↑ · ${decliners}↓` : "—"}
          sub={apiConfigured ? "with live quotes" : "quotes off"}
        />
        <StatPill
          label="Top"
          value={best ? best.ticker : "—"}
          sub={best ? `+${best.changePct.toFixed(2)}%` : undefined}
          tone="up"
        />
        <StatPill
          label="Laggard"
          value={worst ? worst.ticker : "—"}
          sub={
            worst
              ? `${worst.changePct >= 0 ? "+" : ""}${worst.changePct.toFixed(2)}%`
              : undefined
          }
          tone="down"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <CardContent className="p-5 sm:p-6">
          <CardTitle className="mb-4">At-a-glance heatmap</CardTitle>
          <HeatmapGrid rows={rows} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent>
            <CardTitle className="mb-4">Performance</CardTitle>
            <PerformanceChart rows={rows} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent>
            <CardTitle className="mb-4">By sector</CardTitle>
            <SectorBreakdown sectors={sectors} />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <CardContent className="p-0">
          <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <CardTitle>All holdings</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Click a row for thesis and notes · sort any column
            </p>
          </div>
          <div className="max-h-[min(520px,60vh)] overflow-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-md">
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left">
                    <SortHeader
                      label="Ticker"
                      sortKey="ticker"
                      active={sortKey === "ticker"}
                      asc={sortAsc}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3 text-left">
                    <SortHeader
                      label="Name"
                      sortKey="company"
                      active={sortKey === "company"}
                      asc={sortAsc}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="hidden px-3 py-3 text-left sm:table-cell">
                    <SortHeader
                      label="Sector"
                      sortKey="sector"
                      active={sortKey === "sector"}
                      asc={sortAsc}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="hidden px-3 py-3 text-left md:table-cell">
                    <SortHeader
                      label="Type"
                      sortKey="type"
                      active={sortKey === "type"}
                      asc={sortAsc}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-3 py-3 text-right">
                    <SortHeader
                      label="Price"
                      sortKey="price"
                      active={sortKey === "price"}
                      asc={sortAsc}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortHeader
                      label="Change"
                      sortKey="change"
                      active={sortKey === "change"}
                      asc={sortAsc}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => {
                  const rowKey = row.id ?? row.ticker;
                  const isOpen = expanded === rowKey;
                  return (
                    <Fragment key={rowKey}>
                      <tr className="border-b border-white/[0.04] transition hover:bg-white/[0.03]">
                        <td className="px-4 py-3">
                          <TickerBadge className="text-[11px]">
                            {row.ticker}
                          </TickerBadge>
                        </td>
                        <td className="max-w-[140px] truncate px-3 py-3 font-medium text-white sm:max-w-[200px]">
                          {row.companyName}
                        </td>
                        <td className="hidden max-w-[120px] truncate px-3 py-3 text-slate-400 sm:table-cell">
                          {row.sector}
                        </td>
                        <td className="hidden px-3 py-3 md:table-cell">
                          <Badge variant="muted" className="text-[10px]">
                            {row.type}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-white">
                          {row.quote ? (
                            formatUsd(row.quote.price)
                          ) : loadingPrices ? (
                            <span className="text-slate-600">…</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-semibold tabular-nums",
                            changeTone(row.changePct)
                          )}
                        >
                          {row.quote ? (
                            <>
                              {row.changePct >= 0 ? "+" : ""}
                              {row.changePct.toFixed(2)}%
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded(isOpen ? null : rowKey)
                            }
                            className="rounded-lg p-1 text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
                            aria-expanded={isOpen}
                            aria-label={isOpen ? "Collapse" : "Expand details"}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="border-b border-white/[0.06] bg-black/20">
                          <td colSpan={7} className="px-4 py-4 sm:px-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 space-y-2 text-sm">
                                <p className="text-slate-400 sm:hidden">
                                  <span className="text-slate-500">Sector · </span>
                                  {row.sector}
                                  <span className="mx-2 text-slate-700">|</span>
                                  {row.type}
                                </p>
                                {row.thesis ? (
                                  <p className="leading-relaxed text-slate-300">
                                    <span className="font-medium text-slate-500">
                                      Thesis ·{" "}
                                    </span>
                                    {row.thesis}
                                  </p>
                                ) : null}
                                {row.notes ? (
                                  <p className="text-slate-500">{row.notes}</p>
                                ) : null}
                                {!row.thesis && !row.notes ? (
                                  <p className="text-slate-600 italic">
                                    No thesis or notes.
                                  </p>
                                ) : null}
                              </div>
                              {row.id ? (
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => onDelete(row.id, row.ticker)}
                                  disabled={pending}
                                  className="shrink-0"
                                >
                                  Remove
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
