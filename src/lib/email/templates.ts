import type { AvailabilitySlot, Booking, Client, Hold, LandingPage, Location, Locale } from '@/types/db';
import { formatCurrency, formatSlotDateTime } from './format';
import { detailsBlockHtml, escapeHtml, renderHtmlEmail } from './layout';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function sessionTypeLabel(landingPage: LandingPage, locale: Locale): string {
  const headline = locale === 'es' ? landingPage.headline_es : landingPage.headline_en;
  return headline?.trim() || (locale === 'es' ? 'Sesión de fotos' : 'Photo session');
}

function locationLine(location: Location | null, locale: Locale): string {
  if (!location) return locale === 'es' ? 'Ubicación por confirmar' : 'Location to be confirmed';
  const addressParts = [location.address, location.city, location.state].filter(Boolean);
  return addressParts.length > 0 ? `${location.name} — ${addressParts.join(', ')}` : location.name;
}

function dateTimeLine(slot: AvailabilitySlot | null, locale: Locale): string {
  if (!slot) return locale === 'es' ? 'Horario por confirmar' : 'Time to be confirmed';
  return formatSlotDateTime(slot.start_time, locale);
}

// ---------------------------------------------------------------------------
// Booking confirmation (client-facing, bilingual)
// ---------------------------------------------------------------------------

const bookingConfirmationCopy = {
  en: {
    subject: (sessionType: string) => `You're booked — ${sessionType} with Dopa Studio`,
    heading: 'Your session is confirmed!',
    greeting: (name: string) => `Hi ${name},`,
    intro:
      "We can't wait to spend this time with you. Here are your session details — save this email for your records.",
    detailLabels: {
      session: 'Session',
      location: 'Location',
      when: 'Date & time',
      paid: 'Amount paid',
    },
    closing:
      "If anything comes up or you need to reschedule, just reply to this email and we'll take care of it. See you soon!",
    signoff: '— Doug & Paola, Dopa Studio',
  },
  es: {
    subject: (sessionType: string) => `¡Reserva confirmada! — ${sessionType} con Dopa Studio`,
    heading: '¡Tu sesión está confirmada!',
    greeting: (name: string) => `Hola ${name},`,
    intro:
      'Estamos felices de compartir este momento contigo. Aquí tienes los detalles de tu sesión — guarda este correo para tus archivos.',
    detailLabels: {
      session: 'Sesión',
      location: 'Ubicación',
      when: 'Fecha y hora',
      paid: 'Monto pagado',
    },
    closing:
      'Si surge algún imprevisto o necesitas reprogramar, solo responde a este correo y con gusto te ayudamos. ¡Nos vemos pronto!',
    signoff: '— Doug & Paola, Dopa Studio',
  },
} satisfies Record<Locale, {
  subject: (sessionType: string) => string;
  heading: string;
  greeting: (name: string) => string;
  intro: string;
  detailLabels: { session: string; location: string; when: string; paid: string };
  closing: string;
  signoff: string;
}>;

export function buildBookingConfirmationEmail(params: {
  booking: Booking;
  client: Client;
  landingPage: LandingPage;
  location: Location | null;
  slot: AvailabilitySlot | null;
  locale: Locale;
}): EmailContent {
  const { booking, client, landingPage, location, slot, locale } = params;
  const copy = bookingConfirmationCopy[locale];
  const sessionType = sessionTypeLabel(landingPage, locale);
  const clientName = client.name?.trim() || (locale === 'es' ? 'allí' : 'there');
  const when = dateTimeLine(slot, locale);
  const where = locationLine(location, locale);
  const paid = formatCurrency(booking.amount_cents, booking.currency, locale);

  const detailsRows: Array<[string, string]> = [
    [copy.detailLabels.session, sessionType],
    [copy.detailLabels.location, where],
    [copy.detailLabels.when, when],
    [copy.detailLabels.paid, paid],
  ];

  const html = renderHtmlEmail({
    preheading: copy.intro,
    heading: copy.heading,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(copy.greeting(clientName))}</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${copy.intro}</p>
      ${detailsBlockHtml(detailsRows)}
      <p style="margin:16px 0 4px;font-size:15px;line-height:1.5;">${copy.closing}</p>
      <p style="margin:16px 0 0;font-size:15px;line-height:1.5;">${copy.signoff}</p>
    `,
  });

  const text = [
    copy.greeting(clientName),
    '',
    copy.intro,
    '',
    `${copy.detailLabels.session}: ${sessionType}`,
    `${copy.detailLabels.location}: ${where}`,
    `${copy.detailLabels.when}: ${when}`,
    `${copy.detailLabels.paid}: ${paid}`,
    '',
    copy.closing,
    '',
    copy.signoff,
  ].join('\n');

  return { subject: copy.subject(sessionType), html, text };
}

// ---------------------------------------------------------------------------
// Admin booking notification (internal, English, terse)
// ---------------------------------------------------------------------------

export function buildAdminBookingNotificationEmail(params: {
  booking: Booking;
  client: Client;
  landingPage: LandingPage;
  location: Location | null;
  slot: AvailabilitySlot | null;
}): EmailContent {
  const { booking, client, landingPage, location, slot } = params;
  const locale: Locale = 'en';
  const sessionType = sessionTypeLabel(landingPage, locale);
  const clientName = client.name?.trim() || client.email;
  const where = location?.name ?? 'location TBD';
  const when = slot ? formatSlotDateTime(slot.start_time, locale) : 'time TBD';
  const amount = formatCurrency(booking.amount_cents, booking.currency, locale);

  const summary = `New booking: ${clientName}, ${sessionType}, ${where}, ${when}, ${amount}`;

  const detailsRows: Array<[string, string]> = [
    ['Client', `${clientName} (${client.email}${client.phone ? `, ${client.phone}` : ''})`],
    ['Session', sessionType],
    ['Location', where],
    ['When', when],
    ['Amount', amount],
    ['Booking ID', booking.id],
  ];

  const html = renderHtmlEmail({
    heading: 'New booking',
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(summary)}</p>
      ${detailsBlockHtml(detailsRows)}
    `,
  });

  const text = [summary, '', ...detailsRows.map(([label, value]) => `${label}: ${value}`)].join('\n');

  return { subject: summary, html, text };
}

