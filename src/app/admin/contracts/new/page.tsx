import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchEnrichedBookings, getStudioId } from '@/components/admin/lib/data';
import NewContractForm from '@/components/admin/NewContractForm';

export const dynamic = 'force-dynamic';

export default async function NewContractPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const [bookings, { data: studio }] = await Promise.all([
    fetchEnrichedBookings(supabase, studioId),
    supabase.from('studios').select('name').eq('id', studioId).single(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">New contract</h1>
        <p className="text-sm text-gray-500">Start from scratch, or pre-fill from an existing booking.</p>
      </div>

      <NewContractForm studioId={studioId} studioName={studio?.name ?? 'Dopa Studio'} bookings={bookings} />
    </div>
  );
}
