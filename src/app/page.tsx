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

  const net = data ? data.totalMoneyIn - data.totalSpend : 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted">Spend excludes transfers, EMIs counted, card bills netted out.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="input w-auto">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Total spend" value={inr(data.totalSpend)} icon="wallet" tone="blue" delay={0}>
              {data.deltaPct != null && (
                <span>{data.deltaPct > 0 ? '▲' : '▼'} {Math.abs(data.deltaPct)}% vs last month</span>
              )}
            </KpiCard>
            <KpiCard label="Money in" value={inr(data.totalMoneyIn)} icon="income" tone="emerald" delay={70} />
            <KpiCard label="Net saved" value={inr(net)} icon="piggy" tone={net >= 0 ? 'amber' : 'rose'} delay={140}>
              <span>{net >= 0 ? 'surplus' : 'deficit'}</span>
            </KpiCard>
            <KpiCard label="Transactions" value={String(data.txnCount)} icon="receipt" tone="slate" delay={210}>
              {data.uncategorizedCount > 0 && <a href="/review" className="underline decoration-white/40">{data.uncategorizedCount} to review →</a>}
            </KpiCard>
          </div>

          {/* Trend + health */}
          <Reveal className="grid grid-cols-1 md:grid-cols-3 gap-4" delay={40}>
            <section className="card lift md:col-span-2 p-5">
              <h2 className="text-sm font-semibold mb-3">Money in vs spend · last 8 weeks</h2>
              <TrendChart data={data.trend} />
            </section>
            <section className="card lift p-5 flex flex-col">
              <h2 className="text-sm font-semibold mb-3">Savings health</h2>
              <div className="flex-1 flex items-center justify-center">
                <HealthGauge income={data.totalMoneyIn} spend={data.totalSpend} />
              </div>
            </section>
          </Reveal>

          {/* Category (50%) + Recent activity (50%) — single row */}
          <Reveal className="grid grid-cols-1 lg:grid-cols-2 gap-4" delay={40}>
            <section className="card lift p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">{pieView === 'expense' ? 'Spend by category' : 'Income by source'}</h2>
                <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5 text-sm">
                  {(['expense', 'income'] as const).map((v) => (
                    <button key={v} onClick={() => setPieView(v)} className={`px-3 py-1 rounded-md capitalize transition-all ${pieView === v ? 'bg-surface shadow-sm font-medium' : 'text-muted'}`}>{v}</button>
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
              <h2 className="text-sm font-semibold mb-3">Top merchants</h2>
              {data.topMerchants.length === 0 ? (
                <p className="text-sm text-muted">Nothing yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.topMerchants.map((m, i) => (
                    <li key={m.merchant} className="flex items-center gap-3 py-2 text-sm">
                      <span className="h-6 w-6 shrink-0 rounded-md bg-surface-2 grid place-items-center text-xs text-muted">{i + 1}</span>
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

const TONES: Record<string, string> = {
  blue: 'from-blue-600 to-blue-800',
  emerald: 'from-emerald-500 to-emerald-700',
  amber: 'from-amber-500 to-orange-600',
  rose: 'from-rose-500 to-red-600',
  slate: 'from-slate-700 to-slate-900',
};

function KpiCard({ label, value, children, tone, icon, delay = 0 }: { label: string; value: string; children?: React.ReactNode; tone: keyof typeof TONES | string; icon: string; delay?: number }) {
  return (
    <div className={`lift animate-pop relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br ${TONES[tone] ?? TONES.blue} shadow-lg`} style={{ animationDelay: `${delay}ms` }}>
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" aria-hidden />
      <div className="relative flex items-center justify-between">
        <div className="text-[11px] sm:text-xs font-medium text-white/85">{label}</div>
        <span className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-lg bg-white/20 text-white"><Icon name={icon} size={16} /></span>
      </div>
      <div className="relative mt-1.5 text-xl sm:text-2xl lg:text-[26px] leading-tight font-bold tabular whitespace-nowrap">{value}</div>
      <div className="relative mt-1 text-[11px] sm:text-xs text-white/90">{children}</div>
    </div>
  );
}
