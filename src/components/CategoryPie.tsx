'use client';

import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { inr } from '@/lib/format';
import { PALETTE } from '@/lib/palette';

export interface PieItem {
  categoryId: number | null;
  categoryName: string;
  amount: number;
}

export { PALETTE };

export function colorFor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

/** Donut chart of spend by category with a custom legend showing amount + %. */
export default function CategoryPie({ items }: { items: PieItem[] }) {
  const total = items.reduce((s, i) => s + i.amount, 0);
  if (items.length === 0 || total === 0) {
    return <p className="text-sm text-muted">No expenses to chart this month.</p>;
  }

  const data = items.map((it, i) => ({ ...it, color: colorFor(i) }));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
      {/* Donut — left; labels to the right */}
      <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
        <PieChart width={200} height={200}>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="categoryName"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.categoryName} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [inr(value), name]}
            contentStyle={{
              background: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border))',
              borderRadius: 12,
              color: 'rgb(var(--text))',
              fontSize: 12,
            }}
          />
        </PieChart>
        {/* Center total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[10px] uppercase tracking-wide text-muted">Total</div>
          <div className="text-base font-semibold tabular">{inr(total)}</div>
        </div>
      </div>

      {/* Labels — to the right of the donut (no percentages) */}
      <ul className="flex-1 min-w-0 w-full space-y-2.5">
        {data.map((d) => (
          <li key={d.categoryName} className="flex items-center gap-3 text-sm">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="flex-1 truncate">{d.categoryName}</span>
            <span className="text-right tabular font-medium">{inr(d.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
