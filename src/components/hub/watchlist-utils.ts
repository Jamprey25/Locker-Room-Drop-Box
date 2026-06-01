import type { WatchlistEntry } from "@/data/watchlist";
import type { StockQuote } from "@/lib/alpha-vantage";

export type WatchlistRow = WatchlistEntry & {
  quote?: StockQuote;
  changePct: number;
};

export function parseChangePercent(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number.parseFloat(raw.replace("%", "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function buildWatchlistRows(
  entries: WatchlistEntry[],
  quotes: Record<string, StockQuote>
): WatchlistRow[] {
  return entries.map((entry) => {
    const quote = quotes[entry.ticker.toUpperCase()];
    return {
      ...entry,
      quote,
      changePct: quote ? parseChangePercent(quote.changePercent) : 0,
    };
  });
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function changeTone(change: number) {
  if (change > 0) return "text-emerald-400";
  if (change < 0) return "text-red-400";
  return "text-slate-400";
}

export function changeBg(change: number, intensity = 1) {
  if (change > 0) return `rgba(52, 211, 153, ${0.12 + intensity * 0.2})`;
  if (change < 0) return `rgba(248, 113, 113, ${0.12 + intensity * 0.2})`;
  return "rgba(255, 255, 255, 0.04)";
}

export type SortKey =
  | "ticker"
  | "company"
  | "sector"
  | "type"
  | "price"
  | "change";

export function sortRows(rows: WatchlistRow[], key: SortKey, asc: boolean) {
  const dir = asc ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (key) {
      case "ticker":
        return a.ticker.localeCompare(b.ticker) * dir;
      case "company":
        return a.companyName.localeCompare(b.companyName) * dir;
      case "sector":
        return a.sector.localeCompare(b.sector) * dir;
      case "type":
        return a.type.localeCompare(b.type) * dir;
      case "price":
        return ((a.quote?.price ?? 0) - (b.quote?.price ?? 0)) * dir;
      case "change":
        return (a.changePct - b.changePct) * dir;
      default:
        return 0;
    }
  });
}

export function sectorCounts(rows: WatchlistRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.sector, (map.get(row.sector) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count);
}
