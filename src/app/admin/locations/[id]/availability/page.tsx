import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import AvailabilityManager from '@/components/admin/AvailabilityManager';

export const dynamic = 'force-dynamic';

export default async function LocationAvailabilityPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();

  const { data: location } = await supabase.from('locations').select('*').eq('id', params.id).single();
  if (!location) notFound();

  const { data: slots } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('location_id', params.id)
    .order('start_time', { ascending: true });

  // A slot's is_blocked flag only reflects manual admin blocks — whether a
  // slot is actually taken lives in bookings (see slot_is_available() in
  // the schema). Without this, the availability table showed every unbooked
  // *and* booked slot as "Open" alike, which reads as a bug from the admin
  // side even though the booking flow itself correctly refuses the slot.
  const slotIds = (slots ?? []).map((s) => s.id);
  let bookedSlotIds = new Set<string>();
  if (slotIds.length > 0) {
    const { data: activeBookings } = await supabase
      .from('bookings')
      .select('slot_id')
      .in('slot_id', slotIds)
      .in('status', ['pending', 'confirmed']);
    bookedSlotIds = new Set((activeBookings ?? []).map((b) => b.slot_id).filter((id): id is string => !!id));
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/locations" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Locations
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">{location.name} — Availability</h1>
        <p className="text-sm text-gray-500">Add bookable time slots and manage blocked dates.</p>
      </div>

      <AvailabilityManager locationId={location.id} initialSlots={slots ?? []} bookedSlotIds={bookedSlotIds} />
    </div>
  );
}
