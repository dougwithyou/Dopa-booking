'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RevenuePoint } from '@/components/admin/lib/stats';
import { formatCents, monthLabel } from '@/components/admin/lib/format';

export default function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.month), dollars: d.cents / 100 }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
          width={56}
        />
        <Tooltip
          formatter={(value: number) => formatCents(Math.round(value * 100))}
          contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Bar dataKey="dollars" fill="#111827" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
