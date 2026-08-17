import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLandingPages, getStudioId } from '@/components/admin/lib/data';
import LandingPagesList from '@/components/admin/LandingPagesList';

export const dynamic = 'force-dynamic';

export default async function LandingPagesPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const pages = await getLandingPages(supabase, studioId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Landing pages</h1>
        <p className="text-sm text-gray-500">Public booking pages, one per session type.</p>
      </div>
      <LandingPagesList initialPages={pages} />
    </div>
  );
}
