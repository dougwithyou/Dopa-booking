import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStudioId } from '@/components/admin/lib/data';
import SettingsForm from '@/components/admin/SettingsForm';
import StripeConnectCard from '@/components/admin/StripeConnectCard';
import ConnectedBanner from '@/components/admin/ConnectedBanner';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { connected?: string };
}) {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const { data: studio } = await supabase.from('studios').select('*').eq('id', studioId).single();

  if (!studio) {
    return <p className="text-sm text-red-600">Could not load studio settings.</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Studio profile and payment setup.</p>
      </div>

      <ConnectedBanner connectedParam={searchParams.connected} />

      <StripeConnectCard studio={studio} />

      <SettingsForm studio={studio} />
    </div>
  );
}
