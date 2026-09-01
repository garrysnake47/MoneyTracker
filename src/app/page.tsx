'use client';

import { useCallback, useEffect, useState } from 'react';
import { inr } from '@/lib/format';
import SyncButton from '@/components/SyncButton';
import Icon from '@/components/Icon';
import Reveal from '@/components/Reveal';
import CategoryPie from '@/components/CategoryPie';
import TrendChart, { type TrendPoint } from '@/components/TrendChart';
import HealthGauge from '@/components/HealthGauge';
import RecentTransactions from '@/components/RecentTransactions';
import SubsWidget from '@/components/SubsWidget';
import BudgetWidget from '@/components/BudgetWidget';

interface Overview {
  month: string;
  totalSpend: number;
  totalMoneyIn: number;
  allMoneyOut: number;
  prevMonthSpend: number;
  accountOutflow: number;
  creditCardSpend: number;
  deltaPct: number | null;
  categoryBreakdown: { categoryId: number | null; categoryName: string; amount: number }[];
  incomeBreakdown: { categoryId: number | null; categoryName: string; amount: number }[];
  topMerchants: { merchant: string; amount: number }[];
  txnCount: number;
  uncategorizedCount: number;
  trend: TrendPoint[];
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

export default function OverviewPage() {
  const months = monthOptions();
  const [month, setMonth] = useState(months[0]);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [pieView, setPieView] = useState<'expense' | 'income'>('expense');

  const refresh = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/overview?month=${m}`);
      if (res.ok) setData(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(month);
  }, [month, refresh]);

  // Card charges are spend but haven't left the account yet, so the balance
  // view nets money in against account outflow only.
  const net = data ? data.totalMoneyIn - data.accountOutflow : 0;

  return (
    <div className="space-y-5 pt-1">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight">Overview</h1>
          <p className="text-sm text-muted">Spend excludes transfers, EMIs counted, card bills netted out. Credit-card charges count as spend but not as account outflow.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="input w-auto rounded-full">
            {months.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <SyncButton onDone={() => refresh(month)} />
        </div>
      </header>

      {loading || !data ? (
        <div className="text-muted py-16 text-center animate-fade-in">Loading dashboard…</div>
      ) : (
        <>
          {/* KPI tiles — each a distinct color */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard label="Total spend" value={inr(data.totalSpend)} icon="wallet" tone="ink" delay={0}>
              {data.deltaPct != null && (
                <span>{data.deltaPct > 0 ? '▲' : '▼'} {Math.abs(data.deltaPct)}% vs last month</span>
              )}
            </KpiCard>
            <KpiCard label="Money in" value={inr(data.totalMoneyIn)} icon="income" tone="mint" delay={70}>
              <span>credited to your account</span>
            </KpiCard>
            <KpiCard label="Net saved" value={inr(net)} icon="piggy" tone={net >= 0 ? 'sand' : 'blush'} delay={140}>
              <span>{net >= 0 ? 'surplus' : 'deficit'} · in − out of account</span>
            </KpiCard>
            <KpiCard label="Credit card" value={inr(data.creditCardSpend)} icon="creditcard" tone="sky" delay={210}>
              <a href="/credit-card" className="underline decoration-muted/50">not deducted from balance →</a>
            </KpiCard>
            <KpiCard label="Transactions" value={String(data.txnCount)} icon="receipt" tone="lilac" delay={280}>
              {data.uncategorizedCount > 0 && <a href="/review" className="underline decoration-muted/50">{data.uncategorizedCount} to review →</a>}
            </KpiCard>
          </div>

          {/* Trend + health */}
          <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-4" delay={40}>
            <section className="card lift md:col-span-2 p-5">
              <h2 className="text-[15px] font-bold mb-3">Money in vs spend · {monthLabel(month)}</h2>
              <TrendChart data={data.trend} />
            </section>
            <section className="card lift p-5 flex flex-col">
              <h2 className="text-[15px] font-bold mb-3">Savings health</h2>
              <div className="flex-1 flex items-center justify-center">
                <HealthGauge income={data.totalMoneyIn} spend={data.totalSpend} />
              </div>
            </section>
          </Reveal>

          {/* Category (50%) + Recent activity (50%) — single row */}
          <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-4" delay={40}>
            <section className="card lift p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-bold">{pieView === 'expense' ? 'Spend by category' : 'Income by source'}</h2>
                <div className="inline-flex rounded-full border border-border bg-surface-2 p-0.5 text-sm">
                  {(['expense', 'income'] as const).map((v) => (
                    <button key={v} onClick={() => setPieView(v)} className={`px-3.5 py-1 rounded-full capitalize transition-all ${pieView === v ? 'bg-[rgb(var(--ink))] text-white font-semibold' : 'text-muted'}`}>{v}</button>
                  ))}
                </div>
              </div>
              <CategoryPie items={pieView === 'expense' ? data.categoryBreakdown : data.incomeBreakdown} />
            </section>
            <RecentTransactions />
          </Reveal>

          {/* Budget (50%) + Top merchants (50%) */}
          <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-4" delay={40}>
            <BudgetWidget month={month} />
            <section className="card lift p-5">
              <h2 className="text-[15px] font-bold mb-3">Top merchants</h2>
              {data.topMerchants.length === 0 ? (
                <p className="text-sm text-muted">Nothing yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.topMerchants.map((m, i) => (
                    <li key={m.merchant} className="flex items-center gap-3 py-2 text-sm">
                      <span className="h-7 w-7 shrink-0 rounded-full bg-surface-2 grid place-items-center text-xs font-semibold text-muted">{i + 1}</span>
                      <span className="flex-1 truncate">{m.merchant}</span>
                      <span className="tabular font-medium">{inr(m.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </Reveal>

          {/* Recurring */}
          <Reveal delay={40}>
            <SubsWidget />
          </Reveal>
        </>
      )}
    </div>
  );
}

/* Card looks from the reference: one ink "balance" hero, the rest white with
   pastel icon tiles. */
const TONES: Record<string, { card: string; tile: string; label: string; value: string; sub: string }> = {
  ink: {
    card: 'bg-[rgb(var(--ink))] text-white shadow-ink border border-transparent',
    tile: 'bg-white/15 text-white',
    label: 'text-white/70',
    value: 'text-white',
    sub: 'text-white/70',
  },
  mint: { card: 'bg-surface border border-border shadow-card', tile: 'bg-mint text-[rgb(var(--credit))]', label: 'text-muted', value: 'text-text', sub: 'text-muted' },
  sand: { card: 'bg-surface border border-border shadow-card', tile: 'bg-sand text-[rgb(var(--amber-2))]', label: 'text-muted', value: 'text-text', sub: 'text-muted' },
  blush: { card: 'bg-surface border border-border shadow-card', tile: 'bg-blush text-[rgb(var(--debit))]', label: 'text-muted', value: 'text-text', sub: 'text-muted' },
  lilac: { card: 'bg-surface border border-border shadow-card', tile: 'bg-lilac text-[rgb(var(--peri-2))]', label: 'text-muted', value: 'text-text', sub: 'text-muted' },
  sky: { card: 'bg-surface border border-border shadow-card', tile: 'bg-sky text-[rgb(var(--peri-2))]', label: 'text-muted', value: 'text-text', sub: 'text-muted' },
};

function KpiCard({ label, value, children, tone, icon, delay = 0 }: { label: string; value: string; children?: React.ReactNode; tone: keyof typeof TONES | string; icon: string; delay?: number }) {
  const t = TONES[tone] ?? TONES.sky;
  return (
    <div className={`lift animate-pop relative overflow-hidden rounded-3xl p-5 ${t.card}`} style={{ animationDelay: `${delay}ms` }}>
      {tone === 'ink' && <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/[0.06]" aria-hidden />}
      <div className="relative flex items-center justify-between">
        <div className={`text-[11px] sm:text-xs font-semibold uppercase tracking-wide ${t.label}`}>{label}</div>
        <span className={`tile h-9 w-9 ${t.tile}`}><Icon name={icon} size={16} /></span>
      </div>
      <div className={`relative mt-2 text-xl sm:text-2xl lg:text-[28px] leading-tight font-extrabold tabular whitespace-nowrap ${t.value}`}>{value}</div>
      <div className={`relative mt-1 text-[11px] sm:text-xs font-medium ${t.sub}`}>{children}</div>
    </div>
  );
}
