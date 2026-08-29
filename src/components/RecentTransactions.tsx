'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { inr, fmtDate } from '@/lib/format';

interface Txn {
  id: number;
  occurredAt: string;
  amount: string;
  direction: 'debit' | 'credit';
  merchant: string;
  label: string;
  categoryName: string | null;
}

export default function RecentTransactions() {
  const [items, setItems] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/transactions?pageSize=6')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Recent activity</h2>
        <Link href="/transactions" className="text-xs text-accent">
          View all →
        </Link>
      </div>
      {loading ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted">No transactions yet.</div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <div className={`h-9 w-9 shrink-0 rounded-full grid place-items-center text-sm ${t.direction === 'debit' ? 'bg-debit/10 text-debit' : 'bg-credit/10 text-credit'}`}>
                {t.direction === 'debit' ? '↓' : '↑'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{t.label}</div>
                <div className="text-xs text-muted">
                  {fmtDate(t.occurredAt)} · {t.categoryName ?? 'Uncategorized'}
                </div>
              </div>
              <div className={`text-sm font-semibold tabular ${t.direction === 'debit' ? 'text-debit' : 'text-credit'}`}>
                {t.direction === 'debit' ? '−' : '+'}
                {inr(t.amount)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
