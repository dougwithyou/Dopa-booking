import type { AvailabilitySlot, Booking, Client, Hold, Invoice, LandingPage, Location, Locale } from '@/types/db';
import { invoiceNumberLabel, lineTotalCents, subtotalCents } from '@/lib/invoices/totals';
import { formatCurrency, formatSlotDateTime } from './format';
import { buttonHtml, detailsBlockHtml, escapeHtml, renderHtmlEmail } from './layout';

/** A paid extra (upsell order) bought together with the booking. */
export interface BookingEmailExtra {
  name: string;
  quantity: number;
  amountCents: number;
  currency: string;
}

/** Detail rows for the extras plus a grand total; empty when there are none. */
function extrasRows(
  booking: Booking,
  extras: BookingEmailExtra[],
  locale: Locale,
  labels: { session: string; total: string }
): Array<[string, string]> {
  if (extras.length === 0) return [];
  const total = booking.amount_cents + extras.reduce((sum, e) => sum + e.amountCents, 0);
  return [
    [labels.session, formatCurrency(booking.amount_cents, booking.currency, locale)],
    ...extras.map(
      (e): [string, string] => [
        e.quantity > 1 ? `${e.name} × ${e.quantity}` : e.name,
        formatCurrency(e.amountCents, e.currency, locale),
      ]
    ),
    [labels.total, formatCurrency(total, booking.currency, locale)],
  ];
}

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
      people: 'People',
      paid: 'Amount paid',
      sessionPrice: 'Session',
      totalPaid: 'Total paid',
    },
    extrasHeading: 'Payment details',
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
      people: 'Personas',
      paid: 'Monto pagado',
      sessionPrice: 'Sesión',
      totalPaid: 'Total pagado',
    },
    extrasHeading: 'Detalle del pago',
    closing:
      'Si surge algún imprevisto o necesitas reprogramar, solo responde a este correo y con gusto te ayudamos. ¡Nos vemos pronto!',
    signoff: '— Doug & Paola, Dopa Studio',
  },
} satisfies Record<Locale, {
  subject: (sessionType: string) => string;
  heading: string;
  greeting: (name: string) => string;
  intro: string;
  detailLabels: {
    session: string;
    location: string;
    when: string;
    people: string;
    paid: string;
    sessionPrice: string;
    totalPaid: string;
  };
  extrasHeading: string;
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
  extras?: BookingEmailExtra[];
}): EmailContent {
  const { booking, client, landingPage, location, slot, locale } = params;
  const extras = params.extras ?? [];
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
    ...(booking.party_size ? ([[copy.detailLabels.people, String(booking.party_size)]] as Array<[string, string]>) : []),
    ...(extras.length === 0 ? ([[copy.detailLabels.paid, paid]] as Array<[string, string]>) : []),
  ];
  const paymentRows = extrasRows(booking, extras, locale, {
    session: copy.detailLabels.sessionPrice,
    total: copy.detailLabels.totalPaid,
  });

  const html = renderHtmlEmail({
    preheading: copy.intro,
    heading: copy.heading,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(copy.greeting(clientName))}</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${copy.intro}</p>
      ${detailsBlockHtml(detailsRows)}
      ${
        paymentRows.length > 0
          ? `<p style="margin:16px 0 0;font-size:15px;font-weight:bold;line-height:1.5;">${escapeHtml(copy.extrasHeading)}</p>${detailsBlockHtml(paymentRows)}`
          : ''
      }
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
    ...(booking.party_size ? [`${copy.detailLabels.people}: ${booking.party_size}`] : []),
    ...(paymentRows.length > 0
      ? ['', copy.extrasHeading, ...paymentRows.map(([label, value]) => `${label}: ${value}`)]
      : [`${copy.detailLabels.paid}: ${paid}`]),
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
  extras?: BookingEmailExtra[];
}): EmailContent {
  const { booking, client, landingPage, location, slot } = params;
  const extras = params.extras ?? [];
  const locale: Locale = 'en';
  const sessionType = sessionTypeLabel(landingPage, locale);
  const clientName = client.name?.trim() || client.email;
  const where = location?.name ?? 'location TBD';
  const when = slot ? formatSlotDateTime(slot.start_time, locale) : 'time TBD';
  const amount = formatCurrency(
    booking.amount_cents + extras.reduce((sum, e) => sum + e.amountCents, 0),
    booking.currency,
    locale
  );

  const summary = `New booking: ${clientName}, ${sessionType}, ${where}, ${when}, ${amount}${
    extras.length > 0 ? ` (incl. ${extras.length} extra${extras.length > 1 ? 's' : ''})` : ''
  }`;

  const detailsRows: Array<[string, string]> = [
    ['Client', `${clientName} (${client.email}${client.phone ? `, ${client.phone}` : ''})`],
    ['Session', sessionType],
    ['Location', where],
    ['When', when],
    ...(booking.party_size
      ? ([
          [
            'People',
            `${booking.party_size}${
              booking.extra_people_cents > 0
                ? ` (incl. ${formatCurrency(booking.extra_people_cents, booking.currency, locale)} for extra people)`
                : ''
            }`,
          ],
        ] as Array<[string, string]>)
      : []),
    ...extrasRows(booking, extras, locale, { session: 'Session price', total: 'Total paid' }),
    ...(extras.length === 0 ? ([['Amount', amount]] as Array<[string, string]>) : []),
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

// ---------------------------------------------------------------------------
// Contract signed notification (internal, English, terse)
// ---------------------------------------------------------------------------

export function buildContractSignedNotificationEmail(params: {
  contractTitle: string;
  signerName: string;
  clientEmail: string | null;
  signedAtIso: string;
  pdfUrl: string | null;
}): EmailContent {
  const { contractTitle, signerName, clientEmail, signedAtIso, pdfUrl } = params;
  const when = formatSlotDateTime(signedAtIso, 'en');
  const summary = `Contract signed: "${contractTitle}" by ${signerName}`;

  const detailsRows: Array<[string, string]> = [
    ['Contract', contractTitle],
    ['Signed by', clientEmail ? `${signerName} (${clientEmail})` : signerName],
    ['Signed at', when],
  ];

  const html = renderHtmlEmail({
    heading: 'Contract signed',
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(summary)}</p>
      ${detailsBlockHtml(detailsRows)}
      ${
        pdfUrl
          ? `<p style="margin:16px 0 0;font-size:15px;line-height:1.5;"><a href="${escapeHtml(pdfUrl)}" style="color:#9c4a2c;">Download the signed PDF</a></p>`
          : ''
      }
    `,
  });

  const text = [
    summary,
    '',
    ...detailsRows.map(([label, value]) => `${label}: ${value}`),
    ...(pdfUrl ? ['', `PDF: ${pdfUrl}`] : []),
  ].join('\n');

  return { subject: summary, html, text };
}

// ---------------------------------------------------------------------------
// Booking cancellation (client-facing, bilingual)
// ---------------------------------------------------------------------------

const bookingCancellationCopy = {
  en: {
    subject: (sessionType: string) => `Booking cancelled — ${sessionType} with Dopa Studio`,
    heading: 'Your session has been cancelled',
    greeting: (name: string) => `Hi ${name},`,
    intro: 'This is to let you know that the following session has been cancelled:',
    detailLabels: { session: 'Session', location: 'Location', when: 'Date & time', refund: 'Refund' },
    refunded: (amount: string) =>
      `We've issued a refund of ${amount} to your original payment method. Depending on your bank, it can take 5–10 business days to appear.`,
    noRefund: 'No refund has been issued for this booking.',
    closing: "If you have any questions or would like to book a new date, just reply to this email — we're happy to help.",
    signoff: '— Doug & Paola, Dopa Studio',
  },
  es: {
    subject: (sessionType: string) => `Reserva cancelada — ${sessionType} con Dopa Studio`,
    heading: 'Tu sesión ha sido cancelada',
    greeting: (name: string) => `Hola ${name},`,
    intro: 'Te escribimos para confirmarte que la siguiente sesión ha sido cancelada:',
    detailLabels: { session: 'Sesión', location: 'Ubicación', when: 'Fecha y hora', refund: 'Reembolso' },
    refunded: (amount: string) =>
      `Hemos emitido un reembolso de ${amount} a tu método de pago original. Según tu banco, puede tardar de 5 a 10 días hábiles en reflejarse.`,
    noRefund: 'No se ha emitido ningún reembolso por esta reserva.',
    closing: 'Si tienes alguna pregunta o quieres reservar una nueva fecha, solo responde a este correo — con gusto te ayudamos.',
    signoff: '— Doug & Paola, Dopa Studio',
  },
} satisfies Record<Locale, {
  subject: (sessionType: string) => string;
  heading: string;
  greeting: (name: string) => string;
  intro: string;
  detailLabels: { session: string; location: string; when: string; refund: string };
  refunded: (amount: string) => string;
  noRefund: string;
  closing: string;
  signoff: string;
}>;

export function buildBookingCancellationEmail(params: {
  client: Client;
  landingPage: LandingPage | null;
  location: Location | null;
  slot: AvailabilitySlot | null;
  locale: Locale;
  /** Amount refunded, in the booking's currency; null when no refund was issued. */
  refund: { amountCents: number; currency: string } | null;
}): EmailContent {
  const { client, landingPage, location, slot, locale, refund } = params;
  const copy = bookingCancellationCopy[locale];
  const sessionType = landingPage
    ? sessionTypeLabel(landingPage, locale)
    : locale === 'es'
      ? 'Sesión de fotos'
      : 'Photo session';
  const clientName = client.name?.trim() || (locale === 'es' ? 'allí' : 'there');
  const refundAmount = refund ? formatCurrency(refund.amountCents, refund.currency, locale) : null;

  const detailsRows: Array<[string, string]> = [
    [copy.detailLabels.session, sessionType],
    [copy.detailLabels.location, locationLine(location, locale)],
    [copy.detailLabels.when, dateTimeLine(slot, locale)],
    ...(refundAmount ? ([[copy.detailLabels.refund, refundAmount]] as Array<[string, string]>) : []),
  ];
  const refundLine = refundAmount ? copy.refunded(refundAmount) : copy.noRefund;

  const html = renderHtmlEmail({
    preheading: copy.heading,
    heading: copy.heading,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(copy.greeting(clientName))}</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(copy.intro)}</p>
      ${detailsBlockHtml(detailsRows)}
      <p style="margin:16px 0 4px;font-size:15px;line-height:1.5;">${escapeHtml(refundLine)}</p>
      <p style="margin:16px 0 4px;font-size:15px;line-height:1.5;">${escapeHtml(copy.closing)}</p>
      <p style="margin:16px 0 0;font-size:15px;line-height:1.5;">${copy.signoff}</p>
    `,
  });

  const text = [
    copy.greeting(clientName),
    '',
    copy.intro,
    '',
    ...detailsRows.map(([label, value]) => `${label}: ${value}`),
    '',
    refundLine,
    '',
    copy.closing,
    '',
    copy.signoff,
  ].join('\n');

  return { subject: copy.subject(sessionType), html, text };
}

// ---------------------------------------------------------------------------
// Abandoned checkout follow-up (client-facing, bilingual)
// ---------------------------------------------------------------------------

const abandonedCartCopy = {
  en: {
    subject: "You didn't finish your booking — there's still time",
    heading: 'Still thinking it over?',
    greeting: (name: string) => `Hi ${name},`,
    intro:
      "You started booking your photo session with us but didn't get to finish. There's still time — but spots fill up fast, especially this season.",
    sessionLabel: 'Session',
    pickedLabel: 'You had picked',
    pickedNote: 'That time may have been taken since — if so, just choose another one.',
    cta: 'Finish my booking',
    discount: (code: string) => `Your discount code ${code} is still active.`,
    closing: 'Questions before booking? Just reply to this email and we\'ll help.',
    optOut: "If you're no longer interested, simply ignore this email — we won't write to you about it again.",
    signoff: '— Doug & Paola, Dopa Studio',
  },
  es: {
    subject: 'No terminaste tu reserva — aún estás a tiempo',
    heading: '¿Todavía lo estás pensando?',
    greeting: (name: string) => `Hola ${name},`,
    intro:
      'Empezaste a reservar tu sesión de fotos con nosotros pero no llegaste a terminar. Aún estás a tiempo, pero los cupos se llenan rápido, sobre todo en esta temporada.',
    sessionLabel: 'Sesión',
    pickedLabel: 'Habías elegido',
    pickedNote: 'Puede que ese horario ya se haya ocupado; si es así, elige otro.',
    cta: 'Terminar mi reserva',
    discount: (code: string) => `Tu código de descuento ${code} sigue activo.`,
    closing: '¿Tienes dudas antes de reservar? Responde a este correo y con gusto te ayudamos.',
    optOut: 'Si ya no te interesa, simplemente ignora este correo; no volveremos a escribirte sobre esta reserva.',
    signoff: '— Doug & Paola, Dopa Studio',
  },
} satisfies Record<Locale, {
  subject: string;
  heading: string;
  greeting: (name: string) => string;
  intro: string;
  sessionLabel: string;
  pickedLabel: string;
  pickedNote: string;
  cta: string;
  discount: (code: string) => string;
  closing: string;
  optOut: string;
  signoff: string;
}>;

export function buildAbandonedCartEmail(params: {
  clientName: string | null;
  landingPage: LandingPage;
  location: Location | null;
  slot: AvailabilitySlot | null;
  locale: Locale;
  bookUrl: string;
  discountCode: string | null;
}): EmailContent {
  const { landingPage, location, slot, locale, bookUrl, discountCode } = params;
  const copy = abandonedCartCopy[locale];
  // The page's eyebrow ("Sesiones de Navidad") names the session best; the
  // headline is marketing copy. Strip the **duo** markers either way.
  const eyebrow = (locale === 'es' ? landingPage.eyebrow_es : landingPage.eyebrow_en)?.trim();
  const sessionType = (eyebrow || sessionTypeLabel(landingPage, locale)).replace(/\*\*/g, '');
  const name = params.clientName?.trim() || (locale === 'es' ? 'allí' : 'there');
  const picked = slot ? `${dateTimeLine(slot, locale)}${location ? ` — ${location.name}` : ''}` : null;

  const html = renderHtmlEmail({
    preheading: copy.subject,
    heading: copy.heading,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(copy.greeting(name))}</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(copy.intro)}</p>
      ${detailsBlockHtml([[copy.sessionLabel, sessionType], ...(picked ? ([[copy.pickedLabel, picked]] as Array<[string, string]>) : [])])}
      ${picked ? `<p style="margin:0 0 4px;font-size:13px;line-height:1.5;color:#7a7168;">${escapeHtml(copy.pickedNote)}</p>` : ''}
      ${discountCode ? `<p style="margin:12px 0 0;font-size:15px;line-height:1.5;font-weight:bold;">${escapeHtml(copy.discount(discountCode))}</p>` : ''}
      ${buttonHtml(copy.cta, bookUrl)}
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(copy.closing)}</p>
      <p style="margin:16px 0 0;font-size:15px;line-height:1.5;">${copy.signoff}</p>
      <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#7a7168;">${escapeHtml(copy.optOut)}</p>
    `,
  });

  const text = [
    copy.greeting(name),
    '',
    copy.intro,
    '',
    `${copy.sessionLabel}: ${sessionType}`,
    ...(picked ? [`${copy.pickedLabel}: ${picked}`, copy.pickedNote] : []),
    ...(discountCode ? ['', copy.discount(discountCode)] : []),
    '',
    `${copy.cta}: ${bookUrl}`,
    '',
    copy.closing,
    '',
    copy.signoff,
    '',
    copy.optOut,
  ].join('\n');

  return { subject: copy.subject, html, text };
}

