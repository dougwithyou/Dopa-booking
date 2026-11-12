import type { Metadata } from 'next';
import { unstable_noStore as noStore } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { adminDb } from '@/app/api/_lib/payments';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import type { DiscountCode, LandingPage } from '@/types/db';
import { pickOptional, pickText } from '@/lib/landing/copy';
import { applyDiscount, formatDiscountValue, isDiscountUsable } from '@/lib/landing/discount';
import { renderDuo } from '@/components/landing/Duo';
import { Photo } from '@/components/landing/Photo';
import { LocaleSwitch } from '@/components/landing/LocaleSwitch';
import { SessionRequestForm } from '@/components/catalog/SessionRequestForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'home' });
  return { title: t('metaTitle'), description: t('lead') };
}

/**
 * Session catalog (book.hidopastudio.com): one card per published landing
 * page — photo, label, headline, price (with the page's active discount)
 * and a link to it — plus a "looking for a different session?" request
 * form. Newest first; drafts and archived pages never show.
 */
export default async function SessionCatalogPage({ params: { locale } }: { params: { locale: string } }) {
  // Always render per request: the [locale] layout pre-generates en/es at
  // build time, which would freeze the list of published sessions.
  noStore();
  const loc = (locale === 'en' ? 'en' : 'es') as AppLocale;
  const t = await getTranslations({ locale: loc, namespace: 'home' });
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  const pages = (data as LandingPage[] | null) ?? [];

  // Auto-applied discounts (discount codes aren't publicly readable).
  const codeIds = pages.map((p) => p.discount_code_id).filter((v): v is string => Boolean(v));
  const { data: codeRows } = codeIds.length
    ? await adminDb().from('discount_codes').select('*').in('id', codeIds)
    : { data: [] as DiscountCode[] };
  const codes = new Map(((codeRows as DiscountCode[] | null) ?? []).filter((c) => isDiscountUsable(c)).map((c) => [c.id, c]));

  const money = (cents: number, currency: string) =>
    new Intl.NumberFormat(loc === 'es' ? 'es-US' : 'en-US', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);

  return (
    <main className="min-h-screen bg-parchment text-ink">
      <div className="flex items-center justify-between px-[6vw] py-[22px]">
        <span className="font-display text-[15px] font-black uppercase tracking-[0.04em]">Dopa Studio</span>
        <span className="font-body text-[10px] uppercase tracking-[0.18em] [&_a]:border-ink/30">
          <LocaleSwitch locale={loc} />
        </span>
      </div>

      <header className="max-w-[760px] px-[6vw] pb-7 pt-10">
        <span className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">{t('eyebrow')}</span>
        <h1 className="mt-3.5 font-display text-[clamp(38px,7vw,72px)] font-black leading-[1.02]">
          {renderDuo(t('title'))}
        </h1>
        <p className="mt-4 max-w-[46ch] font-body text-[15px] font-light leading-[1.7] text-[#4b4239]">{t('lead')}</p>
      </header>

      {pages.length === 0 ? (
        <p className="px-[6vw] pb-10 font-body text-sm text-ink/70">{t('placeholderBody')}</p>
      ) : (
        <section className="grid grid-cols-1 gap-7 px-[6vw] pb-16 pt-4 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page, i) => {
            const discount = page.discount_code_id ? codes.get(page.discount_code_id) ?? null : null;
            const base = page.base_price_cents ?? 0;
            const price = applyDiscount(base, discount);
            const eyebrow = pickOptional(loc, page.eyebrow_en, page.eyebrow_es);
            const headline = (pickText(loc, page.headline_en, page.headline_es) || eyebrow || page.slug).replace(/\*\*/g, '');
            const sub = pickOptional(loc, page.subheadline_en, page.subheadline_es);
            return (
              <Link
                key={page.id}
                href={`/l/${page.slug}`}
                className="group block border border-ink/[0.08] bg-white/50 transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Photo
                    src={page.hero_image_url}
                    alt={headline}
                    seed={i}
                    focal={{ x: Number(page.hero_focal_x ?? 50), y: Number(page.hero_focal_y ?? 50) }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent from-45% to-black/70" />
                  {discount && (
                    <span className="absolute left-4 top-4 bg-wine px-2.5 py-1.5 font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-parchment">
                      {t('discountBadge', { value: formatDiscountValue(discount), code: discount.code })}
                    </span>
                  )}
                  <div className="absolute inset-x-5 bottom-5 text-[#f8f1e4]">
                    {eyebrow && (
                      <span className="font-body text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f3d9a0]">
                        {eyebrow}
                      </span>
                    )}
                    <h2 className="mt-2 font-display text-[28px] font-black leading-[1.08]">{headline}</h2>
                  </div>
                </div>
                <div className="px-5 pb-6 pt-[18px]">
                  {sub && <p className="line-clamp-2 font-body text-sm font-light leading-relaxed text-[#4b4239]">{sub}</p>}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    {page.show_price && base > 0 ? (
                      <div className="font-body text-[13px] text-[#6b6055]">
                        {price < base && <s className="mr-1.5 text-[#a59b90]">{money(base, page.currency)}</s>}
                        <b className="font-display text-[22px] font-black text-ink">{money(price, page.currency)}</b>
                        <br />
                        {t('upTo', { count: page.included_people })}
                      </div>
                    ) : (
                      <span />
                    )}
                    <span className="whitespace-nowrap bg-clay px-4 py-3 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-parchment transition-colors group-hover:bg-wine">
                      {t('cta')} →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <section className="border-t border-ink/10 bg-parchment-dim px-[6vw] py-16">
        <div className="max-w-[760px]">
          <span className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">{t('requestEyebrow')}</span>
          <h2 className="mt-3 font-display text-[clamp(28px,4.5vw,44px)] font-black leading-[1.1]">
            {renderDuo(t('requestTitle'))}
          </h2>
          <p className="mb-8 mt-3 max-w-[50ch] font-body text-[15px] font-light leading-[1.7] text-[#4b4239]">
            {t('requestLead')}
          </p>
          <SessionRequestForm
            locale={loc}
            copy={{
              sessionType: t('form.sessionType'),
              sessionTypePlaceholder: t('form.sessionTypePlaceholder'),
              date: t('form.date'),
              firstName: t('form.firstName'),
              lastName: t('form.lastName'),
              email: t('form.email'),
              phone: t('form.phone'),
              submit: t('form.submit'),
              sending: t('form.sending'),
              success: t('form.success'),
              error: t('form.error'),
            }}
          />
        </div>
      </section>

      <footer className="border-t border-ink/10 px-[6vw] py-8 font-body text-[10px] uppercase tracking-[0.12em] text-[#7a7168]">
        hidopastudio.com · @hidopastudio · Washington DC / MD / VA
      </footer>
    </main>
  );
}
