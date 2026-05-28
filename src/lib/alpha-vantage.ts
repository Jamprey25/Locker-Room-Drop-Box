export type StockQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  latestTradingDay?: string;
};

type GlobalQuoteResponse = {
  "Global Quote"?: Record<string, string>;
  Note?: string;
  Information?: string;
};

const CACHE_TTL_MS = 15 * 60 * 1000;
const quoteCache = new Map<string, { quote: StockQuote; fetchedAt: number }>();

function parseNumber(value: string | undefined): number | null {
  if (!value || value === "None") return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function parseGlobalQuote(raw: Record<string, string>): StockQuote | null {
  const symbol = raw["01. symbol"]?.trim();
  const price = parseNumber(raw["05. price"]);
  const change = parseNumber(raw["09. change"]);

  if (!symbol || price === null || change === null) return null;

  return {
    symbol: symbol.toUpperCase(),
    price,
    change,
    changePercent: raw["10. change percent"]?.trim() ?? "0%",
    latestTradingDay: raw["07. latest trading day"]?.trim(),
  };
}

async function fetchGlobalQuote(symbol: string): Promise<StockQuote | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY?.trim();
  if (!apiKey) return null;

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "GLOBAL_QUOTE");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;

  const data = (await res.json()) as GlobalQuoteResponse;

  if (data.Note || data.Information) {
    console.warn("[alpha-vantage]", symbol, data.Note ?? data.Information);
    return null;
  }

  if (!data["Global Quote"]) return null;
  return parseGlobalQuote(data["Global Quote"]);
}

function getCachedQuote(symbol: string): StockQuote | null {
  const hit = quoteCache.get(symbol);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > CACHE_TTL_MS) {
    quoteCache.delete(symbol);
    return null;
  }
  return hit.quote;
}

function setCachedQuote(quote: StockQuote) {
  quoteCache.set(quote.symbol, { quote, fetchedAt: Date.now() });
}

export function isAlphaVantageConfigured(): boolean {
  return Boolean(process.env.ALPHA_VANTAGE_API_KEY?.trim());
}

/** Returns cached quotes immediately; optionally refreshes stale/missing symbols. */
export async function fetchStockQuotes(
  symbols: string[],
  options?: { refresh?: boolean }
): Promise<{ quotes: Record<string, StockQuote>; apiConfigured: boolean }> {
  const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()))].filter(
    Boolean
  );
  const apiConfigured = isAlphaVantageConfigured();
  const quotes: Record<string, StockQuote> = {};
  const refresh = options?.refresh ?? false;

  if (!apiConfigured || unique.length === 0) {
    return { quotes, apiConfigured };
  }

  const toFetch: string[] = [];
  for (const symbol of unique) {
    if (!refresh) {
      const cached = getCachedQuote(symbol);
      if (cached) {
        quotes[symbol] = cached;
        continue;
      }
    }
    toFetch.push(symbol);
  }

  if (toFetch.length === 0) {
    return { quotes, apiConfigured };
  }

  // Free tier allows ~5 calls/min — fetch sequentially with a short pause to reduce throttling.
  for (let i = 0; i < toFetch.length; i++) {
    const symbol = toFetch[i];
    const quote = await fetchGlobalQuote(symbol);
    if (quote) {
      setCachedQuote(quote);
      quotes[symbol] = quote;
    }
    if (i < toFetch.length - 1) {
      await new Promise((r) => setTimeout(r, 12_500));
    }
  }

  for (const symbol of unique) {
    const cached = getCachedQuote(symbol);
    if (cached && !quotes[symbol]) quotes[symbol] = cached;
  }

  return { quotes, apiConfigured };
}
