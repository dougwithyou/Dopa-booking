import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { landingPageLabel } from '@/components/admin/lib/data';
import BookingEditForm from '@/components/admin/BookingEditForm';
import { formatDate, formatTime } from '@/components/admin/lib/format';
import { cardCls } from '@/components/admin/lib/ui';

export const dynamic = 'force-dynamic';

export default async function EditBookingPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();

  const { data: booking } = await supabase.from('bookings').select('*').eq('id', params.id).single();
  if (!booking) notFound();

  const [{ data: client }, { data: location }, { data: landingPage }, { data: slot }, { data: paidExtras }] = await Promise.all([
    booking.client_id ? supabase.from('clients').select('*').eq('id', booking.client_id).single() : Promise.resolve({ data: null }),
    booking.location_id
      ? supabase.from('locations').select('*').eq('id', booking.location_id).single()
      : Promise.resolve({ data: null }),
    booking.landing_page_id
      ? supabase.from('landing_pages').select('*').eq('id', booking.landing_page_id).single()
      : Promise.resolve({ data: null }),
    booking.slot_id
      ? supabase.from('availability_slots').select('*').eq('id', booking.slot_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('upsell_orders')
      .select('amount_cents, stripe_payment_intent_id')
      .eq('booking_id', booking.id)
      .eq('status', 'paid'),
  ]);
  const extras = (paidExtras as { amount_cents: number; stripe_payment_intent_id: string | null }[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/calendar" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Calendar
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">Edit booking</h1>
      </div>

      <div className={`${cardCls} max-w-2xl`}>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Client</dt>
            <dd className="text-gray-900">{client?.name || client?.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Location</dt>
            <dd className="text-gray-900">{location?.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Session type</dt>
            <dd className="text-gray-900">{landingPageLabel(landingPage)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Slot</dt>
            <dd className="text-gray-900">
              {slot ? `${formatDate(slot.start_time)} · ${formatTime(slot.start_time)}–${formatTime(slot.end_time)}` : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <BookingEditForm
        booking={booking}
        clientEmail={client?.email ?? null}
        paidExtrasCents={extras.reduce((sum, e) => sum + e.amount_cents, 0)}
        hasStripeExtras={extras.some((e) => Boolean(e.stripe_payment_intent_id))}
      />
    </div>
  );
}
