'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { dateKey, formatDateLabel, formatTimeLabel } from '@/lib/booking/format';
import { cn } from '@/lib/cn';
import type { AvailabilitySlot } from '@/types/db';

/**
 * Reads are RLS-scoped to `is_blocked = false`, but holds/bookings aren't
 * publicly readable, so this is a best-effort list: a slot shown here could
 * be taken by someone else a moment later. The hold-creation call in the
 * next step is the real source of truth and returns 409 if that happens.
 */
export function DateTimeStep({
  locationId,
  locale,
  selectedSlotId,
  onSelect,
  onBack,
  refreshToken,
}: {
  locationId: string;
  locale: string;
  selectedSlotId: string | null;
  onSelect: (slot: AvailabilitySlot) => void;
  onBack: () => void;
  refreshToken: number;
}) {
  const t = useTranslations('booking.datetime');
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null);
  const [error, setError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSlots(null);
    setError(false);
    setSelectedDate(null);

    const supabase = createClient();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 90);

    supabase
      .from('availability_slots')
      .select('*')
      .eq('location_id', locationId)
      .eq('is_blocked', false)
      .gt('start_time', new Date().toISOString())
      .lt('start_time', horizon.toISOString())
      .order('start_time', { ascending: true })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(true);
          setSlots([]);
          return;
        }
        setSlots(data ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [locationId, refreshToken, reloadKey]);

  const byDate = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    for (const slot of slots ?? []) {
      const key = dateKey(slot.start_time);
      const bucket = map.get(key);
      if (bucket) bucket.push(slot);
      else map.set(key, [slot]);
    }
    return map;
  }, [slots]);

  const dateKeys = useMemo(() => Array.from(byDate.keys()), [byDate]);

  useEffect(() => {
    if (!selectedDate && dateKeys.length > 0) {
      setSelectedDate(dateKeys[0]);
    }
  }, [dateKeys, selectedDate]);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-black text-ink">{t('heading')}</h1>

      {slots === null ? (
        <p className="font-body text-sm text-ink/60">{t('loading')}</p>
      ) : error ? (
        <div className="font-body text-sm text-ink/70">
          <p className="mb-3">{t('error')}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="border border-ink/30 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] hover:border-ink"
          >
            {t('retry')}
          </button>
        </div>
      ) : slots.length === 0 ? (
        <p className="font-body text-sm text-ink/70">{t('empty')}</p>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="mb-2 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
              {t('selectDate')}
            </div>
            <div className="flex flex-wrap gap-2">
              {dateKeys.map((key) => {
                const first = byDate.get(key)![0];
                const active = key === selectedDate;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={cn(
                      'border px-4 py-2 font-body text-sm transition-colors',
                      active ? 'border-clay bg-clay text-parchment' : 'border-ink/15 text-ink hover:border-ink/35'
                    )}
                  >
                    {formatDateLabel(first.start_time, locale)}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div>
              <div className="mb-2 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
                {t('selectTime')}
              </div>
              <div className="flex flex-wrap gap-2">
                {byDate.get(selectedDate)!.map((slot) => {
                  const active = slot.id === selectedSlotId;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => onSelect(slot)}
                      className={cn(
                        'border px-4 py-2.5 font-body text-sm tabular-nums transition-colors',
                        active ? 'border-clay bg-clay text-parchment' : 'border-ink/15 text-ink hover:border-ink/35'
                      )}
                    >
                      {formatTimeLabel(slot.start_time)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="mt-8 font-body text-xs font-semibold uppercase tracking-[0.14em] text-ink/60 underline-offset-4 hover:text-ink hover:underline"
      >
        ← {t('back')}
      </button>
    </div>
  );
}
