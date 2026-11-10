'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Location, PublicSlot } from '@/types/db';
import { formatDate, formatTime } from './lib/format';
import { btnPrimary, btnSecondary, cardCls, inputCls, labelCls, selectCls } from './lib/ui';

const ERRORS: Record<string, string> = {
  slot_unavailable: 'That time is already taken or blocked — choose another.',
  booking_cancelled: 'This booking is cancelled.',
  unauthorized: 'Your session expired — sign in again.',
};

/**
 * Move a booking to another time: a free slot from any location, or a
 * custom time (Eastern) that gets its own slot even outside the hours you
 * opened. The previous time goes back on sale.
 */
export default function RescheduleCard({
  bookingId,
  locations,
  currentLocationId,
  clientEmail,
}: {
  bookingId: string;
  locations: Location[];
  currentLocationId: string | null;
  clientEmail: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'slot' | 'custom'>('slot');
  const [locationId, setLocationId] = useState(currentLocationId ?? locations[0]?.id ?? '');
  const [slots, setSlots] = useState<PublicSlot[] | null>(null);
  const [slotId, setSlotId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState('45');
  const [notify, setNotify] = useState(Boolean(clientEmail));
  const [locale, setLocale] = useState<'es' | 'en'>('es');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!open || mode !== 'slot' || !locationId) return;
    let cancelled = false;
    setSlots(null);
    setSlotId('');
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 180);
    createClient()
      .rpc('public_slot_availability', {
        p_location_id: locationId,
        p_from: new Date().toISOString(),
        p_to: horizon.toISOString(),
      })
      .then(({ data }) => {
        if (!cancelled) setSlots(((data as PublicSlot[] | null) ?? []).filter((s) => s.available));
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, locationId]);

  async function submit() {
    setError(null);
    setDone(null);
    if (mode === 'slot' && !slotId) return setError('Choose a time slot.');
    if (mode === 'custom' && (!locationId || !date || !time)) return setError('Choose location, date and time.');
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(mode === 'slot'
            ? { slotId }
            : { custom: { locationId, date, time, durationMinutes: Math.max(10, parseInt(duration, 10) || 45) } }),
          notify,
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(ERRORS[data.error] ?? 'Could not move the booking. Try again.');
        return;
      }
      setOpen(false);
      setDone(`Booking moved.${data.emailed ? ` The client was emailed the new time.` : ''}`);
      router.refresh();
    } catch {
      setError('Network error — try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${cardCls} max-w-2xl space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Change date &amp; time</h2>
          <p className="text-xs text-gray-500">Times are Eastern (Washington, DC). The old time goes back on sale.</p>
        </div>
        {!open && (
          <button type="button" className={btnSecondary} onClick={() => setOpen(true)}>
            <CalendarClock className="h-4 w-4" /> Reschedule
          </button>
        )}
      </div>
      {done && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{done}</p>}

      {open && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['slot', 'custom'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  mode === m ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600'
                }`}
              >
                {m === 'slot' ? 'Open time slot' : 'Custom time'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Location</label>
              <select className={selectCls} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            {mode === 'slot' ? (
              <div>
                <label className={labelCls}>Free time slot</label>
                <select className={selectCls} value={slotId} onChange={(e) => setSlotId(e.target.value)} disabled={!slots}>
                  <option value="">{slots === null ? 'Loading…' : slots.length ? 'Choose a time…' : 'No free slots'}</option>
                  {(slots ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatDate(s.start_time)} · {formatTime(s.start_time)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3 sm:col-span-1">
                  <label className={labelCls}>Date</label>
                  <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Start (ET)</label>
                  <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Minutes</label>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    className={inputCls}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-gray-800">
              <input type="checkbox" checked={notify} disabled={!clientEmail} onChange={(e) => setNotify(e.target.checked)} />
              Email the client the new time {clientEmail ? `(${clientEmail})` : '(no email on file)'}
            </label>
            {notify && (
              <select className={`${selectCls} w-auto`} value={locale} onChange={(e) => setLocale(e.target.value as 'es' | 'en')}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            )}
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} disabled={saving} onClick={submit}>
              {saving ? 'Moving…' : 'Move booking'}
            </button>
            <button type="button" className={btnSecondary} disabled={saving} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
