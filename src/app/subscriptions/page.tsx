'use client';

import { useCallback, useEffect, useState } from 'react';
import { inr, fmtDate } from '@/lib/format';

interface Sub {
  id: number;
  merchant: string;
  medianAmount: string;
  intervalDays: number;
  cadence: string;
  firstSeen: string;
  lastCharged: string;
  nextExpected: string;
  status: string;
}

const STATUS_STYLE: Record<string, string> = {
  active: 'text-credit',
  price_changed: 'text-debit',
  stopped: 'text-muted',
  dismissed: 'text-muted line-through',
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [monthly, setMonthly] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/subscriptions');
    const data = await res.json();
    setSubs(data.subscriptions);
    setMonthly(data.normalizedMonthlyTotal);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function detect() {
    setDetecting(true);
    await fetch('/api/subscriptions/detect', { method: 'POST' });
    await load();
    setDetecting(false);
  }

  async function setStatus(id: number, status: string) {
    await fetch(`/api/subscriptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  const soon = subs.filter((s) => s.status !== 'dismissed' && s.status !== 'stopped' && daysUntil(s.nextExpected) <= 7 && daysUntil(s.nextExpected) >= 0);
  const priceChanged = subs.filter((s) => s.status === 'price_changed');

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Subscriptions</h1>
          <p className="text-sm text-muted">Recurring payments detected from your history.</p>
        </div>
        <button onClick={detect} disabled={detecting} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {detecting ? 'Detecting…' : 'Re-detect'}
        </button>
      </header>

      {/* Normalized monthly total — the headline number (§9). */}
      <div className="rounded-xl border border-accent/40 bg-accent/5 p-5">
        <div className="text-xs text-muted">Normalized monthly recurring spend</div>
        <div className="text-3xl font-semibold tabular mt-1">{inr(monthly)}</div>
        <div className="text-xs text-muted mt-1">Annual ÷ 12, quarterly ÷ 3, plus monthlies.</div>
      </div>

      {priceChanged.length > 0 && (
        <div className="rounded-lg border border-debit/40 bg-debit/5 p-3 text-sm">
          <span className="font-medium text-debit">⚠ Price increase</span> on {priceChanged.map((s) => s.merchant).join(', ')}.
        </div>
      )}
      {soon.length > 0 && (
        <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm">
          <span className="font-medium">Upcoming (≤7 days):</span> {soon.map((s) => `${s.merchant} (${fmtDate(s.nextExpected)})`).join(', ')}
        </div>
      )}

      {loading ? (
        <div className="text-muted">Loading…</div>
      ) : subs.length === 0 ? (
        <div className="text-muted">No subscriptions detected yet. Run “Re-detect” after syncing.</div>
      ) : (
        <div className="scroll-x rounded-xl border border-border">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-surface-2 text-muted text-xs">
              <tr>
                <th className="text-left px-3 py-2">Merchant</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-left px-3 py-2">Cadence</th>
                <th className="text-left px-3 py-2">Next</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subs.map((s) => (
                <tr key={s.id} className="bg-surface">
                  <td className="px-3 py-2 font-medium">{s.merchant}</td>
                  <td className="px-3 py-2 text-right tabular">{inr(s.medianAmount)}</td>
                  <td className="px-3 py-2 capitalize">{s.cadence}</td>
                  <td className="px-3 py-2">{fmtDate(s.nextExpected)}</td>
                  <td className={`px-3 py-2 capitalize ${STATUS_STYLE[s.status] ?? ''}`}>{s.status.replace('_', ' ')}</td>
                  <td className="px-3 py-2 text-right">
                    {s.status === 'dismissed' ? (
                      <button onClick={() => setStatus(s.id, 'active')} className="text-xs text-accent">Restore</button>
                    ) : (
                      <button onClick={() => setStatus(s.id, 'dismissed')} className="text-xs text-muted hover:text-debit">Dismiss</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
