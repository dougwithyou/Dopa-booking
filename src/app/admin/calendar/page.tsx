import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchEnrichedBookings, getStudioId } from '@/components/admin/lib/data';
import CalendarAgenda from '@/components/admin/CalendarAgenda';
import { btnPrimary } from '@/components/admin/lib/ui';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const bookings = await fetchEnrichedBookings(supabase, studioId);

  const withDates = bookings.filter((b) => b.status !== 'cancelled');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500">Upcoming and recent sessions at a glance.</p>
        </div>
        <Link href="/admin/bookings/new" className={btnPrimary}>
          <Plus className="h-4 w-4" /> Add session
        </Link>
      </div>

      <CalendarAgenda bookings={withDates} />
    </div>
  );
}
