"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Calculator, Plus, Trash2, TrendingUp } from "lucide-react";
import {
  addBusinessExpense,
  addSharePosition,
  deleteBusinessExpense,
  deleteSharePosition,
  updateAccountingSettings,
} from "@/app/actions/accounting";
import type { StockQuote } from "@/lib/alpha-vantage";
import {
  computeBalanceSheet,
  EXPENSE_CATEGORIES,
  formatMoney,
  MONTHS,
  monthLabel,
  type AccountingExpenseRow,
  type AccountingSettingsRow,
  type SharePositionRow,
} from "@/lib/accounting";
import { TickerBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/page-header";
import { FieldGroup, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatPerson } from "@/lib/format";

const REQUEST_GAP_MS = 1_200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function BalanceLine({
  label,
  value,
  bold,
  tone,
  sub,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: "up" | "down" | "neutral";
  sub?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-white/[0.04] py-2.5 last:border-0",
        bold && "border-white/[0.08] pt-3"
      )}
    >
      <div>
        <span
          className={cn(
            "text-sm",
            bold ? "font-semibold text-white" : "text-slate-400"
          )}
        >
          {label}
        </span>
        {sub ? <p className="mt-0.5 text-xs text-slate-600">{sub}</p> : null}
      </div>
      <span
        className={cn(
          "shrink-0 text-right text-sm tabular-nums",
          bold ? "text-lg font-semibold text-white" : "text-slate-200",
          tone === "up" && "text-emerald-400",
          tone === "down" && "text-red-400"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function AccountingTab(props: {
  settings: AccountingSettingsRow;
  expenses: AccountingExpenseRow[];
  shares: SharePositionRow[];
  apiConfigured: boolean;
  setupError?: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState<number | "all">(currentMonth);
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showShareForm, setShowShareForm] = useState(false);

  const [settingsForm, setSettingsForm] = useState({
    cashBalance: String(props.settings.cashBalance),
    otherAssets: String(props.settings.otherAssets),
    totalLiabilities: String(props.settings.totalLiabilities),
  });

  const [expenseForm, setExpenseForm] = useState({
    year: currentYear,
    month: currentMonth,
    amount: "",
    category: EXPENSE_CATEGORIES[0] as string,
    description: "",
  });

  const [shareForm, setShareForm] = useState({
    ticker: "",
    companyName: "",
    shareCount: "",
    costBasis: "",
    acquiredYear: currentYear,
    acquiredMonth: currentMonth,
    notes: "",
  });

  const tickers = useMemo(
    () => [...new Set(props.shares.map((s) => s.ticker.toUpperCase()))].sort(),
    [props.shares]
  );
  const tickersKey = tickers.join("|");
  const fetchRunRef = useRef(0);

  const yearOptions = useMemo(() => {
    const years = new Set(props.expenses.map((e) => e.year));
    years.add(currentYear);
    years.add(filterYear);
    return [...years].sort((a, b) => b - a);
  }, [props.expenses, filterYear, currentYear]);

  const periodExpenses = useMemo(() => {
    return props.expenses.filter((e) => {
      if (e.year !== filterYear) return false;
      if (filterMonth === "all") return true;
      return e.month === filterMonth;
    });
  }, [props.expenses, filterYear, filterMonth]);

  const yearExpenseTotal = useMemo(
    () =>
      props.expenses
        .filter((e) => e.year === filterYear)
        .reduce((s, e) => s + e.amount, 0),
    [props.expenses, filterYear]
  );

  const periodExpenseTotal = useMemo(
    () => periodExpenses.reduce((s, e) => s + e.amount, 0),
    [periodExpenses]
  );

  const liveSettings = useMemo(
    (): AccountingSettingsRow => ({
      cashBalance: Number.parseFloat(settingsForm.cashBalance) || 0,
      otherAssets: Number.parseFloat(settingsForm.otherAssets) || 0,
      totalLiabilities: Number.parseFloat(settingsForm.totalLiabilities) || 0,
      updatedAt: props.settings.updatedAt,
    }),
    [settingsForm, props.settings.updatedAt]
  );

  const balanceSheet = useMemo(
    () =>
      computeBalanceSheet({
        settings: liveSettings,
        shares: props.shares,
        quotes,
        periodExpenses: periodExpenseTotal,
        yearExpenses: yearExpenseTotal,
      }),
    [liveSettings, props.shares, quotes, periodExpenseTotal, yearExpenseTotal]
  );

  const loadQuotes = useCallback(async () => {
    if (!props.apiConfigured || tickers.length === 0) return;
    const runId = ++fetchRunRef.current;
    setQuoteError(null);
    setLoadingPrices(true);

    try {
      const cacheRes = await fetch("/api/watchlist/quotes", {
        cache: "no-store",
      });
      if (cacheRes.ok) {
        const cacheData = (await cacheRes.json()) as {
          quotes: Record<string, StockQuote>;
        };
        setQuotes((prev) => ({ ...prev, ...(cacheData.quotes ?? {}) }));
      }

      for (let i = 0; i < tickers.length; i++) {
        if (fetchRunRef.current !== runId) return;
        const symbol = tickers[i];

        const res = await fetch(
          `/api/watchlist/quotes?symbol=${encodeURIComponent(symbol)}`,
          { cache: "no-store" }
        );
        if (!res.ok) break;
        const data = (await res.json()) as { quote: StockQuote | null; error?: string };
        if (data.quote) {
          setQuotes((prev) => ({
            ...prev,
            [data.quote!.symbol.toUpperCase()]: data.quote!,
          }));
        }
        if (i < tickers.length - 1) await sleep(REQUEST_GAP_MS);
      }
    } catch {
      setQuoteError("Could not load share prices.");
    } finally {
      if (fetchRunRef.current === runId) setLoadingPrices(false);
    }
  }, [props.apiConfigured, tickers]);

  useEffect(() => {
    void loadQuotes();
  }, [tickersKey, props.apiConfigured]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await updateAccountingSettings({
        cashBalance: Number.parseFloat(settingsForm.cashBalance) || 0,
        otherAssets: Number.parseFloat(settingsForm.otherAssets) || 0,
        totalLiabilities: Number.parseFloat(settingsForm.totalLiabilities) || 0,
      });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Balance sheet inputs updated.", "success");
      router.refresh();
    });
  }

  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await addBusinessExpense({
        year: expenseForm.year,
        month: expenseForm.month,
        amount: Number.parseFloat(expenseForm.amount),
        category: expenseForm.category,
        description: expenseForm.description || undefined,
      });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      setExpenseForm((f) => ({ ...f, amount: "", description: "" }));
      setShowExpenseForm(false);
      toast("Expense recorded.", "success");
      router.refresh();
    });
  }

  function handleAddShare(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await addSharePosition({
        ticker: shareForm.ticker,
        companyName: shareForm.companyName || undefined,
        shareCount: Number.parseFloat(shareForm.shareCount),
        costBasis: Number.parseFloat(shareForm.costBasis),
        acquiredYear: shareForm.acquiredYear,
        acquiredMonth: shareForm.acquiredMonth,
        notes: shareForm.notes || undefined,
      });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      const addedTicker = shareForm.ticker.toUpperCase();
      setShareForm({
        ticker: "",
        companyName: "",
        shareCount: "",
        costBasis: "",
        acquiredYear: currentYear,
        acquiredMonth: currentMonth,
        notes: "",
      });
      setShowShareForm(false);
      toast(`${addedTicker} position added.`, "success");
      router.refresh();
    });
  }

  if (props.setupError) {
    return (
      <Card>
        <CardContent>
          <CardTitle>Accounting setup required</CardTitle>
          <Alert variant="error" className="mt-4">
            {props.setupError}
          </Alert>
          <p className="mt-4 text-sm text-slate-400">
            Run <code className="text-slate-200">npm run db:push</code> or execute{" "}
            <code className="text-slate-200">scripts/create-accounting-tables.sql</code>{" "}
            in Supabase SQL Editor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Accounting period</CardTitle>
              <p className="mt-1 text-sm text-slate-400">
                Filter expenses by month and year. Balance sheet updates live.
              </p>
            </div>
            <FieldGroup className="sm:max-w-md">
              <Label label="Year">
                <Select
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label label="Month">
                <Select
                  value={filterMonth === "all" ? "all" : filterMonth}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilterMonth(v === "all" ? "all" : Number(v));
                  }}
                >
                  <option value="all">All months ({filterYear})</option>
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Label>
            </FieldGroup>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-sky-500/20 bg-gradient-to-br from-sky-950/20 to-transparent">
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-sky-400" aria-hidden />
              <CardTitle>Balance sheet</CardTitle>
              <span className="ml-auto text-xs text-slate-500">Live</span>
            </div>

            <div className="mb-4 rounded-2xl border border-white/[0.06] bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Assets
              </p>
              <BalanceLine
                label="Cash"
                value={formatMoney(balanceSheet.assets.cash)}
              />
              <BalanceLine
                label="Investments (market)"
                value={formatMoney(balanceSheet.assets.investmentsMarketValue)}
                sub={`Cost basis ${formatMoney(balanceSheet.assets.investmentsCostBasis)}`}
              />
              <BalanceLine
                label="Other assets"
                value={formatMoney(balanceSheet.assets.otherAssets)}
              />
              <BalanceLine
                label="Total assets"
                value={formatMoney(balanceSheet.assets.total)}
                bold
              />
            </div>

            <div className="mb-4 rounded-2xl border border-white/[0.06] bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Liabilities
              </p>
              <BalanceLine
                label="Total liabilities"
                value={formatMoney(balanceSheet.liabilities.total)}
                bold
              />
            </div>

            <BalanceLine
              label="Equity (assets − liabilities)"
              value={formatMoney(balanceSheet.equity)}
              bold
              tone={balanceSheet.equity >= 0 ? "up" : "down"}
            />
            <BalanceLine
              label="Unrealized gain / loss"
              value={formatMoney(balanceSheet.unrealizedGainLoss)}
              tone={
                balanceSheet.unrealizedGainLoss >= 0 ? "up" : "down"
              }
            />
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4">
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  {filterMonth === "all" ? "Year" : "Period"} expenses
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-red-300">
                  {formatMoney(balanceSheet.periodExpenses)}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  {filterYear} total expenses
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-200">
                  {formatMoney(balanceSheet.yearExpenses)}
                </p>
              </div>
            </div>

            {!props.apiConfigured ? (
              <Alert variant="warning" className="mt-4">
                Add ALPHA_VANTAGE_API_KEY for live investment values on the balance sheet.
              </Alert>
            ) : null}
            {loadingPrices ? (
              <p className="mt-2 text-xs text-slate-500">Refreshing share prices…</p>
            ) : null}
            {quoteError ? (
              <Alert variant="error" className="mt-2">
                {quoteError}
              </Alert>
            ) : null}
            {props.apiConfigured && tickers.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => start(() => void loadQuotes())}
                disabled={pending || loadingPrices}
              >
                Refresh share prices
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <CardTitle className="mb-4">Balance sheet inputs</CardTitle>
            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
              <Label label="Cash on hand">
                <Input
                  type="number"
                  step="0.01"
                  value={settingsForm.cashBalance}
                  onChange={(e) =>
                    setSettingsForm((f) => ({ ...f, cashBalance: e.target.value }))
                  }
                />
              </Label>
              <Label label="Other assets">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settingsForm.otherAssets}
                  onChange={(e) =>
                    setSettingsForm((f) => ({ ...f, otherAssets: e.target.value }))
                  }
                />
              </Label>
              <Label label="Total liabilities">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settingsForm.totalLiabilities}
                  onChange={(e) =>
                    setSettingsForm((f) => ({
                      ...f,
                      totalLiabilities: e.target.value,
                    }))
                  }
                />
              </Label>
              <Button type="submit" disabled={pending} className="w-fit">
                {pending ? "Saving…" : "Update balance sheet"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {balanceSheet.shareLineItems.length > 0 ? (
        <Card>
          <CardContent>
            <CardTitle className="mb-4">Share positions</CardTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="pb-2 pr-3">Ticker</th>
                    <th className="pb-2 pr-3">Shares</th>
                    <th className="pb-2 pr-3 text-right">Cost</th>
                    <th className="pb-2 pr-3 text-right">Market</th>
                    <th className="pb-2 text-right">Unrealized</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceSheet.shareLineItems.map((line) => (
                    <tr
                      key={line.id}
                      className="border-b border-white/[0.04] last:border-0"
                    >
                      <td className="py-2.5 pr-3">
                        <TickerBadge type="Stock" className="text-[10px]">
                          {line.ticker}
                        </TickerBadge>
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums text-slate-300">
                        {line.shareCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-slate-300">
                        {formatMoney(line.costBasis)}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-white">
                        {line.marketValue != null
                          ? formatMoney(line.marketValue)
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 text-right tabular-nums font-medium",
                          line.unrealized != null && line.unrealized >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        )}
                      >
                        {line.unrealized != null
                          ? formatMoney(line.unrealized)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Business expenses</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1"
              onClick={() => setShowExpenseForm((s) => !s)}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {showExpenseForm ? (
            <Card>
              <CardContent>
                <form onSubmit={handleAddExpense} className="flex flex-col gap-4">
                  <FieldGroup>
                    <Label label="Year">
                      <Select
                        value={expenseForm.year}
                        onChange={(e) =>
                          setExpenseForm((f) => ({
                            ...f,
                            year: Number(e.target.value),
                          }))
                        }
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </Select>
                    </Label>
                    <Label label="Month">
                      <Select
                        value={expenseForm.month}
                        onChange={(e) =>
                          setExpenseForm((f) => ({
                            ...f,
                            month: Number(e.target.value),
                          }))
                        }
                      >
                        {MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </Select>
                    </Label>
                    <Label label="Amount (USD)">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={expenseForm.amount}
                        onChange={(e) =>
                          setExpenseForm((f) => ({ ...f, amount: e.target.value }))
                        }
                      />
                    </Label>
                    <Label label="Category">
                      <Select
                        value={expenseForm.category}
                        onChange={(e) =>
                          setExpenseForm((f) => ({ ...f, category: e.target.value }))
                        }
                      >
                        {EXPENSE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    </Label>
                    <Label label="Description" optional className="sm:col-span-2">
                      <Textarea
                        rows={2}
                        value={expenseForm.description}
                        onChange={(e) =>
                          setExpenseForm((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                      />
                    </Label>
                  </FieldGroup>
                  <Button type="submit" disabled={pending}>
                    Save expense
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {periodExpenses.length === 0 ? (
            <EmptyState
              icon={Calculator}
              title="No expenses this period"
              description={`Add expenses for ${filterMonth === "all" ? filterYear : `${monthLabel(filterMonth as number)} ${filterYear}`}.`}
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {periodExpenses.map((exp) => (
                <li
                  key={exp.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white">{exp.category}</p>
                    <p className="text-xs text-slate-500">
                      {monthLabel(exp.month)} {exp.year} ·{" "}
                      {formatPerson(exp.addedBy)}
                    </p>
                    {exp.description ? (
                      <p className="mt-1 text-sm text-slate-400">{exp.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-sm font-semibold tabular-nums text-red-300">
                      {formatMoney(exp.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        start(async () => {
                          if (!window.confirm("Delete this expense?")) return;
                          const res = await deleteBusinessExpense({ id: exp.id });
                          if (!res.ok) {
                            toast(res.error, "error");
                            return;
                          }
                          toast("Expense removed.", "success");
                          router.refresh();
                        })
                      }
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
                      aria-label="Delete expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Our shares</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1"
              onClick={() => setShowShareForm((s) => !s)}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {showShareForm ? (
            <Card>
              <CardContent>
                <form onSubmit={handleAddShare} className="flex flex-col gap-4">
                  <FieldGroup>
                    <Label label="Ticker">
                      <Input
                        required
                        maxLength={12}
                        value={shareForm.ticker}
                        onChange={(e) =>
                          setShareForm((f) => ({
                            ...f,
                            ticker: e.target.value.toUpperCase(),
                          }))
                        }
                        className="font-mono uppercase"
                        placeholder="AAPL"
                      />
                    </Label>
                    <Label label="Company" optional>
                      <Input
                        value={shareForm.companyName}
                        onChange={(e) =>
                          setShareForm((f) => ({ ...f, companyName: e.target.value }))
                        }
                      />
                    </Label>
                    <Label label="Share count">
                      <Input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        required
                        value={shareForm.shareCount}
                        onChange={(e) =>
                          setShareForm((f) => ({ ...f, shareCount: e.target.value }))
                        }
                      />
                    </Label>
                    <Label label="Total cost basis (USD)">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={shareForm.costBasis}
                        onChange={(e) =>
                          setShareForm((f) => ({ ...f, costBasis: e.target.value }))
                        }
                      />
                    </Label>
                    <Label label="Acquired year">
                      <Select
                        value={shareForm.acquiredYear}
                        onChange={(e) =>
                          setShareForm((f) => ({
                            ...f,
                            acquiredYear: Number(e.target.value),
                          }))
                        }
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </Select>
                    </Label>
                    <Label label="Acquired month">
                      <Select
                        value={shareForm.acquiredMonth}
                        onChange={(e) =>
                          setShareForm((f) => ({
                            ...f,
                            acquiredMonth: Number(e.target.value),
                          }))
                        }
                      >
                        {MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </Select>
                    </Label>
                    <Label label="Notes" optional className="sm:col-span-2">
                      <Textarea
                        rows={2}
                        value={shareForm.notes}
                        onChange={(e) =>
                          setShareForm((f) => ({ ...f, notes: e.target.value }))
                        }
                      />
                    </Label>
                  </FieldGroup>
                  <Button type="submit" disabled={pending}>
                    Save position
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {props.shares.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No share positions"
              description="Track owned shares and cost basis—they feed the balance sheet at market value."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {props.shares.map((share) => {
                const line = balanceSheet.shareLineItems.find(
                  (l) => l.id === share.id
                );
                return (
                  <li
                    key={share.id}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <TickerBadge type="Stock">{share.ticker}</TickerBadge>
                          {share.companyName ? (
                            <span className="text-sm text-slate-300">
                              {share.companyName}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm tabular-nums text-slate-400">
                          {share.shareCount.toLocaleString()} shares · cost{" "}
                          {formatMoney(share.costBasis)}
                          {share.acquiredMonth && share.acquiredYear
                            ? ` · ${monthLabel(share.acquiredMonth)} ${share.acquiredYear}`
                            : null}
                        </p>
                        {line?.marketValue != null ? (
                          <p className="mt-1 text-sm font-medium text-white">
                            Market {formatMoney(line.marketValue)}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          start(async () => {
                            if (
                              !window.confirm(
                                `Remove ${share.ticker} position?`
                              )
                            )
                              return;
                            const res = await deleteSharePosition({
                              id: share.id,
                            });
                            if (!res.ok) {
                              toast(res.error, "error");
                              return;
                            }
                            toast("Position removed.", "success");
                            router.refresh();
                          })
                        }
                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
                        aria-label="Delete position"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
