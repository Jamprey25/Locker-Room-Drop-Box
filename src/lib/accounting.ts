import type { Prisma } from "@prisma/client";
import type { StockQuote } from "@/lib/alpha-vantage";

export const EXPENSE_CATEGORIES = [
  "Software & tools",
  "Travel",
  "Legal & compliance",
  "Marketing",
  "Office & admin",
  "Research & data",
  "Other",
] as const;

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

export function decimalToNumber(
  value: Prisma.Decimal | number | string | null | undefined
): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value) || 0;
  return value.toNumber();
}

export type AccountingExpenseRow = {
  id: string;
  year: number;
  month: number;
  amount: number;
  category: string;
  description: string;
  createdAt: Date;
  addedBy: { id: string; name: string | null; email: string };
};

export type SharePositionRow = {
  id: string;
  ticker: string;
  companyName: string;
  shareCount: number;
  costBasis: number;
  acquiredYear: number | null;
  acquiredMonth: number | null;
  notes: string | null;
  createdAt: Date;
  addedBy: { id: string; name: string | null; email: string };
};

export type AccountingSettingsRow = {
  cashBalance: number;
  otherAssets: number;
  totalLiabilities: number;
  updatedAt: Date;
};

export type BalanceSheet = {
  assets: {
    cash: number;
    investmentsCostBasis: number;
    investmentsMarketValue: number;
    otherAssets: number;
    total: number;
  };
  liabilities: { total: number };
  equity: number;
  unrealizedGainLoss: number;
  periodExpenses: number;
  yearExpenses: number;
  shareLineItems: {
    id: string;
    ticker: string;
    companyName: string;
    shareCount: number;
    costBasis: number;
    marketValue: number | null;
    unrealized: number | null;
  }[];
};

export function computeBalanceSheet(input: {
  settings: AccountingSettingsRow;
  shares: SharePositionRow[];
  quotes: Record<string, StockQuote>;
  periodExpenses: number;
  yearExpenses: number;
}): BalanceSheet {
  const shareLineItems = input.shares.map((s) => {
    const quote = input.quotes[s.ticker.toUpperCase()];
    const marketValue = quote ? quote.price * s.shareCount : null;
    const unrealized =
      marketValue != null ? marketValue - s.costBasis : null;
    return {
      id: s.id,
      ticker: s.ticker,
      companyName: s.companyName,
      shareCount: s.shareCount,
      costBasis: s.costBasis,
      marketValue,
      unrealized,
    };
  });

  const investmentsCostBasis = shareLineItems.reduce(
    (sum, s) => sum + s.costBasis,
    0
  );
  const investmentsMarketValue = shareLineItems.reduce(
    (sum, s) => sum + (s.marketValue ?? s.costBasis),
    0
  );
  const unrealizedGainLoss = investmentsMarketValue - investmentsCostBasis;

  const cash = input.settings.cashBalance;
  const otherAssets = input.settings.otherAssets;
  const totalAssets = cash + investmentsMarketValue + otherAssets;
  const liabilities = input.settings.totalLiabilities;
  const equity = totalAssets - liabilities;

  return {
    assets: {
      cash,
      investmentsCostBasis,
      investmentsMarketValue,
      otherAssets,
      total: totalAssets,
    },
    liabilities: { total: liabilities },
    equity,
    unrealizedGainLoss,
    periodExpenses: input.periodExpenses,
    yearExpenses: input.yearExpenses,
    shareLineItems,
  };
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function monthLabel(month: number) {
  return MONTHS.find((m) => m.value === month)?.label ?? `Month ${month}`;
}
