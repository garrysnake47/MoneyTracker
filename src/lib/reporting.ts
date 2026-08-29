/**
 * Reporting aggregations (spec §10). All headline spend figures filter on
 * effective is_expense = true (spec §8.1): moving money between your own
 * accounts, paying a credit card bill, or buying an investment is NOT spend.
 *
 * "Effective" is_expense = the subcategory's flag when a subcategory is set
 * (this is how the Fees & charges override works), else the category's flag.
 * Only debits count as spend.
 */
import { prisma } from './db';

export interface CategoryBreakdownItem {
  categoryId: number | null;
  categoryName: string;
  amount: number;
  isExpense: boolean;
}

export interface MonthlyOverview {
  month: string; // YYYY-MM
  totalSpend: number; // is_expense debits only
  totalMoneyIn: number; // all credits
  allMoneyOut: number; // all debits (the "all money movement" view, §8.1)
  prevMonthSpend: number;
  deltaPct: number | null;
  categoryBreakdown: CategoryBreakdownItem[];
  incomeBreakdown: CategoryBreakdownItem[];
  topMerchants: { merchant: string; amount: number }[];
  txnCount: number;
  uncategorizedCount: number;
}

function monthBounds(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end };
}

/** Load a map of categoryId → effective is_expense (subcategory overrides). */
async function expenseFlagMap(): Promise<Map<number, boolean>> {
  const cats = await prisma.category.findMany({ select: { id: true, isExpense: true } });
  return new Map(cats.map((c) => [c.id, c.isExpense]));
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export interface BudgetProgress {
  budgetId: number;
  categoryId: number;
  categoryName: string;
  budget: number;
  spent: number;
}

/** Per-budget spent-vs-cap for a user in a given month (top-level categories). */
export async function getBudgetProgress(userId: number, month: string): Promise<BudgetProgress[]> {
  const budgets = await prisma.budget.findMany({ where: { userId }, include: { category: true } });
  if (budgets.length === 0) return [];

  const { start, end } = monthBounds(month);
  const flags = await expenseFlagMap();
  const txns = await prisma.transaction.findMany({
    where: { userId, direction: 'debit', occurredAt: { gte: start, lt: end } },
    select: { amount: true, categoryId: true, subcategoryId: true },
  });

  const spentByCat = new Map<number, number>();
  for (const t of txns) {
    if (t.categoryId == null) continue;
    const effId = t.subcategoryId ?? t.categoryId;
    if (!(flags.get(effId) ?? true)) continue; // only real expenses
    spentByCat.set(t.categoryId, (spentByCat.get(t.categoryId) ?? 0) + Number(t.amount));
  }

  return budgets
    .map((b) => ({
      budgetId: b.id,
      categoryId: b.categoryId,
      categoryName: b.category.name,
      budget: Number(b.amount),
      spent: Math.round((spentByCat.get(b.categoryId) ?? 0) * 100) / 100,
    }))
    .sort((a, b) => b.budget - a.budget);
}

async function spendForRange(userId: number, start: Date, end: Date, flags: Map<number, boolean>): Promise<number> {
  const txns = await prisma.transaction.findMany({
    where: { userId, direction: 'debit', occurredAt: { gte: start, lt: end } },
    select: { amount: true, categoryId: true, subcategoryId: true },
  });
  let total = 0;
  for (const t of txns) {
    const effId = t.subcategoryId ?? t.categoryId;
    // Uncategorized debits: count as spend (conservative — surfaced for review).
    const isExpense = effId == null ? true : flags.get(effId) ?? true;
    if (isExpense) total += Number(t.amount);
  }
  return total;
}

export interface TrendPoint {
  month: string; // YYYY-MM
  label: string; // e.g. "Aug"
  spend: number; // is_expense debits
  income: number; // credits
}

/**
 * Spend + income per month over the `months` months ending at `endMonth`
 * (inclusive). One query, bucketed in memory.
 */
export async function getTrend(userId: number, endMonth: string, months = 6): Promise<TrendPoint[]> {
  const flags = await expenseFlagMap();
  const [ey, em] = endMonth.split('-').map(Number);
  const end = new Date(ey, em, 1); // exclusive upper bound (first of month after end)
  const start = new Date(ey, em - months, 1);

  const txns = await prisma.transaction.findMany({
    where: { userId, occurredAt: { gte: start, lt: end } },
    select: { amount: true, direction: true, occurredAt: true, categoryId: true, subcategoryId: true },
  });

  // Initialize buckets oldest → newest.
  const buckets = new Map<string, TrendPoint>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(ey, em - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, { month: key, label: d.toLocaleDateString('en-IN', { month: 'short' }), spend: 0, income: 0 });
  }

  for (const t of txns) {
    const key = `${t.occurredAt.getFullYear()}-${String(t.occurredAt.getMonth() + 1).padStart(2, '0')}`;
    const b = buckets.get(key);
    if (!b) continue;
    const amt = Number(t.amount);
    if (t.direction === 'credit') {
      b.income += amt;
    } else {
      const effId = t.subcategoryId ?? t.categoryId;
      const isExpense = effId == null ? true : flags.get(effId) ?? true;
      if (isExpense) b.spend += amt;
    }
  }

  return Array.from(buckets.values()).map((b) => ({ ...b, spend: Math.round(b.spend), income: Math.round(b.income) }));
}

