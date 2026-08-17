import { getTranslations } from 'next-intl/server';
import type { DiscountCode, LandingPage, Locale } from '@/types/db';
import { pickOptional, pickText } from '@/lib/landing/copy';
import { formatDiscountValue } from '@/lib/landing/discount';
import { renderDuo } from './Duo';
import { TopMark } from './TopMark';
import { LocaleSwitch } from './LocaleSwitch';
import { Hero } from './Hero';
import { GalleryLightbox } from './GalleryLightbox';
import { Testimonials } from './Testimonials';
import { About } from './About';
import { Closer } from './Closer';
import { Footer } from './Footer';
import { MetaPixel } from './MetaPixel';

const GALLERY_ID = 'gallery';
const CLOSER_ID = 'book';

/**
 * Composition root for a published landing page. Server component: reads
 * bilingual copy off the `landing_pages` row (falling back to the other
 * locale, then to chrome strings from messages/*.json for anything that
 * isn't admin-editable per the schema — section eyebrows other than the
 * hero's, and the testimonials section heading).
 */
export async function LandingPageView({
  page,
  locale,
  studioName,
  metaPixelId,
  discount,
  bookHref,
}: {
  page: LandingPage;
  locale: Locale;
  studioName: string;
  metaPixelId: string | null;
  discount: DiscountCode | null;
  bookHref: string;
}) {
  const t = await getTranslations({ locale, namespace: 'landing' });

  const eyebrow = pickOptional(locale, page.eyebrow_en, page.eyebrow_es);
  const headline = pickText(locale, page.headline_en, page.headline_es) || t('hero.headlineFallback');
  const subheadline = pickOptional(locale, page.subheadline_en, page.subheadline_es);
  const ctaPrimary = pickText(locale, page.cta_primary_en, page.cta_primary_es) || t('hero.ctaPrimaryDefault');
  const ctaSecondary =
    pickText(locale, page.cta_secondary_en, page.cta_secondary_es) || t('hero.ctaSecondaryDefault');

  const galleryHeading =
    pickText(locale, page.gallery_heading_en, page.gallery_heading_es) || t('gallery.headingDefault');
  const aboutHeading = pickOptional(locale, page.about_heading_en, page.about_heading_es);
  const aboutBody = pickText(locale, page.about_body_en, page.about_body_es);
  const closerHeading =
    pickText(locale, page.closer_heading_en, page.closer_heading_es) || t('closer.headingDefault');
  const closerBody = pickOptional(locale, page.closer_body_en, page.closer_body_es);

  const photos = [...page.gallery]
    .sort((a, b) => a.order - b.order)
    .map((g) => ({ url: g.url || null, tag: pickText(locale, g.tag_en, g.tag_es) }));

  const testimonials = [...page.testimonials]
    .sort((a, b) => a.order - b.order)
    .map((item) => ({ quote: pickText(locale, item.quote_en, item.quote_es), author: item.author }));

  const ticket =
    discount && discount.is_active
      ? {
          code: discount.code,
          label: t('closer.ticketLabel', { value: formatDiscountValue(discount) }),
          expiresAt: discount.expires_at,
          hoursLabel: t('closer.hours'),
          minutesLabel: t('closer.minutes'),
          secondsLabel: t('closer.seconds'),
        }
      : null;

  return (
    <>
      <MetaPixel pixelId={metaPixelId} />
      <TopMark studioName={studioName} region={t('topmark.region')} right={<LocaleSwitch locale={locale} />} />

      <Hero
        eyebrow={eyebrow}
        headline={renderDuo(headline)}
        subheadline={subheadline}
        ctaPrimaryHref={`#${CLOSER_ID}`}
        ctaPrimaryLabel={ctaPrimary}
        ctaSecondaryHref={`#${GALLERY_ID}`}
        ctaSecondaryLabel={ctaSecondary}
        imageUrl={page.hero_image_url}
        scrollCueLabel={t('hero.scrollCue')}
      />

      <GalleryLightbox
        sectionId={GALLERY_ID}
        eyebrow={t('gallery.eyebrow')}
        heading={renderDuo(galleryHeading)}
        photos={photos}
        closeLabel={t('gallery.close')}
        prevLabel={t('gallery.prev')}
        nextLabel={t('gallery.next')}
      />

      <Testimonials
        eyebrow={t('testimonials.eyebrow')}
        heading={renderDuo(t('testimonials.heading'))}
        items={testimonials}
      />

      {aboutHeading && (
        <About
          eyebrow={t('about.eyebrow')}
          heading={aboutHeading}
          body={aboutBody
            .split(/\n+/)
            .map((p) => p.trim())
            .filter(Boolean)}
          signature={t('about.signature', { studio: studioName })}
          imageUrl={photos[1]?.url ?? page.hero_image_url}
        />
      )}

      <Closer
        sectionId={CLOSER_ID}
        eyebrow={t('closer.eyebrow')}
        heading={renderDuo(closerHeading)}
        body={closerBody}
        ticket={ticket}
        ctaHref={bookHref}
        ctaLabel={t('closer.cta')}
      />

      <Footer studioName={studioName} tagline={t('footer.tagline')} />
    </>
  );
}
