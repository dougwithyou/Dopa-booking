'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { dateKey, formatTimeLabel } from '@/lib/booking/format';
import { cn } from '@/lib/cn';
import type { AvailabilitySlot } from '@/types/db';

const AVAILABILITY_HORIZON_DAYS = 90;

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
  const dfLocale = locale === 'es' ? es : enUS;
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null);
  const [error, setError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSlots(null);
    setError(false);
    setSelectedDate(null);

    const supabase = createClient();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + AVAILABILITY_HORIZON_DAYS);

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

  // Jump the visible month to the first day that actually has openings, once
  // slots have loaded — otherwise an admin who only opened up next month
  // would land on an empty grid with no obvious way to know where to look.
  useEffect(() => {
    if (dateKeys.length > 0) {
      const first = byDate.get(dateKeys[0])![0];
      setViewMonth(startOfMonth(new Date(first.start_time)));
    }
  }, [dateKeys, byDate]);

  useEffect(() => {
    if (!selectedDate && dateKeys.length > 0) {
      setSelectedDate(dateKeys[0]);
    }
  }, [dateKeys, selectedDate]);

  const today = startOfDay(new Date());
  const horizonEnd = startOfDay(addDays(today, AVAILABILITY_HORIZON_DAYS));

  const weekdayLabels = useMemo(() => {
    const start = startOfWeek(new Date(), { locale: dfLocale });
    return eachDayOfInterval({ start, end: endOfWeek(new Date(), { locale: dfLocale }) }).map((d) =>
      format(d, 'EEE', { locale: dfLocale })
    );
  }, [dfLocale]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { locale: dfLocale });
    const end = endOfWeek(endOfMonth(viewMonth), { locale: dfLocale });
    return eachDayOfInterval({ start, end });
  }, [viewMonth, dfLocale]);

  const canGoPrev = isAfter(startOfMonth(viewMonth), startOfMonth(today));
  const canGoNext = isBefore(startOfMonth(viewMonth), startOfMonth(horizonEnd));
  const monthHasOpenings = calendarDays.some((d) => isSameMonth(d, viewMonth) && byDate.has(format(d, 'yyyy-MM-dd')));

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
        <div className="space-y-8">
          <div>
            <div className="mb-3 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">
              {t('selectDate')}
            </div>

            <div className="max-w-sm">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => addMonths(m, -1))}
                  disabled={!canGoPrev}
                  aria-label="Previous month"
                  className="flex h-8 w-8 items-center justify-center border border-ink/15 text-ink transition-colors hover:border-ink/40 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ‹
                </button>
                <div className="font-display text-sm font-black uppercase tracking-wide text-ink">
                  {format(viewMonth, 'MMMM yyyy', { locale: dfLocale })}
                </div>
                <button
                  type="button"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                  disabled={!canGoNext}
                  aria-label="Next month"
                  className="flex h-8 w-8 items-center justify-center border border-ink/15 text-ink transition-colors hover:border-ink/40 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {weekdayLabels.map((w, i) => (
                  <div key={i} className="py-1 font-body text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                    {w}
                  </div>
                ))}
                {calendarDays.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const inMonth = isSameMonth(day, viewMonth);
                  const hasSlots = inMonth && byDate.has(key);
                  const isPast = isBefore(day, today);
                  const isSelected = key === selectedDate;
                  const disabled = !hasSlots || isPast;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedDate(key)}
                      className={cn(
                        'relative aspect-square rounded-sm font-body text-sm transition-colors',
                        !inMonth && 'text-transparent',
                        inMonth && disabled && 'text-ink/25',
                        inMonth && !disabled && !isSelected && 'text-ink hover:bg-ink/[0.06]',
                        isSelected && 'bg-clay text-parchment'
                      )}
                    >
                      {format(day, 'd')}
                      {hasSlots && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-clay" />
                      )}
                    </button>
                  );
                })}
              </div>

              {!monthHasOpenings && (
                <p className="mt-3 font-body text-xs text-ink/50">
                  {locale === 'es' ? 'Sin horarios este mes — prueba otro mes.' : 'No openings this month — try another month.'}
                </p>
              )}
            </div>
          </div>

          {selectedDate && byDate.has(selectedDate) && (
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
