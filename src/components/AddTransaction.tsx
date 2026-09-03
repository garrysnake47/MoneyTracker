'use client';

import { useMemo, useState } from 'react';
import { useCategories } from '@/lib/useCategories';
import { CategoryDropdown } from './Select';

/** Today's date and the current time, in the browser's own timezone. */
function localNow() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

/** Manual income/expense entry form (spec: user enters income manually). */
export default function AddTransaction({ onAdded, onClose }: { onAdded: () => void; onClose: () => void }) {
  const categories = useCategories();
  const [direction, setDirection] = useState<'debit' | 'credit'>('debit');
  const [amount, setAmount] = useState('');
  // Local, not UTC: toISOString() would roll the date over for anyone whose
  // offset puts them on a different calendar day than UTC right now.
  const [date, setDate] = useState(() => localNow().date);
  const [time, setTime] = useState(() => localNow().time);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subs = useMemo(() => categories.find((c) => c.id === Number(categoryId))?.subcategories ?? [], [categories, categoryId]);

  async function submit() {
    if (!amount || Number(amount) <= 0) {
      setError('Enter an amount.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction,
          amount: Number(amount),
          occurredAt: new Date(`${date}T${time || '00:00'}`).toISOString(),
          description: description.trim(),
          categoryId: categoryId || null,
          subcategoryId: subcategoryId || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-surface p-5 shadow-card space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Add transaction</h2>
          <button onClick={onClose} className="text-muted text-xl leading-none">×</button>
        </div>

        {/* Income / Expense toggle */}
        <div className="inline-flex w-full rounded-lg border border-border bg-surface-2 p-0.5 text-sm">
          <button onClick={() => setDirection('debit')} className={`flex-1 py-1.5 rounded-md ${direction === 'debit' ? 'bg-surface shadow-sm font-medium text-debit' : 'text-muted'}`}>
            Expense
          </button>
          <button onClick={() => setDirection('credit')} className={`flex-1 py-1.5 rounded-md ${direction === 'credit' ? 'bg-surface shadow-sm font-medium text-credit' : 'text-muted'}`}>
            Income
          </button>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Amount (₹)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" autoFocus className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-sm tabular" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-muted mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={direction === 'credit' ? 'e.g. Freelance payment' : 'e.g. Groceries'} className="w-full rounded-md border border-border bg-surface-2 px-2 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Category</label>
          <CategoryDropdown
            categories={categories}
            value={{ categoryId: categoryId ? Number(categoryId) : null, subcategoryId: subcategoryId ? Number(subcategoryId) : null }}
            onChange={(v) => {
              setCategoryId(v.categoryId ? String(v.categoryId) : '');
              setSubcategoryId(v.subcategoryId ? String(v.subcategoryId) : '');
            }}
            placeholder="Pick a category"
          />
        </div>

        {error && <div className="text-xs text-debit">{error}</div>}

        <button onClick={submit} disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {busy ? 'Saving…' : `Add ${direction === 'credit' ? 'income' : 'expense'}`}
        </button>
      </div>
    </div>
  );
}
