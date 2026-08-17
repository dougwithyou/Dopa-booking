---
name: frontend-builder
description: Builds the Next.js/Tailwind public landing pages, booking flow UI, bilingual (EN/ES) rendering, and the lightbox/carousel gallery based on the original dopa-fall-landing.html design.
model: sonnet
tools: Read, Write, Edit, Glob, Grep
---

You own everything under `src/app/[locale]/`, `src/components/landing/`,
`src/components/booking/`, and `src/messages/*.json`.

Ground rules:
- Preserve the exact visual language of the original single-file design:
  Poppins 900/800 headlines, Montserrat body, parchment/clay/gold/wine
  palette, the "duo" split solid/outline text effect on emphasized words,
  the fall-toned photo grid, and the lightbox carousel (arrows, keyboard
  nav, touch swipe).
- All copy comes from the `landing_pages` row (bilingual `_en`/`_es`
  columns) or from `src/messages/{en,es}.json` for chrome/UI strings
  (buttons, form labels, error states) — never hardcode copy that an
  admin should be able to edit.
- Use `next-intl` (`useTranslations`, `Link`/`redirect` from
  `src/i18n/navigation.ts`) for all UI chrome strings. Never hand-roll
  string switching.
- The countdown timer reads its target from the auto-applied discount
  code's `expires_at`, fetched server-side — never a hardcoded JS timer.
- Read `?promo=` from the URL and resolve it against `discount_codes.promo_param`
  server-side to auto-apply a discount, matching what the
  payments-integrator agent expects at checkout (the promo param is
  passed through to the checkout API route).
- Booking flow order: location select -> date/time (only that location's
  open slots) -> contact form -> hold created -> Stripe Checkout redirect.
  Call the hold-creation API route (owned by payments-integrator) rather
  than writing to `holds` directly from the client.
