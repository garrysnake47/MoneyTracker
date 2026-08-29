'use client';

import { useMemo, useState } from 'react';
import { useCategories } from '@/lib/useCategories';

interface Props {
  txnId: number;
  merchant: string;
  currentCategoryId: number | null;
  currentSubcategoryId: number | null;
  onDone: () => void;
  onCancel?: () => void;
  compact?: boolean; // review-queue mode: default to "Always" + reapply
}

/**
 * Inline category editor implementing spec §7.5's two correction modes:
 *  - "Always categorize this merchant as X" → writes a merchant_rule; can
 *    re-apply retroactively.
 *  - "Just this transaction is X" → sets + locks this row only.
 */
export default function CategoryEditor({ txnId, merchant, currentCategoryId, currentSubcategoryId, onDone, onCancel, compact }: Props) {
  const categories = useCategories();
  const [categoryId, setCategoryId] = useState<number | null>(currentCategoryId);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(currentSubcategoryId);
  const [mode, setMode] = useState<'always' | 'once'>('always');
  const [reapply, setReapply] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subs = useMemo(() => categories.find((c) => c.id === categoryId)?.subcategories ?? [], [categories, categoryId]);

  async function save() {
    if (!categoryId) {
      setError('Pick a category');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${txnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, categoryId, subcategoryId, reapply: mode === 'always' ? reapply : false }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-3">
      <div className="text-xs text-muted">
        Merchant: <span className="font-mono text-text">{merchant}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          className="w-full rounded-md border border-border bg-surface px-2 py-2 text-sm"
          value={categoryId ?? ''}
          onChange={(e) => {
            setCategoryId(e.target.value ? Number(e.target.value) : null);
            setSubcategoryId(null);
          }}
        >
          <option value="">— Category —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isExpense ? '' : ' (not spend)'}
            </option>
          ))}
        </select>

        <select
          className="w-full rounded-md border border-border bg-surface px-2 py-2 text-sm disabled:opacity-50"
          value={subcategoryId ?? ''}
          onChange={(e) => setSubcategoryId(e.target.value ? Number(e.target.value) : null)}
          disabled={subs.length === 0}
        >
          <option value="">— Subcategory (optional) —</option>
          {subs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" checked={mode === 'always'} onChange={() => setMode('always')} />
          <span>Always this merchant</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" checked={mode === 'once'} onChange={() => setMode('once')} />
          <span>Just this one</span>
        </label>
        {mode === 'always' && (
          <label className="flex items-center gap-1.5 cursor-pointer text-muted">
            <input type="checkbox" checked={reapply} onChange={(e) => setReapply(e.target.checked)} />
            <span>Apply to past transactions</span>
          </label>
        )}
      </div>

      {error && <div className="text-xs text-debit">{error}</div>}

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