// ---------------------------------------------------------------------------
// Hold expiration reminder (client-facing, bilingual)
// ---------------------------------------------------------------------------

const holdExpirationCopy = {
  en: {
    subject: 'Your reserved time is about to expire',
    heading: 'Your hold is about to expire',
    greeting: (name: string) => `Hi ${name},`,
    intro:
      "You're just a step away from locking in your session — but your reserved time slot is about to release back to the calendar.",
    detailLabels: { location: 'Location', when: 'Reserved time', expires: 'Hold expires' },
    closing: 'Head back to finish checkout to keep this time. If it releases, someone else may grab it!',
    signoff: '— Dopa Studio',
  },
  es: {
    subject: 'Tu horario reservado está por expirar',
    heading: 'Tu reserva temporal está por expirar',
    greeting: (name: string) => `Hola ${name},`,
    intro:
      'Estás a un paso de asegurar tu sesión — pero tu horario reservado está a punto de liberarse del calendario.',
    detailLabels: { location: 'Ubicación', when: 'Horario reservado', expires: 'La reserva expira' },
    closing: 'Vuelve para completar tu pago y asegurar este horario. ¡Si se libera, alguien más podría tomarlo!',
    signoff: '— Dopa Studio',
  },
} satisfies Record<Locale, {
  subject: string;
  heading: string;
  greeting: (name: string) => string;
  intro: string;
  detailLabels: { location: string; when: string; expires: string };
  closing: string;
  signoff: string;
}>;

export function buildHoldExpirationReminderEmail(params: {
  hold: Hold;
  location: Location | null;
  slot: AvailabilitySlot | null;
  locale: Locale;
}): EmailContent {
  const { hold, location, slot, locale } = params;
  const copy = holdExpirationCopy[locale];
  const clientName = hold.client_name?.trim() || (locale === 'es' ? 'allí' : 'there');
  const where = locationLine(location, locale);
  const when = dateTimeLine(slot, locale);
  const expires = formatSlotDateTime(hold.expires_at, locale);

  const detailsRows: Array<[string, string]> = [
    [copy.detailLabels.location, where],
    [copy.detailLabels.when, when],
    [copy.detailLabels.expires, expires],
  ];

  const html = renderHtmlEmail({
    preheading: copy.intro,
    heading: copy.heading,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(copy.greeting(clientName))}</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${copy.intro}</p>
      ${detailsBlockHtml(detailsRows)}
      <p style="margin:16px 0 4px;font-size:15px;line-height:1.5;">${copy.closing}</p>
      <p style="margin:16px 0 0;font-size:15px;line-height:1.5;">${copy.signoff}</p>
    `,
  });

  const text = [
    copy.greeting(clientName),
    '',
    copy.intro,
    '',
    `${copy.detailLabels.location}: ${where}`,
    `${copy.detailLabels.when}: ${when}`,
    `${copy.detailLabels.expires}: ${expires}`,
    '',
    copy.closing,
    '',
    copy.signoff,
  ].join('\n');

  return { subject: copy.subject, html, text };
}
