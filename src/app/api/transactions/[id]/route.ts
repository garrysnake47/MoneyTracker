import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeBackRule } from '@/lib/categorize';
import { requireUser } from '@/lib/session-server';

export const runtime = 'nodejs';

/**
 * Edit a transaction's category (spec §7.5 — two correction modes) or notes.
 *
 * Body:
 *   { mode: 'always', categoryId, subcategoryId?, reapply?: boolean }
 *     → writes a merchant_rule (manual, permanent), sets this txn, and optionally
 *       re-applies to all past transactions with the same merchant.
 *   { mode: 'once', categoryId, subcategoryId? }
 *     → sets category on this txn only and locks it (category_locked = true), so
 *       the categorizer never overwrites the one-off.
 *   { notes: string }  → update notes.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUser(req);
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  const txnId = Number(id);
  if (!Number.isInteger(txnId)) return NextResponse.json({ error: 'bad id' }, { status: 400 });

  const txn = await prisma.transaction.findFirst({ where: { id: txnId, userId } });
  if (!txn) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  // Notes-only update.
  if (typeof body.notes === 'string' && body.mode == null && body.categoryId == null) {
    await prisma.transaction.update({ where: { id: txnId }, data: { notes: body.notes } });
    return NextResponse.json({ ok: true });
  }

  const categoryId = Number(body.categoryId);
  if (!Number.isInteger(categoryId)) return NextResponse.json({ error: 'categoryId required' }, { status: 400 });
  const subcategoryId = body.subcategoryId != null ? Number(body.subcategoryId) : null;
  const mode = body.mode === 'once' ? 'once' : 'always';

  if (mode === 'once') {
    // One-off: set + lock so the categorizer skips it (§7.5).
    await prisma.transaction.update({
      where: { id: txnId },
      data: { categoryId, subcategoryId, categoryLocked: true, categorySource: 'manual' },
    });
    return NextResponse.json({ ok: true, mode: 'once' });
  }

  // Always: write a permanent rule + set this txn.
  await writeBackRule(userId, txn.merchant, categoryId, subcategoryId, 'manual');
  await prisma.transaction.update({
    where: { id: txnId },
    data: { categoryId, subcategoryId, categorySource: 'manual' },
  });

  let reapplied = 0;
  if (body.reapply) {
    // Re-apply to this user's past transactions with the same merchant, except locked.
    const upd = await prisma.transaction.updateMany({
      where: { userId, merchant: txn.merchant, categoryLocked: false, id: { not: txnId } },
      data: { categoryId, subcategoryId, categorySource: 'rule' },
    });
    reapplied = upd.count;
  }

  return NextResponse.json({ ok: true, mode: 'always', reapplied });
}
