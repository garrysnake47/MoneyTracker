/**
 * Parse pass (spec §5): a separate, re-runnable stage over stored raw_emails.
 * A parser bug is fixed by re-running this over raw data — never by re-fetching.
 *
 * Includes §5.3 deduplication: one purchase can generate several messages, so
 * before inserting we look for an existing transaction matching amount +
 * ±3-minute window + direction + (account_last4 when both present).
 */
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { parseEmail } from './parsers';
import { normalizeMerchant } from './merchant';
import type { ParsedTxn } from './parsers/types';

const DEDUPE_WINDOW_MS = 3 * 60 * 1000; // ±3 minutes

export interface ParsePassResult {
  processed: number;
  parsed: number;
  ignored: number;
  unparsed: number;
  merged: number;
  errors: number;
}

/**
 * Find an existing transaction that this parsed txn duplicates (§5.3).
 * Returns it, or null.
 */
async function findDuplicate(userId: number, txn: ParsedTxn) {
  const lo = new Date(txn.occurredAt.getTime() - DEDUPE_WINDOW_MS);
  const hi = new Date(txn.occurredAt.getTime() + DEDUPE_WINDOW_MS);

  const candidates = await prisma.transaction.findMany({
    where: {
      userId,
      amount: new Prisma.Decimal(txn.amount),
      direction: txn.direction,
      occurredAt: { gte: lo, lte: hi },
    },
  });

  for (const c of candidates) {
    // account_last4 must match only when BOTH are non-null.
    if (txn.accountLast4 && c.accountLast4 && txn.accountLast4 !== c.accountLast4) continue;
    return c;
  }
  return null;
}

/** A richer merchant string is simply the longer, more descriptive one. */
function richer(a: string, b: string): string {
  return b.length > a.length ? b : a;
}

/** Run one parse pass over pending raw_emails. `limit` caps a single batch. */
export async function runParsePass(userId: number, limit = 500): Promise<ParsePassResult> {
  const pending = await prisma.rawEmail.findMany({
    where: { userId, parseStatus: 'pending' },
    orderBy: { receivedAt: 'asc' },
    take: limit,
  });

  const res: ParsePassResult = { processed: 0, parsed: 0, ignored: 0, unparsed: 0, merged: 0, errors: 0 };

  for (const email of pending) {
    res.processed++;
    try {
      const result = parseEmail({
        sender: email.sender,
        subject: email.subject,
        bodyText: email.bodyText,
        bodyHtml: email.bodyHtml,
        receivedAt: email.receivedAt,
      });

      if (result.status === 'ignored') {
        await prisma.rawEmail.update({ where: { id: email.id }, data: { parseStatus: 'ignored', parseError: null } });
        res.ignored++;
        continue;
      }
      if (result.status === 'unparsed') {
        await prisma.rawEmail.update({ where: { id: email.id }, data: { parseStatus: 'unparsed', parseError: 'no template matched' } });
        res.unparsed++;
        continue;
      }

      const txn = result.txn;

      // Skip income credits from email — the user enters income manually and the
      // salary is auto-credited on the 1st. This avoids double-counting the
      // salary (which the bank also emails) and self-transfers.
      if (txn.direction === 'credit') {
        await prisma.rawEmail.update({ where: { id: email.id }, data: { parseStatus: 'ignored', parseError: 'credit skipped — income entered manually' } });
        res.ignored++;
        continue;
      }

      const merchant = normalizeMerchant(txn.rawMerchant);

      const dup = await findDuplicate(email.userId, txn);
      if (dup) {
        // Keep existing; prefer the richer merchant. Log the merge (§5.3).
        const bestRaw = richer(dup.rawMerchant, txn.rawMerchant);
        const bestMerchant = normalizeMerchant(bestRaw);
        await prisma.transaction.update({
          where: { id: dup.id },
          data: {
            rawMerchant: bestRaw,
            merchant: bestMerchant,
            referenceId: dup.referenceId ?? txn.referenceId,
            accountLast4: dup.accountLast4 ?? txn.accountLast4,
          },
        });
        await prisma.rawEmail.update({ where: { id: email.id }, data: { parseStatus: 'parsed', parseError: `merged into txn ${dup.id}` } });
        console.log(`[parse] merged raw_email ${email.id} into txn ${dup.id} (${bestMerchant})`);
        res.merged++;
        continue;
      }

      await prisma.transaction.create({
        data: {
          userId: email.userId,
          rawEmailId: email.id,
          source: 'gmail',
          amount: new Prisma.Decimal(txn.amount),
          direction: txn.direction,
          occurredAt: txn.occurredAt,
          rawMerchant: txn.rawMerchant,
          merchant,
          accountLast4: txn.accountLast4,
          instrument: txn.instrument,
          referenceId: txn.referenceId,
          categorySource: 'unassigned',
        },
      });
      await prisma.rawEmail.update({ where: { id: email.id }, data: { parseStatus: 'parsed', parseError: null } });
      res.parsed++;
    } catch (err) {
      res.errors++;
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.rawEmail.update({ where: { id: email.id }, data: { parseStatus: 'unparsed', parseError: `error: ${msg}` } });
      console.error(`[parse] error on raw_email ${email.id}:`, msg);
    }
  }

  return res;
}
