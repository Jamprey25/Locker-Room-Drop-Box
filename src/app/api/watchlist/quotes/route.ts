import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchStockQuotes } from "@/lib/alpha-vantage";
import { watchlistTickers } from "@/data/watchlist";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh") === "1";

  const { quotes, apiConfigured } = await fetchStockQuotes(watchlistTickers(), {
    refresh,
  });

  return NextResponse.json({
    quotes,
    apiConfigured,
    refreshedAt: new Date().toISOString(),
  });
}
