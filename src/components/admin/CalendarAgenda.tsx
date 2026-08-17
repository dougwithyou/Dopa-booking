'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { EnrichedBooking } from './lib/data';
import { formatCents, formatDate, formatTime } from './lib/format';
import { badgeCls, cardCls } from './lib/ui';

function bookingDate(b: EnrichedBooking): string {
  return b.slot?.start_time ?? b.created_at;
}

export default function CalendarAgenda({ bookings }: { bookings: EnrichedBooking[] }) {
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');

  const grouped = useMemo(() => {
    const now = Date.now();
    const filtered = filter === 'upcoming' ? bookings.filter((b) => new Date(bookingDate(b)).getTime() >= now) : bookings;
    const sorted = [...filtered].sort((a, b) => new Date(bookingDate(a)).getTime() - new Date(bookingDate(b)).getTime());

    const by: Record<string, EnrichedBooking[]> = {};
    for (const b of sorted) {
      const day = new Date(bookingDate(b)).toDateString();
      (by[day] ||= []).push(b);
    }
    return Object.entries(by);
  }, [bookings, filter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('upcoming')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            filter === 'upcoming' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-300'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            filter === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-300'
          }`}
        >
          All
        </button>
      </div>

      {grouped.length === 0 && (
        <div className={cardCls}>
          <p className="text-sm text-gray-500">No sessions to show.</p>
        </div>
      )}

      <div className="space-y-4">
        {grouped.map(([day, dayBookings]) => (
          <div key={day} className={cardCls}>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{formatDate(dayBookings[0] && bookingDate(dayBookings[0]))}</h3>
            <ul className="divide-y divide-gray-100">
              {dayBookings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/admin/bookings/${b.id}/edit`} className="text-sm font-medium text-gray-900 hover:underline">
                      {b.client?.name || b.client?.email || 'No client'}
                    </Link>
                    <div className="text-xs text-gray-500">
                      {b.slot ? formatTime(b.slot.start_time) : 'No slot'} · {b.location?.name || 'No location'} ·{' '}
                      {b.landing_page?.headline_en?.trim() || b.landing_page?.slug || 'Unassigned'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={badgeCls(b.status === 'confirmed' ? 'green' : b.status === 'pending' ? 'amber' : 'gray')}>
                      {b.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{formatCents(b.amount_cents, b.currency)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
