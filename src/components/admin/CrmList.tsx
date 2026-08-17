'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Search } from 'lucide-react';
import { formatCents, formatDate } from './lib/format';
import { btnSecondary, inputCls, selectCls, tableWrapCls, tdCls, thCls } from './lib/ui';

export interface ClientRow {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  sessionTypes: string[];
  lastDate: string | null;
  lifetimeCents: number;
  bookingCount: number;
}

function toCsv(rows: ClientRow[]): string {
  const header = ['Name', 'Email', 'Phone', 'Session types', 'Most recent date', 'Lifetime paid ($)', 'Bookings'];
  const lines = rows.map((r) =>
    [
      r.name ?? '',
      r.email,
      r.phone ?? '',
      r.sessionTypes.join('; '),
      r.lastDate ? new Date(r.lastDate).toISOString().slice(0, 10) : '',
      (r.lifetimeCents / 100).toFixed(2),
      String(r.bookingCount),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

export default function CrmList({ rows }: { rows: ClientRow[] }) {
  const [query, setQuery] = useState('');
  const [sessionType, setSessionType] = useState('');

  const allSessionTypes = useMemo(() => Array.from(new Set(rows.flatMap((r) => r.sessionTypes))).sort(), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => !q || r.name?.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
      .filter((r) => !sessionType || r.sessionTypes.includes(sessionType))
      .sort((a, b) => b.lifetimeCents - a.lifetimeCents);
  }, [rows, query, sessionType]);

  function handleExport() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dopa-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className={`${inputCls} pl-9`}
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className={selectCls + ' w-48'} value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
          <option value="">All session types</option>
          {allSessionTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button className={btnSecondary} onClick={handleExport}>
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className={tableWrapCls}>
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className={thCls}>Client</th>
              <th className={thCls}>Contact</th>
              <th className={thCls}>Session type(s)</th>
              <th className={thCls}>Most recent</th>
              <th className={thCls}>Lifetime paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className={tdCls}>
                  <Link href={`/admin/crm/${r.id}`} className="font-medium text-gray-900 hover:underline">
                    {r.name || r.email}
                  </Link>
                </td>
                <td className={tdCls}>
                  <div>{r.email}</div>
                  {r.phone && <div className="text-xs text-gray-500">{r.phone}</div>}
                </td>
                <td className={tdCls}>
                  <div className="max-w-[220px] truncate">{r.sessionTypes.join(', ') || '—'}</div>
                </td>
                <td className={tdCls}>{formatDate(r.lastDate)}</td>
                <td className={tdCls}>{formatCents(r.lifetimeCents)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className={tdCls} colSpan={5}>
                  No clients match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
