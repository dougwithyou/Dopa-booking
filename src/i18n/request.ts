import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

// `hasLocale` isn't exported by the installed next-intl version (3.26.5) —
// do the same check by hand instead of pulling it in.
function isSupportedLocale(value: string | undefined): value is (typeof routing.locales)[number] {
  return !!value && (routing.locales as readonly string[]).includes(value);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isSupportedLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
