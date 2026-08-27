import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AvailabilitySlot, Booking, Client, Contract, LandingPage, Location } from '@/types/db';
import ContractEditor, { type BookingContext } from '@/components/admin/ContractEditor';
import { landingPageLabel } from '@/components/admin/lib/data';

export const dynamic = 'force-dynamic';

export default async function EditContractPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();

  const { data: contractRaw } = await supabase.from('contracts').select('*').eq('id', params.id).single();
  if (!contractRaw) notFound();
  const contract = contractRaw as Contract;

  const [{ data: studio }, clientRes, bookingRes] = await Promise.all([
    supabase.from('studios').select('name').eq('id', contract.studio_id).single(),
    contract.client_id
      ? supabase.from('clients').select('*').eq('id', contract.client_id).single()
      : Promise.resolve({ data: null }),
    contract.booking_id
      ? supabase.from('bookings').select('*').eq('id', contract.booking_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const client = (clientRes.data as Client | null) ?? null;
  const booking = (bookingRes.data as Booking | null) ?? null;

  let bookingContext: BookingContext | null = null;
  if (booking) {
    const [landingPageRes, locationRes, slotRes] = await Promise.all([
      booking.landing_page_id
        ? supabase.from('landing_pages').select('*').eq('id', booking.landing_page_id).single()
        : Promise.resolve({ data: null }),
      booking.location_id
        ? supabase.from('locations').select('*').eq('id', booking.location_id).single()
        : Promise.resolve({ data: null }),
      booking.slot_id
        ? supabase.from('availability_slots').select('*').eq('id', booking.slot_id).single()
        : Promise.resolve({ data: null }),
    ]);
    const landingPage = (landingPageRes.data as LandingPage | null) ?? null;
    const location = (locationRes.data as Location | null) ?? null;
    const slot = (slotRes.data as AvailabilitySlot | null) ?? null;

    bookingContext = {
      amountCents: booking.amount_cents,
      currency: booking.currency,
      sessionDate: slot?.start_time ?? null,
      sessionType: landingPageLabel(landingPage),
      location: location?.name ?? null,
    };
  }

  return (
    <ContractEditor
      contract={contract}
      studioName={studio?.name ?? 'Dopa Studio'}
      client={client}
      bookingContext={bookingContext}
    />
  );
}
