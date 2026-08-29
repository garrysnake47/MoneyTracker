/**
 * Per-user auto-salary credit. When enabled, ensures a single salary credit
 * exists for the current month, dated the configured day. Idempotent.
 */
import { Prisma } from '@prisma/client';
import { prisma } from './db';

export interface UserSalary {
  salaryEnabled: boolean;
  salaryAmount: number | null;
  salaryDay: number;
}

export async function getUserSalary(userId: number): Promise<UserSalary> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  return {
    salaryEnabled: u?.salaryEnabled ?? false,
    salaryAmount: u?.salaryAmount != null ? Number(u.salaryAmount) : null,
    salaryDay: u?.salaryDay ?? 1,
  };
}

export async function saveUserSalary(userId: number, input: { salaryEnabled?: unknown; salaryAmount?: unknown; salaryDay?: unknown }): Promise<void> {
  const data: Record<string, unknown> = {};
  if (typeof input.salaryEnabled === 'boolean') data.salaryEnabled = input.salaryEnabled;
  if (input.salaryAmount != null && input.salaryAmount !== '') {
    const n = Number(input.salaryAmount);
    if (Number.isFinite(n)) data.salaryAmount = new Prisma.Decimal(n.toFixed(2));
  }
  if (input.salaryDay != null && input.salaryDay !== '') {
    const d = Math.min(28, Math.max(1, Math.round(Number(input.salaryDay))));
    if (Number.isFinite(d)) data.salaryDay = d;
  }
  await prisma.user.update({ where: { id: userId }, data });
}

export interface SalaryResult {
  created: boolean;
  reason: string;
  amount?: number;
}

export async function ensureSalaryCredit(userId: number, now = new Date()): Promise<SalaryResult> {
  const cfg = await getUserSalary(userId);
  if (!cfg.salaryEnabled) return { created: false, reason: 'disabled' };
  if (!cfg.salaryAmount || cfg.salaryAmount <= 0) return { created: false, reason: 'no amount set' };

  const day = Math.min(28, Math.max(1, cfg.salaryDay));
  if (now.getDate() < day) return { created: false, reason: `before day ${day}` };

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const existing = await prisma.transaction.findFirst({
    where: { userId, source: 'salary', occurredAt: { gte: monthStart, lt: monthEnd } },
  });
  if (existing) return { created: false, reason: 'already credited this month' };

  const occurredAt = new Date(now.getFullYear(), now.getMonth(), day, 9, 0, 0);
  await prisma.transaction.create({
    data: {
      userId,
      source: 'salary',
      amount: new Prisma.Decimal(cfg.salaryAmount.toFixed(2)),
      direction: 'credit',
      occurredAt,
      rawMerchant: 'SALARY',
      merchant: 'SALARY',
      displayLabel: 'Salary',
      instrument: 'netbanking',
      categorySource: 'manual',
    },
  });
  return { created: true, reason: 'credited', amount: cfg.salaryAmount };
}
