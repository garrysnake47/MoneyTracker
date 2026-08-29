import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizedMonthlyTotal } from '@/lib/subscriptions';
import { requireUser } from '@/lib/session-server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const userId = await requireUser(req);
  if (userId instanceof NextResponse) return userId;

  const [subs, monthly] = await Promise.all([
    prisma.subscription.findMany({ where: { userId }, orderBy: [{ status: 'asc' }, { nextExpected: 'asc' }] }),
    normalizedMonthlyTotal(userId),
  ]);
  return NextResponse.json({
    normalizedMonthlyTotal: monthly,
    subscriptions: subs.map((s) => ({
      id: s.id,
      merchant: s.merchant,
      medianAmount: s.medianAmount.toString(),
      intervalDays: s.intervalDays,
      cadence: s.cadence,
      firstSeen: s.firstSeen.toISOString().slice(0, 10),
      lastCharged: s.lastCharged.toISOString().slice(0, 10),
      nextExpected: s.nextExpected.toISOString().slice(0, 10),
      status: s.status,
    })),
  });
}
