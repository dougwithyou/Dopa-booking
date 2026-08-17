import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLandingPages, getLocations, getStudioId } from '@/components/admin/lib/data';
import BookingForm from '@/components/admin/BookingForm';

export const dynamic = 'force-dynamic';

export default async function NewBookingPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const [locations, landingPages] = await Promise.all([
    getLocations(supabase, studioId),
    getLandingPages(supabase, studioId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/calendar" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Calendar
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">Add session</h1>
        <p className="text-sm text-gray-500">
          Manually create a booking (phone/WhatsApp/in-person bookings, cash payments).
        </p>
      </div>

      <BookingForm studioId={studioId} locations={locations} landingPages={landingPages} />
    </div>
  );
}
