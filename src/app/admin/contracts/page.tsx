import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchEnrichedContracts, getStudioId } from '@/components/admin/lib/data';
import ContractsList from '@/components/admin/ContractsList';
import { btnPrimary } from '@/components/admin/lib/ui';

export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const contracts = await fetchEnrichedContracts(supabase, studioId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Contracts</h1>
          <p className="text-sm text-gray-500">Draft, send, and track e-signature contracts.</p>
        </div>
        <Link href="/admin/contracts/new" className={btnPrimary}>
          <Plus className="h-4 w-4" /> New contract
        </Link>
      </div>

      <ContractsList contracts={contracts} />
    </div>
  );
}
