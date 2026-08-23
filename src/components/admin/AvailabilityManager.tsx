'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Plus, Trash2, CheckCircle2, CalendarPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { AvailabilitySlot } from '@/types/db';
import { combineDateTimeLocal, formatDate, formatTime } from './lib/format';
import { badgeCls, btnDanger, btnGhost, btnPrimary, btnSecondary, inputCls, labelCls, tableWrapCls, tdCls, thCls } from './lib/ui';

const WEEKDAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const DURATION_OPTIONS = [30, 45, 60, 90, 120, 180];

interface DraftSlot {
  start_time: string;
  end_time: string;
}

// Builds one slot per `durationMinutes` block, back-to-back, for every date
// in [startDate, endDate] that falls on one of `daysOfWeek`, within the
// given daily time window. Dates are parsed as local time so the generated
// slots land on the calendar day the admin actually picked.
function generateBulkSlots({
  startDate,
  endDate,
  daysOfWeek,
  dayStartTime,
  dayEndTime,
  durationMinutes,
}: {
  startDate: string;
  endDate: string;
  daysOfWeek: Set<number>;
  dayStartTime: string;
  dayEndTime: string;
  durationMinutes: number;
}): DraftSlot[] {
  const drafts: DraftSlot[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const last = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return drafts;

  while (cursor <= last) {
    if (daysOfWeek.has(cursor.getDay())) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      let slotStart = combineDateTimeLocal(dateStr, dayStartTime);
      const windowEnd = combineDateTimeLocal(dateStr, dayEndTime);
      while (true) {
        const slotEnd = new Date(new Date(slotStart).getTime() + durationMinutes * 60000).toISOString();
        if (new Date(slotEnd) > new Date(windowEnd)) break;
        drafts.push({ start_time: slotStart, end_time: slotEnd });
        slotStart = slotEnd;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return drafts;
}

export default function AvailabilityManager({
  locationId,
  initialSlots,
  bookedSlotIds = new Set(),
}: {
  locationId: string;
  initialSlots: AvailabilitySlot[];
  bookedSlotIds?: Set<string>;
}) {
  const [slots, setSlots] = useState(initialSlots);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkDays, setBulkDays] = useState<Set<number>>(new Set());
  const [bulkDayStart, setBulkDayStart] = useState('10:00');
  const [bulkDayEnd, setBulkDayEnd] = useState('17:00');
  const [bulkDuration, setBulkDuration] = useState(60);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const existingStartTimes = useMemo(() => new Set(slots.map((s) => s.start_time)), [slots]);

  const bulkPreview = useMemo(() => {
    if (!bulkStartDate || !bulkEndDate || bulkDays.size === 0) return [];
    return generateBulkSlots({
      startDate: bulkStartDate,
      endDate: bulkEndDate,
      daysOfWeek: bulkDays,
      dayStartTime: bulkDayStart,
      dayEndTime: bulkDayEnd,
      durationMinutes: bulkDuration,
    }).filter((d) => !existingStartTimes.has(d.start_time));
  }, [bulkStartDate, bulkEndDate, bulkDays, bulkDayStart, bulkDayEnd, bulkDuration, existingStartTimes]);

  function toggleBulkDay(day: number) {
    setBulkDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  async function handleBulkGenerate() {
    setBulkError(null);
    setBulkResult(null);
    if (!bulkStartDate || !bulkEndDate) {
      setBulkError('Pick a start and end date.');
      return;
    }
    if (new Date(bulkEndDate) < new Date(bulkStartDate)) {
      setBulkError('End date must be on or after the start date.');
      return;
    }
    if (bulkDays.size === 0) {
      setBulkError('Pick at least one day of the week.');
      return;
    }
    if (bulkPreview.length === 0) {
      setBulkError('No new slots to add — everything in that range already exists.');
      return;
    }
    setBulkSaving(true);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from('availability_slots')
      .insert(bulkPreview.map((d) => ({ location_id: locationId, ...d })))
      .select('*');
    setBulkSaving(false);
    if (insertError) {
      setBulkError(insertError.message);
      return;
    }
    const inserted = data ?? [];
    setSlots((prev) => [...prev, ...inserted].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    setBulkResult(`Added ${inserted.length} slot${inserted.length === 1 ? '' : 's'}.`);
    router.refresh();
  }

  const grouped = useMemo(() => {
    const by: Record<string, AvailabilitySlot[]> = {};
    for (const s of slots) {
      const day = new Date(s.start_time).toDateString();
      (by[day] ||= []).push(s);
    }
    return Object.entries(by).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
  }, [slots]);

  async function handleAdd() {
    if (!date || !startTime || !endTime) {
      setError('Date, start time, and end time are all required.');
      return;
    }
    const start_time = combineDateTimeLocal(date, startTime);
    const end_time = combineDateTimeLocal(date, endTime);
    if (new Date(end_time) <= new Date(start_time)) {
      setError('End time must be after start time.');
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from('availability_slots')
      .insert({ location_id: locationId, start_time, end_time })
      .select('*')
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to add slot.');
      return;
    }
    setSlots((prev) => [...prev, data].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    router.refresh();
  }

  async function handleToggleBlock(slot: AvailabilitySlot) {
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from('availability_slots')
      .update({ is_blocked: !slot.is_blocked })
      .eq('id', slot.id)
      .select('*')
      .single();
    if (!updateError && data) {
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? data : s)));
      router.refresh();
    }
  }

  async function handleDelete(id: string, booked: boolean) {
    const message = booked
      ? "This slot has a booking on it. Deleting it will NOT cancel the booking or refund the client — it just removes the time slot record. Delete anyway?"
      : 'Delete this slot?';
    if (!confirm(message)) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('availability_slots').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setSlots((prev) => prev.filter((s) => s.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Add a slot</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Start time</label>
            <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>End time</label>
            <input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>
        <button className={`${btnPrimary} mt-3`} disabled={saving} onClick={handleAdd}>
          <Plus className="h-4 w-4" /> {saving ? 'Adding…' : 'Add slot'}
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setBulkOpen((v) => !v)}
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <CalendarPlus className="h-4 w-4" /> Add multiple slots at once
          </h3>
          <span className="text-xs font-medium text-gray-500">{bulkOpen ? 'Hide' : 'Show'}</span>
        </button>

        {bulkOpen && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-gray-500">
              Generate every slot in a date range, on the days of the week you pick, split into
              back-to-back blocks — e.g. every Saturday &amp; Sunday from Sep 1 to Oct 31, 10am–6pm,
              in 1-hour blocks.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Start date</label>
                <input type="date" className={inputCls} value={bulkStartDate} onChange={(e) => setBulkStartDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>End date</label>
                <input type="date" className={inputCls} value={bulkEndDate} onChange={(e) => setBulkEndDate(e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Days of the week</label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => toggleBulkDay(w.value)}
                    className={
                      bulkDays.has(w.value)
                        ? 'rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white'
                        : 'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50'
                    }
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Daily start time</label>
                <input type="time" className={inputCls} value={bulkDayStart} onChange={(e) => setBulkDayStart(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Daily end time</label>
                <input type="time" className={inputCls} value={bulkDayEnd} onChange={(e) => setBulkDayEnd(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Slot length</label>
                <select
                  className={inputCls}
                  value={bulkDuration}
                  onChange={(e) => setBulkDuration(Number(e.target.value))}
                >
                  {DURATION_OPTIONS.map((mins) => (
                    <option key={mins} value={mins}>
                      {mins >= 60 ? `${mins / 60}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins} min`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {bulkError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{bulkError}</p>}
            {bulkResult && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{bulkResult}</p>}

            <div className="flex items-center gap-3">
              <button className={btnPrimary} disabled={bulkSaving || bulkPreview.length === 0} onClick={handleBulkGenerate}>
                <CalendarPlus className="h-4 w-4" />
                {bulkSaving ? 'Adding…' : `Add ${bulkPreview.length} slot${bulkPreview.length === 1 ? '' : 's'}`}
              </button>
              <button className={btnSecondary} onClick={() => setBulkOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={tableWrapCls}>
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className={thCls}>Date</th>
              <th className={thCls}>Time</th>
              <th className={thCls}>Status</th>
              <th className={thCls}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grouped.flatMap(([day, daySlots]) =>
              daySlots.map((s, i) => {
                const booked = bookedSlotIds.has(s.id);
                return (
                  <tr key={s.id}>
                    <td className={tdCls}>{i === 0 ? formatDate(s.start_time) : ''}</td>
                    <td className={tdCls}>
                      {formatTime(s.start_time)} – {formatTime(s.end_time)}
                    </td>
                    <td className={tdCls}>
                      {booked ? (
                        <span className={badgeCls('blue')} title="A client has already booked or is checking out for this slot.">
                          Booked
                        </span>
                      ) : (
                        <button onClick={() => handleToggleBlock(s)}>
                          <span className={badgeCls(s.is_blocked ? 'red' : 'green')}>
                            {s.is_blocked ? 'Blocked' : 'Open'}
                          </span>
                        </button>
                      )}
                    </td>
                    <td className={tdCls}>
                      <div className="flex justify-end gap-1">
                        <button
                          className={btnGhost}
                          onClick={() => handleToggleBlock(s)}
                          disabled={booked}
                          title={booked ? 'Already booked — cannot block' : s.is_blocked ? 'Unblock' : 'Block'}
                        >
                          {s.is_blocked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          className={btnDanger}
                          onClick={() => handleDelete(s.id, booked)}
                          title={booked ? 'Already booked — deleting will not cancel the booking' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            {slots.length === 0 && (
              <tr>
                <td className={tdCls} colSpan={4}>
                  No availability slots yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