/**
 * Spend + income per week over the last `weeks` weeks, anchored to the end of
 * `endMonth` (or today when endMonth is the current month). Weeks start Monday.
 */
export async function getWeeklyTrend(userId: number, endMonth: string, weeks = 8): Promise<TrendPoint[]> {
  const flags = await expenseFlagMap();
  const now = new Date();
  const [ey, em] = endMonth.split('-').map(Number);
  const isCurrent = endMonth === currentMonth();
  // Anchor = today (current month) or the last day of the selected month.
  const anchor = isCurrent ? now : new Date(ey, em, 0);

  // Monday of the anchor's week.
  const day = (anchor.getDay() + 6) % 7; // 0 = Monday
  const thisMonday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - day);
  const start = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - (weeks - 1) * 7);
  const end = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + 7); // exclusive

  const txns = await prisma.transaction.findMany({
    where: { userId, occurredAt: { gte: start, lt: end } },
    select: { amount: true, direction: true, occurredAt: true, categoryId: true, subcategoryId: true },
  });

  const buckets: TrendPoint[] = [];
  const bucketStart: Date[] = [];
  for (let i = 0; i < weeks; i++) {
    const ws = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * 7);
    bucketStart.push(ws);
    buckets.push({ month: ws.toISOString().slice(0, 10), label: ws.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), spend: 0, income: 0 });
  }

  for (const t of txns) {
    const idx = Math.floor((t.occurredAt.getTime() - start.getTime()) / (7 * 24 * 3600 * 1000));
    if (idx < 0 || idx >= weeks) continue;
    const b = buckets[idx];
    const amt = Number(t.amount);
    if (t.direction === 'credit') {
      b.income += amt;
    } else {
      const effId = t.subcategoryId ?? t.categoryId;
      const isExpense = effId == null ? true : flags.get(effId) ?? true;
      if (isExpense) b.spend += amt;
    }
  }

  return buckets.map((b) => ({ ...b, spend: Math.round(b.spend), income: Math.round(b.income) }));
}

export async function getMonthlyOverview(userId: number, month: string): Promise<MonthlyOverview> {
  const flags = await expenseFlagMap();
  const { start, end } = monthBounds(month);

  const prev = new Date(start);
  prev.setMonth(prev.getMonth() - 1);
  const prevStart = new Date(prev.getFullYear(), prev.getMonth(), 1);
  const prevEnd = start;

  const txns = await prisma.transaction.findMany({
    where: { userId, occurredAt: { gte: start, lt: end } },
    include: { category: true },
  });

  let totalSpend = 0;
  let totalMoneyIn = 0;
  let allMoneyOut = 0;
  let uncategorizedCount = 0;
  const catAgg = new Map<number | null, { name: string; amount: number; isExpense: boolean }>();
  const incomeAgg = new Map<string, number>();
  const merchantAgg = new Map<string, number>();

  for (const t of txns) {
    const amt = Number(t.amount);
    if (t.direction === 'credit') {
      totalMoneyIn += amt;
      // Income breakdown: by category when set, else by label (e.g. "Salary").
      const src = t.category?.name || t.displayLabel || 'Other income';
      incomeAgg.set(src, (incomeAgg.get(src) ?? 0) + amt);
      continue;
    }
    // debit
    allMoneyOut += amt;
    const effId = t.subcategoryId ?? t.categoryId;
    const isExpense = effId == null ? true : flags.get(effId) ?? true;
    if (t.categoryId == null) uncategorizedCount++;

    if (isExpense) {
      totalSpend += amt;
      const key = t.categoryId;
      const name = t.category?.name ?? 'Uncategorized';
      const cur = catAgg.get(key) ?? { name, amount: 0, isExpense };
      cur.amount += amt;
      catAgg.set(key, cur);
      const label = t.displayLabel || t.merchant;
      merchantAgg.set(label, (merchantAgg.get(label) ?? 0) + amt);
    }
  }

  const prevMonthSpend = await spendForRange(userId, prevStart, prevEnd, flags);
  const deltaPct = prevMonthSpend > 0 ? ((totalSpend - prevMonthSpend) / prevMonthSpend) * 100 : null;

  const categoryBreakdown: CategoryBreakdownItem[] = Array.from(catAgg.entries())
    .map(([categoryId, v]) => ({ categoryId, categoryName: v.name, amount: Math.round(v.amount * 100) / 100, isExpense: v.isExpense }))
    .sort((a, b) => b.amount - a.amount);

  const incomeBreakdown: CategoryBreakdownItem[] = Array.from(incomeAgg.entries())
    .map(([name, amount]) => ({ categoryId: null, categoryName: name, amount: Math.round(amount * 100) / 100, isExpense: false }))
    .sort((a, b) => b.amount - a.amount);

  const topMerchants = Array.from(merchantAgg.entries())
    .map(([merchant, amount]) => ({ merchant, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return {
    month,
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalMoneyIn: Math.round(totalMoneyIn * 100) / 100,
    allMoneyOut: Math.round(allMoneyOut * 100) / 100,
    prevMonthSpend: Math.round(prevMonthSpend * 100) / 100,
    deltaPct: deltaPct == null ? null : Math.round(deltaPct * 10) / 10,
    categoryBreakdown,
    incomeBreakdown,
    topMerchants,
    txnCount: txns.length,
    uncategorizedCount,
  };
}
