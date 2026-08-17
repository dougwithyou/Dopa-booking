'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AvailabilitySlot, LandingPage, Location, PaymentMethod } from '@/types/db';
import { dollarsInputToCents, formatDate, formatTime } from './lib/format';
import { landingPageLabel } from './lib/data';
import { btnPrimary, btnSecondary, cardCls, inputCls, labelCls, selectCls } from './lib/ui';

export default function BookingForm({
  studioId,
  locations,
  landingPages,
}: {
  studioId: string;
  locations: Location[];
  landingPages: LandingPage[];
}) {
  const [locationId, setLocationId] = useState('');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotId, setSlotId] = useState('');
  const [landingPageId, setLandingPageId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'cancelled'>('confirmed');
  const [markPaid, setMarkPaid] = useState(true);
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!locationId) {
      setSlots([]);
      setSlotId('');
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    (async () => {
      const supabase = createClient();
      const [{ data: allSlots }, { data: taken }] = await Promise.all([
        supabase
          .from('availability_slots')
          .select('*')
          .eq('location_id', locationId)
          .eq('is_blocked', false)
          .order('start_time', { ascending: true }),
        supabase.from('bookings').select('slot_id').eq('location_id', locationId).in('status', ['pending', 'confirmed']),
      ]);
      if (cancelled) return;
      const takenIds = new Set((taken ?? []).map((b) => b.slot_id).filter(Boolean));
      setSlots((allSlots ?? []).filter((s) => !takenIds.has(s.id)));
      setLoadingSlots(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientEmail.trim()) {
      setError('Client email is required.');
      return;
    }
    setSaving(true);
    setError(null);

    const supabase = createClient();

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .upsert(
        {
          studio_id: studioId,
          email: clientEmail.trim().toLowerCase(),
          name: clientName.trim() || null,
          phone: clientPhone.trim() || null,
        },
        { onConflict: 'studio_id,email' }
      )
      .select('*')
      .single();

    if (clientError || !client) {
      setSaving(false);
      setError(clientError?.message ?? 'Failed to save client.');
      return;
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        studio_id: studioId,
        landing_page_id: landingPageId || null,
        location_id: locationId || null,
        slot_id: slotId || null,
        client_id: client.id,
        status,
        amount_cents: dollarsInputToCents(amount || '0'),
        currency: 'usd',
        payment_method: paymentMethod,
        paid_at: markPaid ? new Date().toISOString() : null,
        admin_note: adminNote.trim() || null,
        created_by_admin: true,
      })
      .select('id')
      .single();

    setSaving(false);
    if (bookingError || !booking) {
      setError(bookingError?.message ?? 'Failed to create booking.');
      return;
    }

    router.push('/admin/calendar');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={`${cardCls} max-w-2xl space-y-5`}>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Location</label>
          <select className={selectCls} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Select a location…</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Session type (optional)</label>
          <select className={selectCls} value={landingPageId} onChange={(e) => setLandingPageId(e.target.value)}>
            <option value="">Unassigned</option>
            {landingPages.map((lp) => (
              <option key={lp.id} value={lp.id}>
                {landingPageLabel(lp)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Time slot</label>
        <select className={selectCls} value={slotId} onChange={(e) => setSlotId(e.target.value)} disabled={!locationId}>
          <option value="">{loadingSlots ? 'Loading…' : 'No slot / custom'}</option>
          {slots.map((s) => (
            <option key={s.id} value={s.id}>
              {formatDate(s.start_time)} · {formatTime(s.start_time)}–{formatTime(s.end_time)}
            </option>
          ))}
        </select>
        {locationId && !loadingSlots && slots.length === 0 && (
          <p className="mt-1 text-xs text-gray-500">No open slots at this location. Add one under Locations → Availability.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Client name</label>
          <input className={inputCls} value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Client email</label>
          <input type="email" required className={inputCls} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Client phone</label>
          <input className={inputCls} value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls}>Amount (USD)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputCls}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className={labelCls}>Payment method</label>
          <select className={selectCls} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
            <option value="stripe">Stripe (already paid)</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} />
        Mark as paid now
      </label>

      <div>
        <label className={labelCls}>Admin note</label>
        <input className={inputCls} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="e.g. booked via WhatsApp" />
      </div>

      <div className="flex gap-2">
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? 'Saving…' : 'Create booking'}
        </button>
        <button type="button" className={btnSecondary} onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
