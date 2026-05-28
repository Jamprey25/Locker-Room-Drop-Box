-- Run in Supabase → SQL Editor if `npm run db:push` cannot connect.
-- Creates the watchlist table from prisma/schema.prisma (WatchlistItem model).

CREATE TABLE IF NOT EXISTS "watchlist_items" (
  "id" TEXT NOT NULL,
  "ticker" TEXT NOT NULL,
  "company_name" TEXT NOT NULL,
  "sector" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "thesis" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'Neutral',
  "priority" TEXT NOT NULL DEFAULT 'Neutral',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "added_by_id" TEXT NOT NULL,
  CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_items_ticker_key"
  ON "watchlist_items"("ticker");

CREATE INDEX IF NOT EXISTS "watchlist_items_sector_idx"
  ON "watchlist_items"("sector");

CREATE INDEX IF NOT EXISTS "watchlist_items_added_by_id_idx"
  ON "watchlist_items"("added_by_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'watchlist_items_added_by_id_fkey'
  ) THEN
    ALTER TABLE "watchlist_items"
      ADD CONSTRAINT "watchlist_items_added_by_id_fkey"
      FOREIGN KEY ("added_by_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
