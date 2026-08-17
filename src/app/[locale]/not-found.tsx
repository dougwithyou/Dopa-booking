import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function LocaleNotFound() {
  const t = await getTranslations('notFound');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-parchment px-6 text-center">
      <span className="font-display text-sm font-black uppercase tracking-[0.14em] text-clay">Dopa Studio</span>
      <h1 className="font-display text-4xl font-black text-ink">{t('title')}</h1>
      <p className="max-w-md font-body text-sm leading-relaxed text-ink/70">{t('body')}</p>
      <Link
        href="/"
        className="mt-4 inline-flex items-center gap-2.5 bg-clay px-8 py-3.5 font-body text-xs font-semibold uppercase tracking-[0.14em] text-parchment transition-colors hover:bg-wine"
      >
        {t('backHome')}
      </Link>
    </main>
  );
}
