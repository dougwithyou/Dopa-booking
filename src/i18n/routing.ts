import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  localePrefix: 'always',
  // localeDetection uses the Accept-Language header when no locale cookie
  // is set yet — this is what gives us "auto-detect on first load" with no
  // visible selector required.
  localeDetection: true,
});

export type AppLocale = (typeof routing.locales)[number];
