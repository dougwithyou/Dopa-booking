import Link from 'next/link';
import type { FunnelRow, LandingPage } from '@/types/db';
import { landingPageLabel } from './lib/data';
import { cardCls, tableWrapCls, tdCls, thCls } from './lib/ui';

export const FUNNEL_RANGES = [
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
  { key: 'all', label: 'All time', days: null },
] as const;

function pct(part: number, whole: number): string {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '—';
}

/**
 * Booking funnel: unique visitors → clicked "Book now" → started checkout
 * (entered their details) → booked, per landing page and in total.
 */
export default function FunnelCard({
  rows,
  landingPages,
  range,
}: {
  rows: FunnelRow[];
  landingPages: LandingPage[];
  range: string;
}) {
  const byId = new Map(landingPages.map((lp) => [lp.id, lp]));
  const visible = rows.filter((r) => Number(r.views) + Number(r.book_clicks) + Number(r.bookings) > 0);
  const total = rows.reduce(
    (t, r) => ({
      views: t.views + Number(r.views),
      visitors: t.visitors + Number(r.unique_visitors),
      clicks: t.clicks + Number(r.book_clicks),
      clickers: t.clickers + Number(r.unique_clickers),
      checkouts: t.checkouts + Number(r.checkouts_started),
      bookings: t.bookings + Number(r.bookings),
    }),
    { views: 0, visitors: 0, clicks: 0, clickers: 0, checkouts: 0, bookings: 0 }
  );

  const steps = [
    { label: 'Visitors', value: total.visitors, sub: `${total.views} page views` },
    { label: 'Clicked “Book now”', value: total.clickers, sub: `${pct(total.clickers, total.visitors)} of visitors` },
    { label: 'Started checkout', value: total.checkouts, sub: `${pct(total.checkouts, total.clickers)} of clickers` },
    { label: 'Booked', value: total.bookings, sub: `${pct(total.bookings, total.visitors)} of visitors` },
  ];

  return (
    <div className={`${cardCls} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Booking funnel</h2>
          <p className="text-xs text-gray-500">
            Unique visitors and “Book now” clicks are counted per browser. Tracking started Oct 23, 2026.
          </p>
        </div>
        <div className="flex gap-1">
          {FUNNEL_RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin/stats?range=${r.key}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                r.key === range ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.label} className="rounded-md border border-gray-200 p-3">
            <div className="text-xs text-gray-500">
              {i + 1}. {s.label}
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.sub}</div>
          </div>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-gray-500">No activity in this period yet.</p>
      ) : (
        <div className={tableWrapCls}>
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className={thCls}>Page</th>
                <th className={thCls}>Visitors</th>
                <th className={thCls}>Views</th>
                <th className={thCls}>Book now</th>
                <th className={thCls}>Checkout</th>
                <th className={thCls}>Booked</th>
                <th className={thCls}>Conv.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((r) => (
                <tr key={r.landing_page_id}>
                  <td className={tdCls}>{landingPageLabel(byId.get(r.landing_page_id))}</td>
                  <td className={tdCls}>{Number(r.unique_visitors)}</td>
                  <td className={tdCls}>{Number(r.views)}</td>
                  <td className={tdCls}>
                    {Number(r.unique_clickers)}
                    <span className="text-gray-400"> ({Number(r.book_clicks)})</span>
                  </td>
                  <td className={tdCls}>{Number(r.checkouts_started)}</td>
                  <td className={tdCls}>{Number(r.bookings)}</td>
                  <td className={tdCls}>{pct(Number(r.bookings), Number(r.unique_visitors))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
