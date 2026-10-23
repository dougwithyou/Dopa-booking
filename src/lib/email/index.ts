import 'server-only';
import type { AvailabilitySlot, Booking, Client, Hold, LandingPage, Location, Locale } from '@/types/db';
import { sendEmailSafe } from './client';
import { resolveLocale } from './format';
import {
  type BookingEmailExtra,
  buildAbandonedCartEmail,
  buildAdminBookingNotificationEmail,
  buildBookingCancellationEmail,
  buildBookingConfirmationEmail,
  buildContractSignedNotificationEmail,
  buildHoldExpirationReminderEmail,
} from './templates';

// All three functions fail soft: they never throw. A booking (or hold)
// must succeed even if Resend is unreachable, misconfigured, or the API
// key isn't set yet in this environment. Errors are logged via
// console.error inside sendEmailSafe.

/**
 * Sends the client-facing booking confirmation. Bilingual — pass the
 * client's detected locale; falls back to 'en' if unset/invalid.
 */
export async function sendBookingConfirmation(params: {
  booking: Booking;
  client: Client;
  landingPage: LandingPage;
  location: Location | null;
  slot: AvailabilitySlot | null;
  locale: Locale;
  extras?: BookingEmailExtra[];
}): Promise<void> {
  const locale = resolveLocale(params.locale);
  const content = buildBookingConfirmationEmail({ ...params, locale });
  await sendEmailSafe({ to: params.client.email, content });
}

/**
 * Sends the internal "new booking" notification to Doug. Always English,
 * always terse — sent to ADMIN_NOTIFICATION_EMAIL.
 */
export async function sendAdminBookingNotification(params: {
  booking: Booking;
  client: Client;
  landingPage: LandingPage;
  location: Location | null;
  slot: AvailabilitySlot | null;
  extras?: BookingEmailExtra[];
}): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.error('[email] Skipping admin booking notification — ADMIN_NOTIFICATION_EMAIL is not set.');
    return;
  }
  const content = buildAdminBookingNotificationEmail(params);
  await sendEmailSafe({ to: adminEmail, content });
}

/**
 * Sends a client-facing warning that their slot hold is about to expire.
 * Bilingual — pass the locale the hold/checkout flow was in; falls back
 * to 'en' if unset/invalid.
 */
export async function sendHoldExpirationReminder(params: {
  hold: Hold;
  location: Location | null;
  slot: AvailabilitySlot | null;
  locale: Locale;
}): Promise<void> {
  const to = params.hold.client_email;
  if (!to) {
    console.error(`[email] Skipping hold expiration reminder for hold ${params.hold.id} — no client_email on hold.`);
    return;
  }
  const locale = resolveLocale(params.locale);
  const content = buildHoldExpirationReminderEmail({ ...params, locale });
  await sendEmailSafe({ to, content });
}

/**
 * Sends the internal "contract signed" notification to Doug once a client
 * completes e-signature. Always English, always terse — sent to
 * ADMIN_NOTIFICATION_EMAIL.
 */
export async function sendContractSignedNotification(params: {
  contractTitle: string;
  signerName: string;
  clientEmail: string | null;
  signedAtIso: string;
  pdfUrl: string | null;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.error('[email] Skipping contract-signed notification — ADMIN_NOTIFICATION_EMAIL is not set.');
    return;
  }
  const content = buildContractSignedNotificationEmail(params);
  await sendEmailSafe({ to: adminEmail, content });
}

/**
 * Tells the client their booking was cancelled by the studio, and whether a
 * refund was issued. Bilingual; fails soft like the others.
 */
export async function sendBookingCancellation(params: {
  client: Client;
  landingPage: LandingPage | null;
  location: Location | null;
  slot: AvailabilitySlot | null;
  locale: Locale;
  refund: { amountCents: number; currency: string } | null;
}): Promise<void> {
  const content = buildBookingCancellationEmail({ ...params, locale: resolveLocale(params.locale) });
  await sendEmailSafe({ to: params.client.email, content });
}

/**
 * "You didn't finish your booking" follow-up for a checkout the client
 * started (entered their details) but never paid. Bilingual; fails soft.
 */
export async function sendAbandonedCartEmail(params: {
  to: string;
  clientName: string | null;
  landingPage: LandingPage;
  location: Location | null;
  slot: AvailabilitySlot | null;
  locale: Locale;
  bookUrl: string;
  discountCode: string | null;
}): Promise<void> {
  const { to, ...rest } = params;
  const content = buildAbandonedCartEmail({ ...rest, locale: resolveLocale(params.locale) });
  await sendEmailSafe({ to, content });
}
