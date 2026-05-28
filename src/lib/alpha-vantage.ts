export type StockQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  latestTradingDay?: string;
};

export type QuoteFetchResult =
  | { ok: true; quote: StockQuote; fromCache: boolean }
  | { ok: false; error: string; rateLimited: boolean };

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

export function getCachedStockQuotes(
  symbols: string[]
): Record<string, StockQuote> {
  const quotes: Record<string, StockQuote> = {};
  for (const raw of symbols) {
    const symbol = raw.trim().toUpperCase();
    if (!symbol) continue;
    const cached = getCachedQuote(symbol);
    if (cached) quotes[symbol] = cached;
  }
  return quotes;
}

/** Fetch one symbol; respects Alpha Vantage 1 req/sec guidance on free tier. */
export async function fetchStockQuote(
  symbol: string,
  options?: { refresh?: boolean }
): Promise<QuoteFetchResult> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) {
    return { ok: false, error: "Missing ticker.", rateLimited: false };
  }

  if (!isAlphaVantageConfigured()) {
    return {
      ok: false,
      error: "Alpha Vantage API key is not configured.",
      rateLimited: false,
    };
  }

  if (!options?.refresh) {
    const cached = getCachedQuote(normalized);
    if (cached) return { ok: true, quote: cached, fromCache: true };
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY!.trim();
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "GLOBAL_QUOTE");
  url.searchParams.set("symbol", normalized);
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    return {
      ok: false,
      error: "Alpha Vantage request failed.",
      rateLimited: false,
    };
  }

  const data = (await res.json()) as GlobalQuoteResponse;
  const throttleMsg = data.Note ?? data.Information;

  if (throttleMsg) {
    const rateLimited =
      /rate limit|spread out|requests per day|premium/i.test(throttleMsg);
    return {
      ok: false,
      error: rateLimited
        ? "Alpha Vantage rate limit reached. Free tier allows ~25 requests/day and 1 request/second."
        : throttleMsg,
      rateLimited,
    };
  }

  if (!data["Global Quote"]) {
    return {
      ok: false,
      error: `No quote returned for ${normalized}.`,
      rateLimited: false,
    };
  }

  const quote = parseGlobalQuote(data["Global Quote"]);
  if (!quote) {
    return {
      ok: false,
      error: `Could not parse quote for ${normalized}.`,
      rateLimited: false,
    };
  }

  setCachedQuote(quote);
  return { ok: true, quote, fromCache: false };
}
