'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { EnrichedBooking } from './lib/data';
import { landingPageLabel } from './lib/data';
import { formatDateTime } from './lib/format';
import { DEFAULT_CONTRACT_TEMPLATE, renderContractVariables } from '@/lib/contracts/template';
import { btnPrimary, cardCls, inputCls, labelCls, selectCls } from './lib/ui';

export default function NewContractForm({
  studioId,
  studioName,
  bookings,
}: {
  studioId: string;
  studioName: string;
  bookings: EnrichedBooking[];
}) {
  const router = useRouter();
  const [bookingId, setBookingId] = useState('');
  const [title, setTitle] = useState('Photography Services Contract');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookingOptions = useMemo(
    () =>
      bookings
        .filter((b) => b.status !== 'cancelled')
        .map((b) => ({
          id: b.id,
          label: `${b.client?.name || b.client?.email || 'Unknown client'} — ${landingPageLabel(b.landing_page)} — ${
            b.slot ? formatDateTime(b.slot.start_time) : 'no date'
          }`,
        })),
    [bookings]
  );

  async function handleCreate() {
    setSaving(true);
    setError(null);

    const booking = bookings.find((b) => b.id === bookingId) ?? null;
    const content = booking
      ? renderContractVariables(DEFAULT_CONTRACT_TEMPLATE, {
          clientName: booking.client?.name || booking.client?.email,
          studioName,
          amountCents: booking.amount_cents,
          currency: booking.currency,
          sessionDate: booking.slot?.start_time,
          sessionType: landingPageLabel(booking.landing_page),
          location: booking.location?.name,
        })
      : DEFAULT_CONTRACT_TEMPLATE;

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from('contracts')
      .insert({
        studio_id: studioId,
        client_id: booking?.client_id ?? null,
        booking_id: booking?.id ?? null,
        title: title.trim() || 'Photography Services Contract',
        content,
      })
      .select('id')
      .single();

    setSaving(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to create contract.');
      return;
    }
    router.push(`/admin/contracts/${data.id}/edit`);
  }

  return (
    <div className={`${cardCls} max-w-xl space-y-4`}>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div>
        <label className={labelCls}>Title</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div>
        <label className={labelCls}>Pre-fill from a booking (optional)</label>
        <select className={selectCls} value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
          <option value="">— Start from scratch —</option>
          {bookingOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Fills in the client, session type, date, location, and amount using the default template's variables.
        </p>
      </div>

      <button className={btnPrimary} disabled={saving} onClick={handleCreate}>
        {saving ? 'Creating…' : 'Create draft contract'}
      </button>
    </div>
  );
}
