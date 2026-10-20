import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchEnrichedBookings, getStudioId } from '@/components/admin/lib/data';
import CalendarAgenda from '@/components/admin/CalendarAgenda';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const bookings = await fetchEnrichedBookings(supabase, studioId);

  const withDates = bookings.filter((b) => b.status !== 'cancelled');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Calendar</h1>
      <CalendarAgenda bookings={withDates} />
    </div>
  );
}
