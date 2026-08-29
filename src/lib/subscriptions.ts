/**
 * Subscription / recurring-payment detection (spec §9). Runs over full history.
 *
 * Algorithm:
 *  1. Group debit transactions by merchant.
 *  2. Require >= 3 occurrences.
 *  3. Median gap between consecutive charges.
 *  4. Cadence: 28-31 monthly, 88-95 quarterly, 360-370 annual, else irregular (skip).
 *  5. Amount stability: all charges within ±5% of median → active; else flag.
 *  6. Write/update subscription; set is_recurring + subscription_id on members.
 *
 * Dismissed subscriptions must not be resurrected (§9).
 */
import { Prisma } from '@prisma/client';
import { prisma } from './db';

const AMOUNT_TOLERANCE = 0.05; // ±5%
const PRICE_INCREASE = 0.05; // > 5% above median → price_changed
const STOPPED_GRACE_DAYS = 15;

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function classifyCadence(intervalDays: number): 'monthly' | 'quarterly' | 'annual' | 'irregular' {
  if (intervalDays >= 28 && intervalDays <= 31) return 'monthly';
  if (intervalDays >= 88 && intervalDays <= 95) return 'quarterly';
  if (intervalDays >= 360 && intervalDays <= 370) return 'annual';
  return 'irregular';
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Truncate a Date to a midnight-UTC date (Prisma @db.Date). */
function toDate(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export interface SubDetectionResult {
  merchantsScanned: number;
  created: number;
  updated: number;
  priceChanged: number;
  stopped: number;
  skippedDismissed: number;
}

export async function detectSubscriptions(userId: number): Promise<SubDetectionResult> {
  const res: SubDetectionResult = { merchantsScanned: 0, created: 0, updated: 0, priceChanged: 0, stopped: 0, skippedDismissed: 0 };

  // Only debits are subscriptions; group by merchant.
  const txns = await prisma.transaction.findMany({
    where: { userId, direction: 'debit' },
    orderBy: { occurredAt: 'asc' },
    select: { id: true, merchant: true, amount: true, occurredAt: true },
  });

  const byMerchant = new Map<string, typeof txns>();
  for (const t of txns) {
    if (!byMerchant.has(t.merchant)) byMerchant.set(t.merchant, []);
    byMerchant.get(t.merchant)!.push(t);
  }

  const now = new Date();

  for (const [merchant, group] of byMerchant) {
    if (group.length < 3) continue; // (2) require >= 3 occurrences
    res.merchantsScanned++;

    // Respect a prior dismissal — never resurrect (§9).
    const existing = await prisma.subscription.findUnique({ where: { userId_merchant: { userId, merchant } } });
    if (existing?.status === 'dismissed') {
      res.skippedDismissed++;
      continue;
    }

    const amounts = group.map((t) => Number(t.amount));
    const medAmount = median(amounts);
    if (medAmount <= 0) continue;

    // (3) median gap
    const gaps: number[] = [];
    for (let i = 1; i < group.length; i++) gaps.push(daysBetween(group[i - 1].occurredAt, group[i].occurredAt));
    const intervalDays = Math.round(median(gaps));

    // (4) cadence
    const cadence = classifyCadence(intervalDays);
    if (cadence === 'irregular') continue; // do not create a subscription

    const firstSeen = group[0].occurredAt;
    const lastCharged = group[group.length - 1].occurredAt;
    const nextExpected = addDays(lastCharged, intervalDays);

    // (5) amount stability & price-increase signal
    const latestAmount = Number(group[group.length - 1].amount);
    const allStable = amounts.every((a) => Math.abs(a - medAmount) <= medAmount * AMOUNT_TOLERANCE);
    const priceUp = latestAmount > medAmount * (1 + PRICE_INCREASE);

    // Stopped: next_expected more than grace days in the past.
    const isStopped = daysBetween(nextExpected, now) > STOPPED_GRACE_DAYS;

    let status: 'active' | 'price_changed' | 'stopped' = 'active';
    if (isStopped) status = 'stopped';
    else if (priceUp || !allStable) status = 'price_changed';

    const data = {
      userId,
      merchant,
      medianAmount: new Prisma.Decimal(medAmount.toFixed(2)),
      intervalDays,
      cadence,
      firstSeen: toDate(firstSeen),
      lastCharged: toDate(lastCharged),
      nextExpected: toDate(nextExpected),
      status,
    };

    const sub = await prisma.subscription.upsert({ where: { userId_merchant: { userId, merchant } }, update: data, create: data });
    if (existing) res.updated++;
    else res.created++;
    if (status === 'price_changed') res.priceChanged++;
    if (status === 'stopped') res.stopped++;

    // (6) tag member transactions.
    await prisma.transaction.updateMany({
      where: { id: { in: group.map((t) => t.id) } },
      data: { isRecurring: true, subscriptionId: sub.id },
    });
  }

  return res;
}

/**
 * Normalized monthly recurring total (§9): annual /12, quarterly /3, plus
 * monthlies. Excludes dismissed and stopped subscriptions.
 */
export async function normalizedMonthlyTotal(userId: number): Promise<number> {
  const active = await prisma.subscription.findMany({ where: { userId, status: { in: ['active', 'price_changed'] } } });
  let total = 0;
  for (const s of active) {
    const amt = Number(s.medianAmount);
    if (s.cadence === 'annual') total += amt / 12;
    else if (s.cadence === 'quarterly') total += amt / 3;
    else total += amt; // monthly
  }
  return Math.round(total * 100) / 100;
}
