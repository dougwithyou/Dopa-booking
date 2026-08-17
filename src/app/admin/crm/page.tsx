import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchEnrichedBookings, getClients, getStudioId, landingPageLabel } from '@/components/admin/lib/data';
import CrmList, { type ClientRow } from '@/components/admin/CrmList';

export const dynamic = 'force-dynamic';

export default async function CrmPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);

  const [clients, bookings] = await Promise.all([getClients(supabase, studioId), fetchEnrichedBookings(supabase, studioId)]);

  const rows: ClientRow[] = clients.map((c) => {
    const clientBookings = bookings.filter((b) => b.client_id === c.id);
    const sessionTypes = Array.from(
      new Set(clientBookings.map((b) => landingPageLabel(b.landing_page)).filter(Boolean))
    );
    const confirmed = clientBookings.filter((b) => b.status === 'confirmed');
    const lifetimeCents = confirmed.reduce((sum, b) => sum + b.amount_cents, 0);
    const dates = clientBookings.map((b) => b.slot?.start_time ?? b.created_at).sort();
    const lastDate = dates.length ? dates[dates.length - 1] : null;

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      sessionTypes,
      lastDate,
      lifetimeCents,
      bookingCount: clientBookings.length,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">CRM</h1>
        <p className="text-sm text-gray-500">Every client who has booked or been added manually.</p>
      </div>
      <CrmList rows={rows} />
    </div>
  );
}
