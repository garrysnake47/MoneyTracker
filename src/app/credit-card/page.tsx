'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { inr, fmtDate } from '@/lib/format';
import Icon from '@/components/Icon';
import Reveal from '@/components/Reveal';

interface Card {
  id: number;
  last4: string;
  label: string;
  txnCount: number;
}

interface Txn {
  id: number;
  occurredAt: string;
  amount: string;
  direction: 'debit' | 'credit';
  label: string;
  accountLast4: string | null;
  categoryName: string | null;
  subcategoryName: string | null;
}

function monthOptions(): string[] {
  const out: string[] = [];
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();
  for (let i = 0; i < 12; i++) {
    out.push(`${y}-${String(m + 1).padStart(2, '0')}`);
    m--;
    if (m < 0) {
      m = 11;
      y--;
    }
  }
  return out;
}

function monthLabel(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function monthRange(m: string): { from: string; to: string } {
  const [y, mo] = m.split('-').map(Number);
  const last = new Date(y, mo, 0).getDate();
  return { from: `${m}-01`, to: `${m}-${String(last).padStart(2, '0')}` };
}

export default function CreditCardPage() {
  const months = monthOptions();
  const [month, setMonth] = useState(months[0]);
  const [cards, setCards] = useState<Card[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [last4, setLast4] = useState('');
  const [label, setLabel] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const { from, to } = monthRange(m);
      const [c, t] = await Promise.all([
        fetch('/api/credit-cards', { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/transactions?creditCard=1&from=${from}&to=${to}&pageSize=200`).then((r) => r.json()),
      ]);
      setCards(c.cards ?? []);
      setTxns(t.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  async function addCard() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/credit-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last4: last4.trim(), label: label.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not add the card');
      setLast4('');
      setLabel('');
      setMsg(d.reclassified > 0 ? `Added — ${d.reclassified} past transaction${d.reclassified === 1 ? '' : 's'} moved to this card.` : 'Added.');
      await load(month);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not add the card');
    } finally {
      setBusy(false);
    }
  }

  async function removeCard(c: Card) {
    if (!confirm(`Remove ${c.label}? Its ${c.txnCount} transaction(s) go back to counting as account spend.`)) return;
    await fetch(`/api/credit-cards?id=${c.id}`, { method: 'DELETE' });
    await load(month);
  }

  // Charges minus refunds — what this month added to the card balance.
  const { charges, refunds } = useMemo(() => {
    let charges = 0;
    let refunds = 0;
    for (const t of txns) {
      const amt = Number(t.amount);
      if (t.direction === 'credit') refunds += amt;
      else charges += amt;
    }
    return { charges, refunds };
  }, [txns]);

  const byCard = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) {
      if (t.direction === 'credit') continue;
      const k = t.accountLast4 ?? '—';
      m.set(k, (m.get(k) ?? 0) + Number(t.amount));
    }
    return m;
  }, [txns]);

  return (
    <div className="space-y-5 pt-1">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">Credit card</h1>
          <p className="text-sm text-muted">Card charges count as spend but don’t leave your account until you pay the bill.</p>
        </div>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="input w-auto rounded-full">
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      </header>

      {/* Headline: what went on the card this month */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="animate-pop relative overflow-hidden rounded-3xl p-5 bg-[rgb(var(--ink))] text-white shadow-ink sm:col-span-2">
          <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/[0.06]" aria-hidden />
          <div className="relative flex items-center justify-between">
            <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-white/70">Charged this month</div>
            <span className="tile h-9 w-9 bg-white/15 text-white"><Icon name="wallet" size={16} /></span>
          </div>
          <div className="relative mt-2 text-[28px] leading-tight font-extrabold tabular">{inr(charges)}</div>
          <div className="relative mt-1 text-xs font-medium text-white/70">
            {refunds > 0 ? `${inr(refunds)} refunded · net ${inr(charges - refunds)}` : `${txns.length} transaction${txns.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <div className="animate-pop rounded-3xl p-5 bg-surface border border-border shadow-card" style={{ animationDelay: '70ms' }}>
          <div className="flex items-center justify-between">
            <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-muted">Cards</div>
            <span className="tile h-9 w-9 bg-lilac text-[rgb(var(--peri-2))]"><Icon name="receipt" size={16} /></span>
          </div>
          <div className="mt-2 text-[28px] leading-tight font-extrabold tabular">{cards.length}</div>
          <div className="mt-1 text-xs font-medium text-muted">registered</div>
        </div>
      </div>

      {/* Registry */}
      <Reveal delay={40}>
        <section className="card p-5 space-y-4">
          <div>
            <h2 className="text-[15px] font-bold">Your credit cards</h2>
            <p className="text-xs text-muted">
              Bank alerts don’t say whether a card is credit or debit — add the last 4 digits of each credit card so its charges are
              tracked here instead of being deducted from your balance.
            </p>
          </div>

          {cards.length === 0 ? (
            <p className="text-sm text-muted">No cards yet. Add one below.</p>
          ) : (
            <ul className="space-y-2">
              {cards.map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
                  <span className="tile h-9 w-9 bg-sand text-[rgb(var(--amber-2))]"><Icon name="wallet" size={16} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{c.label}</div>
                    <div className="text-xs text-muted font-mono">•••• {c.last4} · {c.txnCount} transaction{c.txnCount === 1 ? '' : 's'}</div>
                  </div>
                  <span className="text-sm font-semibold tabular">{inr(byCard.get(c.last4) ?? 0)}</span>
                  <button onClick={() => removeCard(c)} className="btn-ghost text-xs" aria-label={`Remove ${c.label}`}>Remove</button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col sm:flex-row gap-2 border-t border-border pt-4">
            <input
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Last 4 digits"
              inputMode="numeric"
              className="input sm:w-40 tabular"
            />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCard()}
              placeholder="Name (e.g. HDFC Regalia)"
              className="input flex-1"
            />
            <button onClick={addCard} disabled={busy || last4.length !== 4} className="btn-primary">
              {busy ? 'Adding…' : 'Add card'}
            </button>
          </div>
          {msg && <div className="text-xs text-credit">{msg}</div>}
        </section>
      </Reveal>

      {/* This month's charges */}
      <Reveal delay={40}>
        <section className="card p-5">
          <h2 className="text-[15px] font-bold mb-3">Card transactions · {monthLabel(month)}</h2>
          {loading ? (
            <p className="text-sm text-muted py-6 text-center">Loading…</p>
          ) : txns.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing on your cards this month. If charges are missing, check that the card’s last 4 digits are registered above.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {txns.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{t.label}</div>
                    <div className="text-xs text-muted">
                      {fmtDate(t.occurredAt)}
                      {t.accountLast4 && <span className="font-mono"> · ••{t.accountLast4}</span>}
                      {t.categoryName && ` · ${t.categoryName}${t.subcategoryName ? ` › ${t.subcategoryName}` : ''}`}
                    </div>
                  </div>
                  <span className={`tabular font-semibold ${t.direction === 'credit' ? 'text-credit' : 'text-debit'}`}>
                    {t.direction === 'credit' ? '+' : '−'}{inr(Number(t.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Reveal>
    </div>
  );
}
