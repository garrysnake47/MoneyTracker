'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCategories } from '@/lib/useCategories';

interface Rule {
  id: number;
  pattern: string;
  categoryId: number | null;
  categoryName: string;
  subcategoryId: number | null;
  subcategoryName: string | null;
  label: string | null;
  source: string;
  hitCount: number;
}

// Category accent colors (match the dashboard palette).
const PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];

/**
 * Keyword rules: map a keyword to a category. Any transaction whose merchant
 * contains the keyword is filed there automatically — existing and future.
 */
export default function KeywordsPage() {
  const categories = useCategories();
  const [rules, setRules] = useState<Rule[]>([]);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const d = await fetch('/api/rules').then((r) => r.json());
    setRules(d.rules);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const subs = useMemo(() => categories.find((c) => c.id === Number(categoryId))?.subcategories ?? [], [categories, categoryId]);

  // color per category name (stable by seeded order)
  const colorByCat = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c, i) => m.set(c.name, PALETTE[i % PALETTE.length]));
    return m;
  }, [categories]);

  async function add() {
    if (!keyword.trim() || !categoryId) {
      setMsg('Enter a keyword and pick a category.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim(), categoryId: Number(categoryId), subcategoryId: subcategoryId || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      setMsg(`Added “${keyword.trim()}” — applied to ${d.applied ?? 0} existing transaction(s).`);
      setKeyword('');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    await load();
  }

  const byCategory = useMemo(() => {
    const m = new Map<string, Rule[]>();
    for (const r of rules) {
      const k = r.categoryName || 'Uncategorized';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    // order by the taxonomy order
    const order = categories.map((c) => c.name);
    return Array.from(m.entries()).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [rules, categories]);

  return (
    <div className="space-y-5">
      <header className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight">Keywords</h1>
        <p className="text-sm text-muted mt-1">
          Map keywords to categories. If a transaction’s merchant contains the keyword, it’s filed automatically —
          e.g. <span className="font-medium text-text">hotel, restaurant, bar</span> → Food.
        </p>
      </header>

      {/* Add form */}
      <section className="card p-5 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs text-muted mb-1.5">Keyword</label>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="e.g. restaurant" className="input" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Category</label>
            <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId(''); }} className="input">
              <option value="">— Category —</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Subcategory (optional)</label>
            <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={subs.length === 0} className="input disabled:opacity-50">
              <option value="">— none —</option>
              {subs.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <button onClick={add} disabled={busy} className="btn-primary h-[38px]">{busy ? 'Adding…' : 'Add keyword'}</button>
        </div>
        {msg && <div className="mt-3 text-xs text-credit">{msg}</div>}
      </section>

      {/* Existing rules grouped by category */}
      <div className="space-y-4">
        {byCategory.map(([cat, list], idx) => {
          const color = colorByCat.get(cat) ?? '#6366f1';
          return (
            <section key={cat} className="card p-4 animate-fade-up" style={{ animationDelay: `${120 + idx * 50}ms` }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                <h2 className="text-sm font-semibold">{cat}</h2>
                <span className="text-xs text-muted">{list.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {list.map((r) => (
                  <span
                    key={r.id}
                    className="group inline-flex items-center gap-1.5 rounded-full border pl-3 pr-1.5 py-1 text-sm transition-colors hover:border-accent/40"
                    style={{ background: `${color}0f`, borderColor: `${color}33` }}
                  >
                    <span className="font-medium lowercase">{r.pattern}</span>
                    {r.subcategoryName && <span className="text-muted text-xs">· {r.subcategoryName}</span>}
                    <button
                      onClick={() => remove(r.id)}
                      className="ml-0.5 h-5 w-5 rounded-full grid place-items-center text-muted transition-colors hover:text-white hover:bg-debit"
                      aria-label={`Remove ${r.pattern}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
