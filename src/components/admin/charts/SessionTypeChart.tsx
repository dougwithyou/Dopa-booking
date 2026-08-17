'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SessionTypeTotal } from '@/components/admin/lib/stats';
import { formatCents } from '@/components/admin/lib/format';

export default function SessionTypeChart({ data }: { data: SessionTypeTotal[] }) {
  const chartData = data.slice(0, 8).map((d) => ({ ...d, dollars: d.totalCents / 100 }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 40)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: '#374151' }}
          width={140}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => formatCents(Math.round(value * 100))}
          contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Bar dataKey="dollars" fill="#9c4a2c" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
