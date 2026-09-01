'use client';

import { useCallback, useEffect, useState } from 'react';
import { inr } from '@/lib/format';
import { useCategories } from '@/lib/useCategories';
import Reveal from '@/components/Reveal';

interface B {
  budgetId: number;
  categoryId: number;
  categoryName: string;
  budget: number;
  spent: number;
}

function barColor(pct: number) {
  if (pct >= 100) return 'bg-debit';
  if (pct >= 80) return 'bg-amber';
  return 'bg-credit';
}

export default function BudgetPage() {
  const categories = useCategories();
  const [budgets, setBudgets] = useState<B[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = await fetch('/api/budgets').then((r) => r.json());
    setBudgets(d.budgets ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function save(catId: number, amt: number) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: catId, amount: amt }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (!categoryId || !amount || Number(amount) <= 0) {
      setMsg('Pick a category and enter an amount.');
      return;
    }
    await save(Number(categoryId), Number(amount));
    setAmount('');
    setCategoryId('');
  }

  const totalBudget = budgets.reduce((s, b) => s + b.budget, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  // categories without a budget yet (top-level, expense-ish)
  const budgetedIds = new Set(budgets.map((b) => b.categoryId));
  const available = categories.filter((c) => !budgetedIds.has(c.id));

  return (
    <div className="space-y-5">
      <header className="animate-fade-up">
        <h1 className="text-[28px] font-extrabold tracking-tight">Budgets</h1>
        <p className="text-sm text-muted mt-1">Set a monthly cap per category and track spending against it.</p>
      </header>

      {/* Summary */}
      <Reveal className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs text-muted">Total budget</div>
          <div className="text-xl font-bold tabular mt-1">{inr(totalBudget)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Spent this month</div>
          <div className="text-xl font-bold tabular mt-1">{inr(totalSpent)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-muted">Remaining</div>
          <div className={`text-xl font-bold tabular mt-1 ${totalBudget - totalSpent >= 0 ? 'text-credit' : 'text-debit'}`}>{inr(totalBudget - totalSpent)}</div>
        </div>
      </Reveal>

      {/* Add budget */}
      <Reveal className="card p-5" delay={40}>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs text-muted mb-1.5">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="select">
              <option value="">— Category —</option>
              {available.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Monthly budget (₹)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} inputMode="decimal" placeholder="e.g. 15000" className="input tabular" />
          </div>
          <button onClick={add} disabled={busy} className="btn-primary h-[42px] w-full sm:w-auto">Add budget</button>
        </div>
        {msg && <div className="mt-3 text-xs text-debit">{msg}</div>}
      </Reveal>

      {/* Budget list */}
      {budgets.length === 0 ? (
        <Reveal className="card p-8 text-center text-muted" delay={80}>
          No budgets yet. Add one above — try <span className="font-medium text-text">Food</span> or <span className="font-medium text-text">SIP</span>.
        </Reveal>
      ) : (
        <div className="space-y-3">
          {budgets.map((b, i) => {
            const pct = b.budget > 0 ? Math.round((b.spent / b.budget) * 100) : 0;
            return (
              <Reveal key={b.budgetId} className="card p-4" delay={i * 50}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{b.categoryName}</div>
                  <div className="text-sm tabular">
                    <span className={pct >= 100 ? 'text-debit font-semibold' : ''}>{inr(b.spent)}</span>
                    <span className="text-muted"> / {inr(b.budget)}</span>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${barColor(pct)}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-muted">
                    {pct}% used{pct >= 100 ? ` · over by ${inr(b.spent - b.budget)}` : ` · ${inr(Math.max(0, b.budget - b.spent))} left`}
                  </div>
                  <div className="flex items-center gap-2">
                    <BudgetEdit current={b.budget} onSave={(amt) => save(b.categoryId, amt)} />
                    <button onClick={() => save(b.categoryId, 0)} className="text-xs text-muted hover:text-debit">Remove</button>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BudgetEdit({ current, onSave }: { current: number; onSave: (amt: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(current));
  if (!editing) return <button onClick={() => { setVal(String(current)); setEditing(true); }} className="text-xs text-accent">Edit</button>;
  return (
    <span className="inline-flex items-center gap-1">
      <input value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" className="w-24 rounded-md border border-border bg-surface px-2 py-1 text-xs tabular" />
      <button onClick={() => { onSave(Number(val) || 0); setEditing(false); }} className="text-xs text-accent font-medium">Save</button>
    </span>
  );
}
