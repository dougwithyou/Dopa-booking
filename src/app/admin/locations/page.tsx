import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLocations, getStudioId } from '@/components/admin/lib/data';
import LocationsManager from '@/components/admin/LocationsManager';

export const dynamic = 'force-dynamic';

export default async function LocationsPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const locations = await getLocations(supabase, studioId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Locations</h1>
        <p className="text-sm text-gray-500">
          Shoot locations and their availability. Click <strong>Set availability</strong> on a
          location below to add the dates and times clients can book there.
        </p>
      </div>
      <LocationsManager studioId={studioId} initialLocations={locations} />
    </div>
  );
}
