import 'server-only';
import type { createAdminSupabaseClient } from '@/lib/supabase/admin';

const BUCKET = 'contracts';

/** Uploads a signed contract's PDF to the (public-read) `contracts`
 * bucket and returns its public URL. Always called with the service-role
 * client — there is no browser upload path for contract PDFs. */
export async function uploadContractPdf(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  contractId: string,
  pdf: Buffer
): Promise<string> {
  const path = `${contractId}/${Date.now()}.pdf`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, pdf, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
