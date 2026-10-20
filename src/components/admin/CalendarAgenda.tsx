'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { EnrichedBooking } from './lib/data';
import { formatTime } from './lib/format';
import { cardCls } from './lib/ui';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function bookingDate(b: EnrichedBooking): Date {
  return new Date(b.slot?.start_time ?? b.created_at);
}

/** Local-calendar day key, e.g. "2026-10-20". */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function groupByDay(bookings: EnrichedBooking[]): Map<string, EnrichedBooking[]> {
  const sorted = [...bookings].sort((a, b) => bookingDate(a).getTime() - bookingDate(b).getTime());
  const map = new Map<string, EnrichedBooking[]>();
  for (const b of sorted) {
    const key = dayKey(bookingDate(b));
    map.set(key, [...(map.get(key) ?? []), b]);
  }
  return map;
}

/** One session as a pill: time on the left, client on the right. */
function SessionPill({ booking }: { booking: EnrichedBooking }) {
  const pending = booking.status === 'pending';
  return (
    <Link
      href={`/admin/bookings/${booking.id}/edit`}
      className={`flex items-center justify-between gap-3 rounded-full px-4 py-2.5 text-sm transition ${
        pending
          ? 'border border-dashed border-gray-400 bg-white text-gray-700 hover:border-gray-900'
          : 'bg-gray-900 text-white hover:bg-gray-700'
      }`}
      title={[booking.location?.name, booking.landing_page?.headline_en?.trim() || booking.landing_page?.slug, booking.status]
        .filter(Boolean)
        .join(' · ')}
    >
      <span className="font-semibold tabular-nums">{booking.slot ? formatTime(booking.slot.start_time) : 'No time'}</span>
      <span className="min-w-0 truncate">
        {booking.client?.name || booking.client?.email || 'No client'}
        {pending && <span className="ml-1.5 text-xs text-gray-500">(pending)</span>}
      </span>
    </Link>
  );
}

/** A day's sessions: big day number + weekday on the left, pills on the right. */
function DayGroup({ date, bookings }: { date: Date; bookings: EnrichedBooking[] }) {
  return (
    <div className="flex gap-4">
      <div className="w-12 shrink-0 border-r border-gray-200 pr-3 text-center">
        <div className="text-2xl font-bold leading-tight text-gray-900">{date.getDate()}</div>
        <div className="text-xs uppercase tracking-wide text-gray-500">
          {date.toLocaleDateString('en-US', { weekday: 'short' })}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {bookings.map((b) => (
          <SessionPill key={b.id} booking={b} />
        ))}
      </div>
    </div>
  );
}

export default function CalendarAgenda({ bookings }: { bookings: EnrichedBooking[] }) {
  const [view, setView] = useState<'upcoming' | 'month'>('upcoming');
  const today = startOfToday();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(dayKey(today));

  const byDay = useMemo(() => groupByDay(bookings), [bookings]);

  const upcoming = useMemo(() => {
    const todayKey = dayKey(startOfToday());
    return [...byDay.entries()].filter(([key]) => key >= todayKey);
  }, [byDay]);

  // Month grid: leading blanks for the first weekday, then each day.
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: first.getDay() }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
    ];
  }, [month]);

  const selectedBookings = selectedDay ? byDay.get(selectedDay) ?? [] : [];
  const tabCls = (active: boolean) =>
    `flex-1 rounded-full py-2.5 text-sm font-medium transition ${
      active ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-400'
    }`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex gap-3">
        <button type="button" onClick={() => setView('upcoming')} className={tabCls(view === 'upcoming')}>
          Upcoming
        </button>
        <button type="button" onClick={() => setView('month')} className={tabCls(view === 'month')}>
          Month
        </button>
      </div>

      <Link
        href="/admin/bookings/new"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-700"
      >
        <Plus className="h-4 w-4" /> Add session
      </Link>

      {view === 'upcoming' ? (
        <>
          <h2 className="pt-2 text-center text-base font-semibold text-gray-900">Upcoming sessions</h2>
          <div className={`${cardCls} space-y-5 rounded-2xl p-5`}>
            {upcoming.length === 0 ? (
              <p className="text-center text-sm text-gray-500">No upcoming sessions.</p>
            ) : (
              upcoming.map(([key, dayBookings]) => (
                <DayGroup key={key} date={bookingDate(dayBookings[0])} bookings={dayBookings} />
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="min-w-[10rem] text-center text-base font-semibold text-gray-900">
              {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className={`${cardCls} rounded-2xl p-3 sm:p-4`}>
            <div className="mb-2 grid grid-cols-7 text-center text-xs text-gray-500">
              {WEEKDAYS.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((date, i) => {
                if (!date) return <div key={`blank-${i}`} />;
                const key = dayKey(date);
                const count = byDay.get(key)?.length ?? 0;
                const past = date < today;
                const isToday = key === dayKey(today);
                const selected = key === selectedDay;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(key)}
                    className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border text-sm transition ${
                      selected
                        ? 'border-gray-900 ring-1 ring-gray-900'
                        : isToday
                          ? 'border-gray-400'
                          : 'border-gray-100'
                    } ${past ? 'bg-gray-50 text-gray-400' : 'bg-white font-semibold text-gray-900 hover:border-gray-400'}`}
                  >
                    <span>{date.getDate()}</span>
                    {count > 0 && (
                      <span
                        className={`max-w-full truncate rounded-full px-1.5 text-[10px] leading-4 ${
                          past ? 'bg-gray-200 text-gray-600' : 'bg-gray-900 text-white'
                        }`}
                      >
                        <span className="sm:hidden">{count}</span>
                        <span className="hidden sm:inline">
                          {count} {count === 1 ? 'session' : 'sessions'}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDay && (
            <div className={`${cardCls} rounded-2xl p-5`}>
              {selectedBookings.length === 0 ? (
                <p className="text-center text-sm text-gray-500">
                  No sessions on{' '}
                  {new Date(`${selectedDay}T00:00:00`).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                  .
                </p>
              ) : (
                <DayGroup date={bookingDate(selectedBookings[0])} bookings={selectedBookings} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
