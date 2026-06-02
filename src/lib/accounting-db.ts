import { prisma } from "@/lib/prisma";
import {
  decimalToNumber,
  type AccountingExpenseRow,
  type AccountingSettingsRow,
  type SharePositionRow,
} from "@/lib/accounting";

const userSelect = { id: true, name: true, email: true } as const;

function mapExpense(row: {
  id: string;
  year: number;
  month: number;
  amount: Parameters<typeof decimalToNumber>[0];
  category: string;
  description: string;
  createdAt: Date;
  addedBy: { id: string; name: string | null; email: string };
}): AccountingExpenseRow {
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    amount: decimalToNumber(row.amount),
    category: row.category,
    description: row.description,
    createdAt: row.createdAt,
    addedBy: row.addedBy,
  };
}

function mapShare(row: {
  id: string;
  ticker: string;
  companyName: string;
  shareCount: Parameters<typeof decimalToNumber>[0];
  costBasis: Parameters<typeof decimalToNumber>[0];
  acquiredYear: number | null;
  acquiredMonth: number | null;
  notes: string | null;
  createdAt: Date;
  addedBy: { id: string; name: string | null; email: string };
}): SharePositionRow {
  return {
    id: row.id,
    ticker: row.ticker.toUpperCase(),
    companyName: row.companyName,
    shareCount: decimalToNumber(row.shareCount),
    costBasis: decimalToNumber(row.costBasis),
    acquiredYear: row.acquiredYear,
    acquiredMonth: row.acquiredMonth,
    notes: row.notes,
    createdAt: row.createdAt,
    addedBy: row.addedBy,
  };
}

export async function ensureAccountingSettings(): Promise<AccountingSettingsRow> {
  const row = await prisma.accountingSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
  return {
    cashBalance: decimalToNumber(row.cashBalance),
    otherAssets: decimalToNumber(row.otherAssets),
    totalLiabilities: decimalToNumber(row.totalLiabilities),
    updatedAt: row.updatedAt,
  };
}

export async function loadAccountingData() {
  const [settings, expenses, shares] = await Promise.all([
    ensureAccountingSettings(),
    prisma.businessExpense.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
      include: { addedBy: { select: userSelect } },
    }),
    prisma.sharePosition.findMany({
      orderBy: [{ ticker: "asc" }, { createdAt: "desc" }],
      include: { addedBy: { select: userSelect } },
    }),
  ]);

  return {
    settings,
    expenses: expenses.map(mapExpense),
    shares: shares.map(mapShare),
  };
}

export async function sumExpensesForPeriod(year: number, month?: number) {
  const rows = await prisma.businessExpense.findMany({
    where: month != null ? { year, month } : { year },
    select: { amount: true },
  });
  return rows.reduce((sum, r) => sum + decimalToNumber(r.amount), 0);
}
