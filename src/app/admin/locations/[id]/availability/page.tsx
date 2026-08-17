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

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/locations" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Locations
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">{location.name} — Availability</h1>
        <p className="text-sm text-gray-500">Add bookable time slots and manage blocked dates.</p>
      </div>

      <AvailabilityManager locationId={location.id} initialSlots={slots ?? []} />
    </div>
  );
}
