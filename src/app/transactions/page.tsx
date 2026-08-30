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

  useEffect(() => {
    load();
  }, [load]);

  // Group by day (API already returns newest-first).
  const groups = useMemo(() => {
    const m = new Map<string, Txn[]>();
    for (const t of items) {
      const k = dayKey(t.occurredAt);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return Array.from(m.entries()).map(([key, list]) => {
      let net = 0;
      for (const t of list) net += (t.direction === 'credit' ? 1 : -1) * Number(t.amount);
      return { key, iso: list[0].occurredAt, list, net };
    });
  }, [items]);

  const pages = Math.max(1, Math.ceil(total / 100));

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3 animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted">{total} shown · newest first</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5 text-sm">
            <button onClick={() => { setPage(1); setFrom(monthStart); setTo(''); }} className={`px-3 py-1 rounded-md ${from === monthStart && !to ? 'bg-surface shadow-sm font-medium' : 'text-muted'}`}>This month</button>
            <button onClick={() => { setPage(1); setFrom(''); setTo(''); }} className={`px-3 py-1 rounded-md ${!from ? 'bg-surface shadow-sm font-medium' : 'text-muted'}`}>All time</button>
          </div>
          <button onClick={() => setAdding(true)} className="btn-primary px-4 py-2">
            <span className="text-base leading-none">+</span> Add
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="card p-3 sm:p-4 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <div className="relative col-span-2 sm:col-span-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input placeholder="Search merchant…" value={merchant} onChange={(e) => { setPage(1); setMerchant(e.target.value); }} className="input pl-9" />
          </div>
          <select value={categoryId} onChange={(e) => { setPage(1); setCategoryId(e.target.value); }} className="input">
            <option value="">All categories</option>
            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <select value={direction} onChange={(e) => { setPage(1); setDirection(e.target.value); }} className="input">
            <option value="">Income &amp; expense</option>
            <option value="debit">Expense only</option>
            <option value="credit">Income only</option>
          </select>
          <input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} className="input" aria-label="From date" />
          <input type="date" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} className="input" aria-label="To date" />
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
                        <div className="mt-1"><CategoryBadge t={t} /></div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-semibold tabular ${t.direction === 'debit' ? 'text-debit' : 'text-credit'}`}>
                          {t.direction === 'debit' ? '−' : '+'}{inr(t.amount)}
                        </div>
                        <button onClick={() => setEditing(editing === t.id ? null : t.id)} className="mt-1 text-xs text-accent">
                          {editing === t.id ? 'Close' : 'Edit'}
                        </button>
                      </div>
                    </div>
                    {editing === t.id && (
                      <div className="mt-3">
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
