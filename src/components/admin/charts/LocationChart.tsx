'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { LocationTotal } from '@/components/admin/lib/stats';

export default function LocationChart({ data }: { data: LocationTotal[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: '#374151' }}
          width={130}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb' }} />
        <Bar dataKey="bookingCount" name="Bookings" fill="#5b6b4d" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
