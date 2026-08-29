'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { inr, inrCompact } from '@/lib/format';
import { useWidth } from '@/lib/useWidth';

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
            cursor={{ fill: 'rgb(var(--surface-2))' }}
            formatter={(value: number, name: string) => [inr(value), name === 'income' ? 'Money in' : 'Spend']}
            contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--border))', borderRadius: 12, color: 'rgb(var(--text))', fontSize: 12 }}
          />
          <Legend
            formatter={(v) => (v === 'income' ? 'Money in' : 'Spend')}
            wrapperStyle={{ fontSize: 12 }}
            iconType="circle"
          />
          <Bar dataKey="income" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={20} />
          <Bar dataKey="spend" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={20} />
        </BarChart>
      )}
    </div>
  );
}
