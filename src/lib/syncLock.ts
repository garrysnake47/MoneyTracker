/**
 * Per-user pipeline lock.
 *
 * Sync can be triggered from four places at once — the Sync button, AutoSync on
 * page load, the Settings page, and the 2am cron — and serverless means they run
 * in separate processes with no shared memory. Two overlapping parse passes read
 * the same `pending` emails and each insert a transaction for them, which is how
 * a single click ends up doubling the ledger.
 *
 * The lock is a row in sync_state claimed with a conditional UPDATE (atomic in
 * Postgres). A lock older than LOCK_TTL_MS is treated as abandoned — a serverless
 * invocation that was killed mid-run must not wedge sync forever.
 */
import { prisma } from './db';

const LOCK_TTL_MS = 5 * 60 * 1000; // > the 60s function ceiling, with headroom

export class SyncBusyError extends Error {
  constructor() {
    super('A sync is already running for this account — try again in a moment.');
    this.name = 'SyncBusyError';
  }
}

async function acquire(userId: number): Promise<boolean> {
  const stale = new Date(Date.now() - LOCK_TTL_MS);

  // Ensure the row exists so the conditional update below has something to hit.
  await prisma.syncState.upsert({ where: { userId }, update: {}, create: { userId } });

  const claimed = await prisma.syncState.updateMany({
    where: { userId, OR: [{ syncingSince: null }, { syncingSince: { lt: stale } }] },
    data: { syncingSince: new Date() },
  });
  return claimed.count === 1;
}

async function release(userId: number): Promise<void> {
  await prisma.syncState.updateMany({ where: { userId }, data: { syncingSince: null } });
}

/** Run `fn` holding this user's pipeline lock. Throws SyncBusyError if held. */
export async function withSyncLock<T>(userId: number, fn: () => Promise<T>): Promise<T> {
  if (!(await acquire(userId))) throw new SyncBusyError();
  try {
    return await fn();
  } finally {
    await release(userId);
  }
}
