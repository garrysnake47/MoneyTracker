'use client';

import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { inr } from '@/lib/format';

/**
 * Savings-rate gauge: (income − spend) / income. Falls back to net savings when
 * there's no income in the period.
 */
export default function HealthGauge({ income, spend }: { income: number; spend: number }) {
  const net = income - spend;
  const rate = income > 0 ? Math.max(0, Math.min(100, Math.round((net / income) * 100))) : null;
  const color = rate == null ? '#94a3b8' : rate >= 40 ? '#22c55e' : rate >= 15 ? '#f59e0b' : '#ef4444';
  const value = rate ?? 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 180, height: 180 }}>
        <RadialBarChart
          width={180}
          height={180}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={88}
          barSize={16}
          data={[{ name: 'savings', value, fill: color }]}
          startAngle={220}
          endAngle={-40}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'rgb(var(--surface-2))' }} isAnimationActive={false} />
        </RadialBarChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {rate == null ? (
            <>
              <div className="text-[10px] uppercase tracking-wide text-muted">Net</div>
              <div className={`text-lg font-semibold tabular ${net >= 0 ? 'text-credit' : 'text-debit'}`}>{inr(net)}</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold tabular">{rate}%</div>
              <div className="text-[10px] uppercase tracking-wide text-muted">saved</div>
            </>
          )}
        </div>
      </div>
      <div className="mt-2 text-center text-xs text-muted">
        Net saved <span className={`font-medium ${net >= 0 ? 'text-credit' : 'text-debit'}`}>{inr(net)}</span> this month
      </div>
    </div>
  );
}
