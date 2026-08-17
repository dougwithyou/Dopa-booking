// Supabase Storage helper for uploading admin-managed media (landing page
// hero/gallery photos, product photos).
//
// IMPORTANT: this assumes a public bucket named `landing-media` already
// exists. It is NOT created here (not something we can do reliably at
// runtime from the app) — provision it once via the Supabase dashboard or
// CLI, e.g.:
//   supabase storage create-bucket landing-media --public
// or the SQL equivalent (insert into storage.buckets ...). See the final
// build report for the flagged follow-up.

import type { SB } from './data';

const BUCKET = 'landing-media';

export async function uploadMedia(supabase: SB, folder: string, blob: Blob, ext = 'jpg'): Promise<string> {
  const filename = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(filename, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}
