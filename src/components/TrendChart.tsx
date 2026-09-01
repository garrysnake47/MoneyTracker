'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { inr, inrCompact } from '@/lib/format';
import { useWidth } from '@/lib/useWidth';
import { CREDIT, INK } from '@/lib/palette';

export interface TrendPoint {
  month: string;
  label: string;
  spend: number;
  income: number;
}

/** Grouped bars: money in vs spend across the last 6 months. */
export default function TrendChart({ data }: { data: TrendPoint[] }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const height = 240;

  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {width > 0 && (
        <BarChart width={width} height={height} data={data} barGap={4} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'rgb(var(--muted))', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => inrCompact(v)} tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            cursor={{ fill: 'rgb(var(--surface-2))', radius: 12 }}
            formatter={(value: number, name: string) => [inr(value), name === 'income' ? 'Money in' : 'Spend']}
            contentStyle={{ background: 'rgb(var(--ink))', border: 'none', borderRadius: 14, color: '#fff', fontSize: 12, boxShadow: '0 14px 30px -16px rgb(26 28 31 / 0.6)' }}
            itemStyle={{ color: '#fff' }}
            labelStyle={{ color: 'rgba(255,255,255,0.65)' }}
          />
          <Legend
            formatter={(v) => (v === 'income' ? 'Money in' : 'Spend')}
            wrapperStyle={{ fontSize: 12 }}
            iconType="circle"
          />
          <Bar dataKey="income" fill={CREDIT} radius={[8, 8, 8, 8]} maxBarSize={20} />
          <Bar dataKey="spend" fill={INK} radius={[8, 8, 8, 8]} maxBarSize={20} />
        </BarChart>
      )}
    </div>
  );
}
