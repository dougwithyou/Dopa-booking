'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { AvailabilitySlot } from '@/types/db';
import { combineDateTimeLocal, formatDate, formatTime } from './lib/format';
import { badgeCls, btnDanger, btnGhost, btnPrimary, inputCls, labelCls, tableWrapCls, tdCls, thCls } from './lib/ui';

export default function AvailabilityManager({
  locationId,
  initialSlots,
}: {
  locationId: string;
  initialSlots: AvailabilitySlot[];
}) {
  const [slots, setSlots] = useState(initialSlots);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

  async function handleDelete(id: string) {
    if (!confirm('Delete this slot?')) return;
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
              daySlots.map((s, i) => (
                <tr key={s.id}>
                  <td className={tdCls}>{i === 0 ? formatDate(s.start_time) : ''}</td>
                  <td className={tdCls}>
                    {formatTime(s.start_time)} – {formatTime(s.end_time)}
                  </td>
                  <td className={tdCls}>
                    <button onClick={() => handleToggleBlock(s)}>
                      <span className={badgeCls(s.is_blocked ? 'red' : 'green')}>
                        {s.is_blocked ? 'Blocked' : 'Open'}
                      </span>
                    </button>
                  </td>
                  <td className={tdCls}>
                    <div className="flex justify-end gap-1">
                      <button className={btnGhost} onClick={() => handleToggleBlock(s)} title={s.is_blocked ? 'Unblock' : 'Block'}>
                        {s.is_blocked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                      </button>
                      <button className={btnDanger} onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
