import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getClients, getLocations, getStudioId } from '@/components/admin/lib/data';
import InvoiceForm from '@/components/admin/InvoiceForm';

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);
  const [clients, locations] = await Promise.all([getClients(supabase, studioId), getLocations(supabase, studioId)]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/invoices" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Invoices
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">New invoice</h1>
      </div>
      <InvoiceForm clients={clients} locations={locations.filter((l) => l.is_active)} />
    </div>
  );
}
