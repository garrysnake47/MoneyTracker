'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { inr, fmtDate } from '@/lib/format';

interface Sub {
  id: number;
  merchant: string;
  medianAmount: string;
  cadence: string;
  nextExpected: string;
  status: string;
}

export default function SubsWidget() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [monthly, setMonthly] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/subscriptions')
      .then((r) => (r.ok ? r.json() : { subscriptions: [], normalizedMonthlyTotal: 0 }))
      .then((d) => {
        setSubs(d.subscriptions ?? []);
        setMonthly(d.normalizedMonthlyTotal ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = subs.filter((s) => s.status === 'active' || s.status === 'price_changed').slice(0, 4);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Recurring</h2>
        <Link href="/subscriptions" className="text-xs text-accent">
          Manage →
        </Link>
      </div>
      <div className="rounded-xl bg-accent/5 border border-accent/30 p-3 mb-3">
        <div className="text-xs text-muted">Normalized monthly</div>
        <div className="text-xl font-semibold tabular">{inr(monthly)}</div>
      </div>
      {loading ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : active.length === 0 ? (
        <div className="text-sm text-muted">None detected yet. Run “Re-detect” on the Subs page.</div>
      ) : (
        <ul className="divide-y divide-border">
          {active.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{s.merchant}</div>
                <div className="text-xs text-muted">{s.cadence} · next {fmtDate(s.nextExpected)}</div>
              </div>
              <div className="tabular font-medium">{inr(s.medianAmount)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
