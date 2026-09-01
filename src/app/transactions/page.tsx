'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { inr } from '@/lib/format';
import { useCategories } from '@/lib/useCategories';
import CategoryEditor from '@/components/CategoryEditor';
import AddTransaction from '@/components/AddTransaction';

interface Txn {
  id: number;
  occurredAt: string;
  amount: string;
  direction: 'debit' | 'credit';
  merchant: string;
  label: string;
  rawMerchant: string;
  instrument: string;
  accountLast4: string | null;
  categoryId: number | null;
  categoryName: string | null;
  subcategoryId: number | null;
  subcategoryName: string | null;
  categorySource: string;
  categoryLocked: boolean;
  llmConfidence: number | null;
  isRecurring: boolean;
  isCreditCard: boolean;
}

interface DeletedTxn {
  id: number;
  occurredAt: string;
  amount: string;
  direction: 'debit' | 'credit';
  merchant: string;
  label: string;
  instrument: string;
  accountLast4: string | null;
  deletedAt: string;
}

// All formatting is pinned to IST so grouping and headings never disagree
// (bank times are IST; the server/browser timezone must not split a day).
const IST = 'Asia/Kolkata';
function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: IST }); // YYYY-MM-DD
}
function dayHeading(iso: string): string {
  const key = dayKey(iso);
  const now = new Date();
  const todayKey = now.toLocaleDateString('en-CA', { timeZone: IST });
  const yKey = new Date(now.getTime() - 86400000).toLocaleDateString('en-CA', { timeZone: IST });
  const base = new Date(iso).toLocaleDateString('en-IN', { timeZone: IST, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  if (key === todayKey) return `Today · ${base}`;
  if (key === yKey) return `Yesterday · ${base}`;
  return base;
}
function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit' });
}

export default function TransactionsPage() {
  const categories = useCategories();
  const [items, setItems] = useState<Txn[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  // Deleted transactions live behind their own toggle on this page: they are
  // tombstoned (never re-imported by a sync) until restored.
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleted, setDeleted] = useState<DeletedTxn[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  // A failed delete/restore used to do nothing at all — always say why.
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletedError, setDeletedError] = useState<string | null>(null);

  // Default to the current month (a new month starts fresh); "All time" clears it.
  const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

  // filters
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [direction, setDirection] = useState('');
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: '100' });
    if (merchant) p.set('merchant', merchant);
    if (categoryId) p.set('categoryId', categoryId);
    if (direction) p.set('direction', direction);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    const res = await fetch(`/api/transactions?${p}`);
    const data = await res.json();
    setItems(data.items);
    setTotal(data.total);
    setLoading(false);
  }, [page, merchant, categoryId, direction, from, to]);

  const loadDeleted = useCallback(async () => {
    setDeletedLoading(true);
    try {
      const res = await fetch('/api/transactions/deleted');
      // A 5xx returns an HTML error page — parsing it as JSON throws, and
      // without the finally below the panel would sit on "Loading…" forever.
      if (!res.ok) {
        const msg = await res
          .json()
          .then((d) => d.error as string | undefined)
          .catch(() => null);
        setDeletedError(msg || `Couldn't load deleted transactions (${res.status})`);
        setDeleted([]);
        return;
      }
      const data = await res.json();
      setDeleted(data.items ?? []);
      setDeletedError(null);
    } catch {
      setDeletedError("Couldn't reach the server.");
      setDeleted([]);
    } finally {
      setDeletedLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadDeleted();
  }, [loadDeleted]);

  /** Read the server's error message; a 5xx returns HTML, so don't let JSON parsing throw. */
  async function errorFrom(res: Response, fallback: string) {
    const msg = await res
      .json()
      .then((d) => d.error as string | undefined)
      .catch(() => null);
    return msg || `${fallback} (${res.status})`;
  }

  async function remove(t: Txn) {
    if (!confirm(`Delete "${t.label}" (${inr(t.amount)})?\n\nIt won't come back on the next sync. You can restore it from "Deleted transactions".`)) return;
    setActionError(null);
    const res = await fetch(`/api/transactions/${t.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setActionError(await errorFrom(res, 'Delete failed'));
      return;
    }
    if (editing === t.id) setEditing(null);
    await Promise.all([load(), loadDeleted()]);
  }

  async function restore(d: DeletedTxn) {
    setActionError(null);
    const res = await fetch(`/api/transactions/deleted/${d.id}`, { method: 'POST' });
    if (!res.ok) {
      setActionError(await errorFrom(res, 'Restore failed'));
      return;
    }
    await Promise.all([load(), loadDeleted()]);
  }

  async function forget(d: DeletedTxn) {
    if (!confirm(`Forget "${d.label}" permanently?\n\nThe tombstone is removed, so a future sync may import it again.`)) return;
    setActionError(null);
    const res = await fetch(`/api/transactions/deleted/${d.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setActionError(await errorFrom(res, 'Could not forget'));
      return;
    }
    await loadDeleted();
  }

  async function setCreditCard(t: Txn, isCreditCard: boolean) {
    // Optimistic — the row's totals recompute immediately.
    setItems((prev) => prev.map((x) => (x.id === t.id ? { ...x, isCreditCard } : x)));
    const res = await fetch(`/api/transactions/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCreditCard }),
    });
    if (!res.ok) await load(); // roll back to server truth
  }

  // Group by day (API already returns newest-first).
  const groups = useMemo(() => {
    const m = new Map<string, Txn[]>();
    for (const t of items) {
      const k = dayKey(t.occurredAt);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return Array.from(m.entries()).map(([key, list]) => {
      // Card charges don't move the account balance — the bill payment does.
      let net = 0;
      for (const t of list) {
        if (t.isCreditCard) continue;
        net += (t.direction === 'credit' ? 1 : -1) * Number(t.amount);
      }
      return { key, iso: list[0].occurredAt, list, net };
    });
  }, [items]);

  const pages = Math.max(1, Math.ceil(total / 100));

  return (
    <div className="space-y-4">
      <header className="animate-fade-up flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted">{total} shown · newest first</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Segmented range switch — splits the row evenly on phones. */}
          <div className="inline-flex flex-1 rounded-full border border-border bg-surface-2 p-0.5 text-sm sm:flex-none">
            <button onClick={() => { setPage(1); setFrom(monthStart); setTo(''); }} className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 sm:flex-none ${from === monthStart && !to ? 'bg-surface shadow-sm font-medium' : 'text-muted'}`}>This month</button>
            <button onClick={() => { setPage(1); setFrom(''); setTo(''); }} className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 sm:flex-none ${!from ? 'bg-surface shadow-sm font-medium' : 'text-muted'}`}>All time</button>
          </div>
          <button
            onClick={() => {
              setShowDeleted(true);
              loadDeleted();
              // Jump to the section rather than making them scroll the whole list.
              // Two frames: the panel has to render before it can be scrolled to.
              requestAnimationFrame(() =>
                requestAnimationFrame(() =>
                  document.getElementById('deleted')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                ),
              );
            }}
            className="btn-outline shrink-0 gap-1.5 whitespace-nowrap px-3 py-2"
            title="Transactions you've deleted — restore them from here"
          >
            Deleted
            {deleted.length > 0 && (
              <span className="rounded-full bg-surface-2 px-1.5 text-xs font-bold text-muted">{deleted.length}</span>
            )}
          </button>
          <button onClick={() => setAdding(true)} className="btn-primary shrink-0 px-4 py-2">
            <span className="text-base leading-none">+</span> Add
          </button>
        </div>
      </header>

      {actionError && (
        <div className="rounded-2xl bg-blush px-4 py-3 text-sm font-medium text-[rgb(var(--debit))]">
          {actionError}
        </div>
      )}

      {/* Filters */}
      <div className="card p-3 sm:p-4 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <div className="relative sm:col-span-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input placeholder="Search merchant…" value={merchant} onChange={(e) => { setPage(1); setMerchant(e.target.value); }} className="input pl-9" />
          </div>
          <select value={categoryId} onChange={(e) => { setPage(1); setCategoryId(e.target.value); }} className="select">
            <option value="">All categories</option>
            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <select value={direction} onChange={(e) => { setPage(1); setDirection(e.target.value); }} className="select">
            <option value="">Income &amp; expense</option>
            <option value="debit">Expense only</option>
            <option value="credit">Income only</option>
          </select>
          <div className="grid grid-cols-2 gap-2.5 sm:contents">
            <input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} className="input" aria-label="From date" />
            <input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} className="input" aria-label="To date" />
          </div>
        </div>
        {(merchant || categoryId || direction || from || to) && (
          <button
            onClick={() => { setPage(1); setMerchant(''); setCategoryId(''); setDirection(''); setFrom(''); setTo(''); }}
            className="mt-2.5 text-xs text-accent hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-muted py-8 text-center">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="text-muted py-8 text-center">No transactions match.</div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.key}>
              {/* Day header with running net */}
              <div className="flex items-center justify-between px-1 mb-2">
                <div className="text-xs font-semibold text-muted uppercase tracking-wide">{dayHeading(g.iso)}</div>
                <div className={`text-xs font-semibold tabular ${g.net >= 0 ? 'text-credit' : 'text-debit'}`}>
                  {g.net >= 0 ? '+' : '−'}{inr(Math.abs(g.net))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface shadow-card divide-y divide-border overflow-hidden">
                {g.list.map((t) => (
                  <div key={t.id} className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{t.label}</div>
                        <div className="text-xs text-muted mt-0.5">
                          {timeOf(t.occurredAt)} · {t.instrument}
                          {t.accountLast4 ? ` ··${t.accountLast4}` : ''}
                          {t.isRecurring ? ' · 🔁' : ''}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <CategoryBadge t={t} />
                          {t.isCreditCard && (
                            <span className="rounded-full bg-sky px-2.5 py-0.5 text-xs font-semibold text-[rgb(var(--peri-2))]">Credit card</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-semibold tabular ${t.direction === 'debit' ? 'text-debit' : 'text-credit'}`}>
                          {t.direction === 'debit' ? '−' : '+'}{inr(t.amount)}
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-2">
                          <button onClick={() => setEditing(editing === t.id ? null : t.id)} className="text-xs font-semibold text-accent">
                            {editing === t.id ? 'Close' : 'Edit'}
                          </button>
                          <button onClick={() => remove(t)} className="text-xs font-semibold text-debit hover:underline">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    {editing === t.id && (
                      <div className="mt-3 space-y-3">
                        <label className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2.5 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={t.isCreditCard}
                            onChange={(e) => setCreditCard(t, e.target.checked)}
                          />
                          <span>
                            Charged to a credit card
                            <span className="block text-xs text-muted">Counts as spend, but isn’t deducted from your account balance.</span>
                          </span>
                        </label>
                        <CategoryEditor
                          txnId={t.id}
                          merchant={t.merchant}
                          currentCategoryId={t.categoryId}
                          currentSubcategoryId={t.subcategoryId}
                          onDone={() => { setEditing(null); load(); }}
                          onCancel={() => setEditing(null)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40">← Prev</button>
          <span className="text-sm text-muted">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40">Next →</button>
        </div>
      )}

      {/* ── Deleted ─────────────────────────────────────────────────────── */}
      <section id="deleted" className="scroll-mt-20 pt-2">
        <button
          onClick={() => setShowDeleted((v) => !v)}
          className="flex w-full items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-surface-2"
        >
          <span className={`text-muted transition-transform duration-200 ${showDeleted ? 'rotate-90' : ''}`}>›</span>
          Deleted transactions
          {deleted.length > 0 && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-muted">{deleted.length}</span>
          )}
          <span className="ml-auto text-xs font-normal text-muted">
            {showDeleted ? 'Hide' : 'Show'}
          </span>
        </button>

        {showDeleted && (
          <div className="mt-2.5 space-y-2.5">
            <p className="px-1 text-xs text-muted">
              These stay out of your totals and are never re-imported by a sync. Restore one to bring it back.
            </p>

            {deletedLoading ? (
              <div className="py-6 text-center text-sm text-muted">Loading…</div>
            ) : deletedError ? (
              <div className="rounded-2xl bg-blush px-4 py-3 text-sm font-medium text-[rgb(var(--debit))]">
                {deletedError}
                <button onClick={loadDeleted} className="ml-2 underline">Retry</button>
              </div>
            ) : deleted.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted">
                Nothing deleted yet.
              </div>
            ) : (
              deleted.map((d) => (
                <div key={d.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-muted line-through">{d.label}</span>
                      <span className="shrink-0 text-sm font-bold tabular text-muted line-through">
                        {d.direction === 'debit' ? '−' : '+'}{inr(d.amount)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {dayHeading(d.occurredAt)} · {timeOf(d.occurredAt)}
                      {d.instrument !== 'unknown' ? ` · ${d.instrument}` : ''}
                      {d.accountLast4 ? ` · ••${d.accountLast4}` : ''}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted/70">
                      Deleted {dayHeading(d.deletedAt)}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => restore(d)} className="btn-outline px-3 py-1.5 text-xs">Restore</button>
                    <button onClick={() => forget(d)} className="btn-ghost px-3 py-1.5 text-xs">Forget</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {adding && <AddTransaction onAdded={load} onClose={() => setAdding(false)} />}
    </div>
  );
}

function CategoryBadge({ t }: { t: Txn }) {
  if (!t.categoryId) {
    return <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">Uncategorized</span>;
  }
  return (
    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
      {t.categoryName}
      {t.subcategoryName ? ` › ${t.subcategoryName}` : ''}
      {t.categoryLocked ? ' 🔒' : ''}
    </span>
  );
}
