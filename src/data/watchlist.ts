export const WATCHLIST_TYPES = [
  "Stock",
  "ETF",
  "Mutual Fund",
  "Bond",
] as const;

export type WatchlistType = (typeof WATCHLIST_TYPES)[number];

export function parseWatchlistType(value: string): WatchlistType {
  return (WATCHLIST_TYPES as readonly string[]).includes(value)
    ? (value as WatchlistType)
    : "Stock";
}

export type WatchlistEntry = {
  id?: string;
  companyName: string;
  ticker: string;
  sector: string;
  type: WatchlistType;
  thesis: string;
  status: string;
  priority: string;
  notes?: string;
};

/** Seed data from investment_group_tracker.xlsx — Watchlist sheet */
export const WATCHLIST_ENTRIES: WatchlistEntry[] = [
  {
    companyName: "Bloom Energy Corp.",
    ticker: "BE",
    sector: "AI Infrastructure",
    type: "Stock",
    thesis:
      "Solid oxide fuel cells — continuous dense power for AI; alternative to traditional electrical grids",
    status: "Neutral",
    priority: "Neutral",
  },
  {
    companyName: "Corning Inc.",
    ticker: "GLW",
    sector: "AI Infrastructure",
    type: "Stock",
    thesis: "Glass & fiber optic resources powering AI data transmission",
    status: "Neutral",
    priority: "Neutral",
  },
  {
    companyName: "Freeport-McMoRan",
    ticker: "FCX",
    sector: "AI Infrastructure",
    type: "Stock",
    thesis:
      "World's largest publicly traded copper producer; copper is essential for computing & AI chips",
    status: "Neutral",
    priority: "Neutral",
  },
  {
    companyName: "Global X Copper Miners ETF",
    ticker: "COPX",
    sector: "AI Infrastructure",
    type: "ETF",
    thesis:
      "Broader copper mining exposure as a complement or alternative to FCX",
    status: "Neutral",
    priority: "Neutral",
  },
  {
    companyName: "NVIDIA",
    ticker: "NVDA",
    sector: "AI / Semiconductors",
    type: "Stock",
    thesis: "Dominant AI GPU maker — core AI infrastructure holding",
    status: "Neutral",
    priority: "Neutral",
  },
  {
    companyName: "First Trust Nasdaq Cybersecurity ETF",
    ticker: "CIBR",
    sector: "Cybersecurity",
    type: "ETF",
    thesis:
      "Tracks companies specializing in data, identity, network & application security",
    status: "Neutral",
    priority: "Neutral",
  },
  {
    companyName: "X-Energy Inc.",
    ticker: "XE",
    sector: "Energy / AI Infra",
    type: "Stock",
    thesis:
      "Nuclear energy company; AI data centers are driving demand for clean baseload power",
    status: "Neutral",
    priority: "Neutral",
  },
  {
    companyName: "Defiance Quantum ETF",
    ticker: "QTUM",
    sector: "Quantum / AI",
    type: "ETF",
    thesis:
      "Basket of quantum computing & ML companies; covers hardware, software, semiconductors, AI chips",
    status: "Neutral",
    priority: "Neutral",
  },
  {
    companyName: "Micron Technology Inc.",
    ticker: "MU",
    sector: "Semiconductors",
    type: "Stock",
    thesis:
      "Memory chips for AI workloads — may have missed peak but worth monitoring for re-entry",
    status: "Neutral",
    priority: "Neutral",
    notes: "Possibly too expensive — missed the boom?",
  },
  {
    companyName: "Roundhill Memory ETF",
    ticker: "DRAM",
    sector: "Semiconductors",
    type: "ETF",
    thesis: "ETF exposure to memory chip sector; diversifies MU risk",
    status: "Neutral",
    priority: "Neutral",
  },
  {
    companyName: "VanEck Semiconductor ETF",
    ticker: "SMH",
    sector: "Semiconductors",
    type: "ETF",
    thesis:
      "Broad semiconductor ETF; captures AI chip tailwinds across multiple companies",
    status: "Neutral",
    priority: "Neutral",
  },
];

export type WatchlistSectorGroup = {
  sector: string;
  entries: WatchlistEntry[];
};

/** Sectors alphabetical; companies alphabetical within each sector */
export function groupWatchlistBySector(
  entries: WatchlistEntry[] = WATCHLIST_ENTRIES
): WatchlistSectorGroup[] {
  const bySector = new Map<string, WatchlistEntry[]>();

  for (const entry of entries) {
    const list = bySector.get(entry.sector) ?? [];
    list.push(entry);
    bySector.set(entry.sector, list);
  }

  return [...bySector.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map(([sector, sectorEntries]) => ({
      sector,
      entries: [...sectorEntries].sort((a, b) =>
        a.companyName.localeCompare(b.companyName, undefined, {
          sensitivity: "base",
        })
      ),
    }));
}

export function watchlistTickers(entries: WatchlistEntry[]): string[] {
  return [...new Set(entries.map((e) => e.ticker.toUpperCase()))].sort();
}

export function flattenWatchlistEntries(
  groups: WatchlistSectorGroup[]
): WatchlistEntry[] {
  return groups.flatMap((group) => group.entries);
}
