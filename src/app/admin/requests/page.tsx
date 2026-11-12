import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStudioId } from '@/components/admin/lib/data';
import { formatDate, formatDateTime } from '@/components/admin/lib/format';
import { cardCls } from '@/components/admin/lib/ui';
import RequestStatusSelect from '@/components/admin/RequestStatusSelect';
import type { SessionRequest } from '@/types/db';

export const dynamic = 'force-dynamic';

/** "Different session" requests sent from the public session catalog. */
export default async function RequestsPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const { data } = await supabase
    .from('session_requests')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false });
  const requests = (data as SessionRequest[] | null) ?? [];
  const open = requests.filter((r) => r.status === 'new').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Session requests</h1>
        <p className="text-sm text-gray-500">
          Sent from the &ldquo;request your ideal session&rdquo; form on the booking home page. {open} new.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className={cardCls}>
          <p className="text-sm text-gray-500">No requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className={`${cardCls} flex flex-wrap items-start justify-between gap-3`}>
              <div className="min-w-0 space-y-1 text-sm">
                <div className="font-semibold text-gray-900">{r.session_type}</div>
                <div className="text-gray-700">
                  {r.first_name} {r.last_name} ·{' '}
                  <a href={`mailto:${r.email}`} className="underline-offset-4 hover:underline">
                    {r.email}
                  </a>
                  {r.phone && (
                    <>
                      {' '}
                      ·{' '}
                      <a href={`tel:${r.phone}`} className="underline-offset-4 hover:underline">
                        {r.phone}
                      </a>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Estimated date: {r.preferred_date ? formatDate(`${r.preferred_date}T12:00:00Z`) : '—'} · {r.locale === 'es' ? 'Spanish' : 'English'} ·
                  received {formatDateTime(r.created_at)}
                  {r.client_id && (
                    <>
                      {' '}
                      ·{' '}
                      <Link href={`/admin/crm/${r.client_id}`} className="underline-offset-4 hover:underline">
                        CRM
                      </Link>
                    </>
                  )}
                </div>
              </div>
              <RequestStatusSelect id={r.id} status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
