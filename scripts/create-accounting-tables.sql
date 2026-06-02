-- Run in Supabase → SQL Editor if `npm run db:push` cannot connect.

CREATE TABLE IF NOT EXISTS "business_expenses" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "added_by_id" TEXT NOT NULL,
  CONSTRAINT "business_expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "business_expenses_year_month_idx"
  ON "business_expenses"("year", "month");

CREATE INDEX IF NOT EXISTS "business_expenses_added_by_id_idx"
  ON "business_expenses"("added_by_id");

CREATE TABLE IF NOT EXISTS "share_positions" (
  "id" TEXT NOT NULL,
  "ticker" TEXT NOT NULL,
  "company_name" TEXT NOT NULL DEFAULT '',
  "share_count" DECIMAL(14,4) NOT NULL,
  "cost_basis" DECIMAL(14,2) NOT NULL,
  "acquired_year" INTEGER,
  "acquired_month" INTEGER,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "added_by_id" TEXT NOT NULL,
  CONSTRAINT "share_positions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "share_positions_ticker_idx"
  ON "share_positions"("ticker");

CREATE INDEX IF NOT EXISTS "share_positions_added_by_id_idx"
  ON "share_positions"("added_by_id");

CREATE TABLE IF NOT EXISTS "accounting_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "cash_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "other_assets" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total_liabilities" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "accounting_settings_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'business_expenses_added_by_id_fkey'
  ) THEN
    ALTER TABLE "business_expenses"
      ADD CONSTRAINT "business_expenses_added_by_id_fkey"
      FOREIGN KEY ("added_by_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'share_positions_added_by_id_fkey'
  ) THEN
    ALTER TABLE "share_positions"
      ADD CONSTRAINT "share_positions_added_by_id_fkey"
      FOREIGN KEY ("added_by_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "accounting_settings" ("id", "cash_balance", "other_assets", "total_liabilities", "updated_at")
VALUES ('default', 0, 0, 0, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
