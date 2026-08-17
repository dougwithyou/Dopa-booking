import { getTranslations } from 'next-intl/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

/**
 * Studio index: redirects to the most recently published landing page.
 * This is intentionally minimal — the real UI is the landing page template
 * at /[locale]/l/[slug]. If no landing page has been published yet (e.g.
 * a fresh install before the admin has created one), show a small
 * placeholder instead of a broken redirect.
 */
export default async function StudioIndexPage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = await createServerSupabaseClient();

  const { data: page } = await supabase
    .from('landing_pages')
    .select('slug')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (page?.slug) {
    redirect({ href: `/l/${page.slug}`, locale: locale as AppLocale });
  }

  const t = await getTranslations({ locale, namespace: 'home' });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-parchment px-6 text-center">
      <h1 className="font-display text-4xl font-black text-ink">{t('placeholderTitle')}</h1>
      <p className="max-w-md font-body text-sm text-ink/70">{t('placeholderBody')}</p>
    </main>
  );
}
