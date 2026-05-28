import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  fetchStockQuote,
  getCachedStockQuotes,
  isAlphaVantageConfigured,
} from "@/lib/alpha-vantage";
import { loadWatchlistTickers } from "@/lib/watchlist-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim().toUpperCase();
  const refresh = searchParams.get("refresh") === "1";
  const apiConfigured = isAlphaVantageConfigured();

  if (symbol) {
    const result = await fetchStockQuote(symbol, { refresh });
    if (!result.ok) {
      return NextResponse.json({
        symbol,
        quote: null,
        apiConfigured,
        error: result.error,
        rateLimited: result.rateLimited,
      });
    }

    return NextResponse.json({
      symbol,
      quote: result.quote,
      apiConfigured,
      fromCache: result.fromCache,
      refreshedAt: new Date().toISOString(),
    });
  }

  const tickers = await loadWatchlistTickers();

  return NextResponse.json({
    quotes: getCachedStockQuotes(tickers),
    apiConfigured,
    refreshedAt: new Date().toISOString(),
  });
}