// ---------------------------------------------------------------------------
// Invoices (client-facing, bilingual) + admin "invoice paid" notification
// ---------------------------------------------------------------------------

const invoiceCopy = {
  en: {
    subject: (num: string) => `Invoice ${num} from Dopa Studio`,
    heading: (num: string) => `Invoice ${num}`,
    greeting: (name: string) => `Hi ${name},`,
    intro: "Here are the details of your photo session. You can review everything and pay securely online.",
    session: 'Session',
    location: 'Location',
    when: 'Date & time',
    due: 'Due',
    discount: 'Discount',
    total: 'Total',
    cta: 'View & pay invoice',
    slotNote: 'Your date is reserved for you while this invoice is pending.',
    closing: "Questions? Just reply to this email and we'll help.",
    paidSubject: (num: string) => `Payment received — Invoice ${num}`,
    paidHeading: 'Thank you! Your payment is confirmed',
    paidIntro: 'We received your payment. Your session is confirmed — see you soon!',
    paidLabel: 'Amount paid',
    signoff: '— Doug & Paola, Dopa Studio',
  },
  es: {
    subject: (num: string) => `Factura ${num} de Dopa Studio`,
    heading: (num: string) => `Factura ${num}`,
    greeting: (name: string) => `Hola ${name},`,
    intro: 'Aquí tienes los detalles de tu sesión de fotos. Puedes revisarlo todo y pagar de forma segura en línea.',
    session: 'Sesión',
    location: 'Ubicación',
    when: 'Fecha y hora',
    due: 'Vence',
    discount: 'Descuento',
    total: 'Total',
    cta: 'Ver y pagar factura',
    slotNote: 'Tu fecha queda reservada para ti mientras esta factura esté pendiente.',
    closing: '¿Tienes preguntas? Responde a este correo y con gusto te ayudamos.',
    paidSubject: (num: string) => `Pago recibido — Factura ${num}`,
    paidHeading: '¡Gracias! Tu pago está confirmado',
    paidIntro: 'Recibimos tu pago. Tu sesión está confirmada — ¡nos vemos pronto!',
    paidLabel: 'Monto pagado',
    signoff: '— Doug & Paola, Dopa Studio',
  },
} as const;

function formatDueDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-US' : 'en-US', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function invoiceRows(
  invoice: Invoice,
  location: Location | null,
  slot: AvailabilitySlot | null,
  locale: Locale
): { details: Array<[string, string]>; lines: Array<[string, string]> } {
  const copy = invoiceCopy[locale];
  const details: Array<[string, string]> = [[copy.session, invoice.title]];
  if (slot) {
    details.push([copy.when, dateTimeLine(slot, locale)]);
    details.push([copy.location, locationLine(location, locale)]);
  }
  if (invoice.due_date) details.push([copy.due, formatDueDate(invoice.due_date, locale)]);

  const lines: Array<[string, string]> = invoice.items.map((item) => [
    item.quantity > 1 ? `${item.description} × ${item.quantity}` : item.description,
    formatCurrency(lineTotalCents(item), invoice.currency, locale),
  ]);
  if (invoice.discount_cents > 0 && subtotalCents(invoice.items) > 0) {
    lines.push([copy.discount, `−${formatCurrency(invoice.discount_cents, invoice.currency, locale)}`]);
  }
  lines.push([copy.total, formatCurrency(invoice.total_cents, invoice.currency, locale)]);
  return { details, lines };
}

export function buildInvoiceEmail(params: {
  invoice: Invoice;
  location: Location | null;
  slot: AvailabilitySlot | null;
  payUrl: string;
}): EmailContent {
  const { invoice, location, slot, payUrl } = params;
  const locale = invoice.locale;
  const copy = invoiceCopy[locale];
  const num = invoiceNumberLabel(invoice.number);
  const name = invoice.client_name?.trim() || (locale === 'es' ? 'allí' : 'there');
  const { details, lines } = invoiceRows(invoice, location, slot, locale);

  const html = renderHtmlEmail({
    preheading: copy.intro,
    heading: copy.heading(num),
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(copy.greeting(name))}</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(copy.intro)}</p>
      ${detailsBlockHtml(details)}
      ${detailsBlockHtml(lines)}
      ${invoice.notes ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.5;white-space:pre-line;">${escapeHtml(invoice.notes)}</p>` : ''}
      ${buttonHtml(copy.cta, payUrl)}
      ${slot ? `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#7a7168;">${escapeHtml(copy.slotNote)}</p>` : ''}
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(copy.closing)}</p>
      <p style="margin:16px 0 0;font-size:15px;line-height:1.5;">${copy.signoff}</p>
    `,
  });
  const text = [
    copy.greeting(name),
    '',
    copy.intro,
    '',
    ...details.map(([l, v]) => `${l}: ${v}`),
    '',
    ...lines.map(([l, v]) => `${l}: ${v}`),
    ...(invoice.notes ? ['', invoice.notes] : []),
    '',
    `${copy.cta}: ${payUrl}`,
    ...(slot ? ['', copy.slotNote] : []),
    '',
    copy.closing,
    '',
    copy.signoff,
  ].join('\n');
  return { subject: copy.subject(num), html, text };
}

export function buildInvoicePaidEmail(params: {
  invoice: Invoice;
  location: Location | null;
  slot: AvailabilitySlot | null;
}): EmailContent {
  const { invoice, location, slot } = params;
  const locale = invoice.locale;
  const copy = invoiceCopy[locale];
  const num = invoiceNumberLabel(invoice.number);
  const name = invoice.client_name?.trim() || (locale === 'es' ? 'allí' : 'there');
  const { details } = invoiceRows({ ...invoice, due_date: null }, location, slot, locale);
  details.push([copy.paidLabel, formatCurrency(invoice.total_cents, invoice.currency, locale)]);

  const html = renderHtmlEmail({
    preheading: copy.paidIntro,
    heading: copy.paidHeading,
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(copy.greeting(name))}</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(copy.paidIntro)}</p>
      ${detailsBlockHtml(details)}
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(copy.closing)}</p>
      <p style="margin:16px 0 0;font-size:15px;line-height:1.5;">${copy.signoff}</p>
    `,
  });
  const text = [copy.greeting(name), '', copy.paidIntro, '', ...details.map(([l, v]) => `${l}: ${v}`), '', copy.closing, '', copy.signoff].join('\n');
  return { subject: copy.paidSubject(num), html, text };
}

export function buildAdminInvoicePaidEmail(params: {
  invoice: Invoice;
  location: Location | null;
  slot: AvailabilitySlot | null;
}): EmailContent {
  const { invoice, location, slot } = params;
  const num = invoiceNumberLabel(invoice.number);
  const amount = formatCurrency(invoice.total_cents, invoice.currency, 'en');
  const who = invoice.client_name?.trim() || invoice.client_email;
  const summary = `Invoice ${num} paid: ${who}, ${amount}`;
  const rows: Array<[string, string]> = [
    ['Client', `${who} (${invoice.client_email}${invoice.client_phone ? `, ${invoice.client_phone}` : ''})`],
    ['Invoice', `${num} — ${invoice.title}`],
    ...(slot ? ([['When', formatSlotDateTime(slot.start_time, 'en')]] as Array<[string, string]>) : []),
    ...(location ? ([['Location', location.name]] as Array<[string, string]>) : []),
    ['Amount', amount],
  ];
  const html = renderHtmlEmail({
    heading: 'Invoice paid',
    bodyHtml: `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(summary)}</p>${detailsBlockHtml(rows)}`,
  });
  return { subject: summary, html, text: [summary, '', ...rows.map(([l, v]) => `${l}: ${v}`)].join('\n') };
}
