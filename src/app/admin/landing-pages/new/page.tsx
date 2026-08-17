import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStudioId } from '@/components/admin/lib/data';
import NewLandingPageForm from '@/components/admin/NewLandingPageForm';

export const dynamic = 'force-dynamic';

export default async function NewLandingPagePage() {
  const supabase = await createServerSupabaseClient();
  const studioId = await getStudioId(supabase);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/landing-pages" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> Landing pages
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">New landing page</h1>
        <p className="text-sm text-gray-500">Start a draft — you can fill in every detail on the next screen.</p>
      </div>

      <NewLandingPageForm studioId={studioId} />
    </div>
  );
}
