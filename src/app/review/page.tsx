'use client';

import { useCallback, useEffect, useState } from 'react';
import { inr, fmtDateTime } from '@/lib/format';
import { PALETTE } from '@/lib/palette';
import { useCategories } from '@/lib/useCategories';
import CategoryEditor from '@/components/CategoryEditor';

interface Txn {
  id: number;
  occurredAt: string;
  amount: string;
  direction: 'debit' | 'credit';
  merchant: string;
  label: string;
  rawMerchant: string;
  instrument: string;
  llmConfidence: number | null;
}



export default function ReviewPage() {
  const categories = useCategories();
  const [queue, setQueue] = useState<Txn[]>([]);
  const [idx, setIdx] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [pendingCat, setPendingCat] = useState<number | null>(null); // category id whose subs are being shown
  const [flash, setFlash] = useState<string | null>(null);
  // Which side of the taxonomy the picker is showing. Follows the transaction's
  // direction by default — a credit is almost always income.
  const [side, setSide] = useState<'expense' | 'income'>('expense');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/transactions?reviewQueue=1&pageSize=100');
    const data = await res.json();
    setQueue(data.items);
    setTotal(data.items.length);
    setIdx(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = queue[idx];

  // Follow the current transaction's direction when it changes.
  useEffect(() => {
    if (current) setSide(current.direction === 'credit' ? 'income' : 'expense');
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Income = the non-expense side of the taxonomy (Salary, Bonus, Extra, Transfers).
  const visible = categories.filter((c) => (side === 'income' ? !c.isExpense : c.isExpense));

  const assign = useCallback(
    async (categoryId: number, subcategoryId?: number | null) => {
      if (!current) return;
      const cat = categories.find((c) => c.id === categoryId);
      const sub = cat?.subcategories.find((s) => s.id === subcategoryId);
      await fetch(`/api/transactions/${current.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'always', categoryId, subcategoryId: subcategoryId ?? null, reapply: true }),
      });
      setFlash(`${current.label} → ${cat?.name}${sub ? ' › ' + sub.name : ''}`);
      setPendingCat(null);
      setIdx((i) => i + 1);
    },
    [current, categories],
  );

  const skip = useCallback(() => { setPendingCat(null); setIdx((i) => i + 1); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editing || !current) return;
      // Subcategory step: 1-9 picks a sub, Enter/0 saves just the category, Esc backs out.
      if (pendingCat != null) {
        const cat = categories.find((c) => c.id === pendingCat);
        if (!cat) return;
        if (e.key >= '1' && e.key <= '9') {
          const n = Number(e.key) - 1;
          if (cat.subcategories[n]) assign(cat.id, cat.subcategories[n].id);
        } else if (e.key === 'Enter' || e.key === '0') assign(cat.id);
        else if (e.key === 'Escape') setPendingCat(null);
        return;
      }
      if (e.key >= '1' && e.key <= '9') {
        const n = Number(e.key) - 1;
        const c = visible[n];
        if (c) (c.subcategories.length > 0 ? setPendingCat(c.id) : assign(c.id));
      } else if (e.key.toLowerCase() === 'e') setEditing(true);
      else if (e.key.toLowerCase() === 's') skip();
      else if (e.key.toLowerCase() === 'i') setSide('income');
      else if (e.key.toLowerCase() === 'x') setSide('expense');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, editing, pendingCat, categories, visible, assign, skip]);

  if (loading) return <div className="text-muted py-16 text-center animate-fade-in">Loading…</div>;

  const remaining = queue.length - idx;
  const donePct = total > 0 ? Math.round((idx / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">Review queue</h1>
          <p className="text-sm text-muted">{remaining} left · one keystroke per decision</p>
        </div>
        <button onClick={load} className="btn-outline px-3 py-1.5">Refresh</button>
      </header>

      {/* Progress */}
      {total > 0 && (
        <div className="animate-fade-up" style={{ animationDelay: '40ms' }}>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${donePct}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-muted text-right">{idx} / {total} done</div>
        </div>
      )}

      {flash && <div className="text-xs text-credit animate-fade-in">✓ {flash}</div>}

      {!current ? (
        <div className="card p-10 text-center animate-pop">
          <div className="text-5xl mb-3">🎉</div>
          <div className="font-semibold text-lg">All caught up</div>
          <div className="text-sm text-muted mt-1">Everything is categorized.</div>
        </div>
      ) : (
        <>
          {/* Transaction card */}
          <div key={current.id} className="card p-6 animate-pop relative overflow-hidden">
            <div className={`absolute left-0 inset-y-0 w-1 ${current.direction === 'debit' ? 'bg-debit' : 'bg-credit'}`} />
            {/* Amount leads on phones; beside the merchant once there's room —
                side-by-side at 320px squeezed the meta line to one word a row. */}
            <div className="flex flex-col gap-2 pl-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="order-2 min-w-0 sm:order-1">
                <div className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{current.label}</div>
                <div className="mt-1.5 inline-flex max-w-full items-center gap-1.5 truncate rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted">
                  {current.rawMerchant}
                </div>
                <div className="mt-1.5 text-xs text-muted">
                  {fmtDateTime(current.occurredAt)} · {current.instrument}
                  {current.llmConfidence != null ? ` · AI ${Math.round(current.llmConfidence * 100)}%` : ''}
                </div>
              </div>
              <div className={`order-1 shrink-0 text-[26px] font-extrabold tabular sm:order-2 sm:text-[32px] ${current.direction === 'debit' ? 'text-debit' : 'text-credit'}`}>
                {current.direction === 'debit' ? '−' : '+'}{inr(current.amount)}
              </div>
            </div>
          </div>

          {editing ? (
            <CategoryEditor
              txnId={current.id}
              merchant={current.merchant}
              currentCategoryId={null}
              currentSubcategoryId={null}
              compact
              onDone={() => { setEditing(false); setIdx((i) => i + 1); }}
              onCancel={() => setEditing(false)}
            />
          ) : pendingCat != null ? (
            (() => {
              const cat = categories.find((c) => c.id === pendingCat);
              if (!cat) return null;
              return (
                <div className="space-y-3">
                  <div className="text-sm text-muted">
                    Pick a subcategory for <span className="font-medium text-text">{cat.name}</span>, or save without one:
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                    {cat.subcategories.map((s) => (
                      <button key={s.id} onClick={() => assign(cat.id, s.id)} className="rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-left transition-all hover:-translate-y-0.5 hover:shadow-card hover:border-accent">
                        {s.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button onClick={() => assign(cat.id)} className="btn-primary px-3 py-1.5">Just “{cat.name}”</button>
                    <button onClick={() => setPendingCat(null)} className="btn-ghost">← Back</button>
                  </div>
                </div>
              );
            })()
          ) : (
            <>
              {/* Expense / Income sides of the taxonomy */}
              <div className="inline-flex w-full rounded-full border border-border bg-surface-2 p-1 text-sm sm:w-auto">
                {(['expense', 'income'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => { setSide(v); setPendingCat(null); }}
                    className={`flex-1 rounded-full px-5 py-1.5 capitalize transition-all sm:flex-none ${side === v ? 'bg-[rgb(var(--ink))] text-white font-semibold' : 'text-muted hover:text-text'}`}
                  >
                    {v}
                    <kbd className="ml-1.5 text-[10px] opacity-60">{v === 'income' ? 'i' : 'x'}</kbd>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visible.map((c, i) => {
                  const color = PALETTE[i % PALETTE.length];
                  const hasSubs = c.subcategories.length > 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() => (hasSubs ? setPendingCat(c.id) : assign(c.id))}
                      className="group flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3.5 py-3.5 text-sm text-left transition-all hover:-translate-y-0.5 hover:shadow-card hover:border-transparent"
                      style={{ ['--c' as string]: color }}
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-semibold text-white" style={{ background: color }}>{i < 9 ? i + 1 : '·'}</span>
                      <span className="truncate font-medium flex-1">{c.name}</span>
                      {hasSubs && <span className="text-muted text-xs">›</span>}
                    </button>
                  );
                })}
              </div>
              {visible.length === 0 && (
                <p className="text-sm text-muted">
                  No {side} categories yet — add them under <a href="/settings" className="underline">Settings</a>.
                </p>
              )}
              <div className="flex gap-2 text-sm">
                <button onClick={() => setEditing(true)} className="btn-outline px-3 py-1.5">
                  <kbd className="mr-1 rounded bg-surface-2 px-1 text-xs">e</kbd> One-off (this txn only)
                </button>
                <button onClick={skip} className="btn-ghost">
                  <kbd className="mr-1 rounded bg-surface-2 px-1 text-xs">s</kbd> Skip
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
