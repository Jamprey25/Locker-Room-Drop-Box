import {
  groupWatchlistBySector,
  parseWatchlistType,
  WATCHLIST_ENTRIES,
  type WatchlistEntry,
  type WatchlistSectorGroup,
} from "@/data/watchlist";
import { prisma } from "@/lib/prisma";

function rowToEntry(row: {
  id: string;
  ticker: string;
  companyName: string;
  sector: string;
  type: string;
  thesis: string;
  status: string;
  priority: string;
  notes: string | null;
}): WatchlistEntry {
  return {
    id: row.id,
    companyName: row.companyName,
    ticker: row.ticker,
    sector: row.sector,
    type: parseWatchlistType(row.type),
    thesis: row.thesis,
    status: row.status,
    priority: row.priority,
    notes: row.notes ?? undefined,
  };
}

/** Seed the shared watchlist from the spreadsheet defaults when empty. */
export async function ensureWatchlistSeeded(addedById: string): Promise<void> {
  const count = await prisma.watchlistItem.count();
  if (count > 0) return;

  await prisma.watchlistItem.createMany({
    data: WATCHLIST_ENTRIES.map((entry) => ({
      ticker: entry.ticker.toUpperCase(),
      companyName: entry.companyName,
      sector: entry.sector,
      type: entry.type,
      thesis: entry.thesis,
      status: entry.status,
      priority: entry.priority,
      notes: entry.notes ?? null,
      addedById,
    })),
  });
}

export async function loadWatchlistGroups(): Promise<WatchlistSectorGroup[]> {
  const rows = await prisma.watchlistItem.findMany({
    orderBy: [{ sector: "asc" }, { companyName: "asc" }],
  });

  return groupWatchlistBySector(rows.map(rowToEntry));
}

export async function loadWatchlistTickers(): Promise<string[]> {
  const rows = await prisma.watchlistItem.findMany({
    select: { ticker: true },
    orderBy: { ticker: "asc" },
  });

  return rows.map((row) => row.ticker.toUpperCase());
}
