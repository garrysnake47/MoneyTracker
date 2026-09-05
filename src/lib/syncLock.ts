/**
 * Per-user pipeline lock.
 *
 * Sync can be triggered from four places at once — the Sync button, AutoSync on
 * page load, the Settings page, and the 2am cron — and serverless means they run
 * in separate processes with no shared memory. Two overlapping parse passes read
 * the same `pending` emails and each insert a transaction for them, which is how
 * a single click ends up doubling the ledger.
 *
 * Two gates:
 *   1. an in-process set, which covers a single server instance (dev, or one
 *      warm serverless container) with no database round-trip;
 *   2. a row in sync_state claimed with a conditional UPDATE (atomic in
 *      Postgres), which covers separate instances.
 *
 * A database lock older than LOCK_TTL_MS is treated as abandoned — a serverless
 * invocation that was killed mid-run must not wedge sync forever.
 */
import { prisma } from './db';

const LOCK_TTL_MS = 5 * 60 * 1000; // > the 60s function ceiling, with headroom

/** Prisma codes for "the schema isn't migrated yet". */
const SCHEMA_MISSING = new Set(['P2021', 'P2022']);

let warnedAboutSchema = false;

export class SyncBusyError extends Error {
  constructor() {
    super('A sync is already running for this account — try again in a moment.');
    this.name = 'SyncBusyError';
  }
}

// In-process gate: same instance, overlapping requests.
const local = new Set<number>();

function isSchemaMissing(err: unknown): boolean {
  return SCHEMA_MISSING.has((err as { code?: string })?.code ?? '');
}

/**
 * A database that predates the `syncing_since` column must not have sync break
 * on it: warn once and run unlocked. The in-process gate still applies, and
 * dedupeTransactions cleans up anything that slips through.
 */
function warnSchema(): void {
  if (warnedAboutSchema) return;
  warnedAboutSchema = true;
  console.warn(
    '[syncLock] sync_state.syncing_since is missing — running without the cross-instance lock. ' +
      'Run `npx prisma db push` against this database to enable it.'
  );
}

async function acquireDb(userId: number): Promise<boolean> {
  try {
    const stale = new Date(Date.now() - LOCK_TTL_MS);

    // Ensure the row exists so the conditional update below has something to hit.
    await prisma.syncState.upsert({ where: { userId }, update: {}, create: { userId } });

    const claimed = await prisma.syncState.updateMany({
      where: { userId, OR: [{ syncingSince: null }, { syncingSince: { lt: stale } }] },
      data: { syncingSince: new Date() },
    });
    return claimed.count === 1;
  } catch (err) {
    if (!isSchemaMissing(err)) throw err;
    warnSchema();
    return true; // degrade to the in-process gate rather than failing the sync
  }
}

async function releaseDb(userId: number): Promise<void> {
  try {
    await prisma.syncState.updateMany({ where: { userId }, data: { syncingSince: null } });
  } catch (err) {
    if (!isSchemaMissing(err)) throw err;
  }
}

/** Run `fn` holding this user's pipeline lock. Throws SyncBusyError if held. */
export async function withSyncLock<T>(userId: number, fn: () => Promise<T>): Promise<T> {
  if (local.has(userId)) throw new SyncBusyError();
  local.add(userId);

  let heldDb = false;
  try {
    heldDb = await acquireDb(userId);
    if (!heldDb) throw new SyncBusyError();
    return await fn();
  } finally {
    local.delete(userId);
    if (heldDb) await releaseDb(userId);
  }
}
