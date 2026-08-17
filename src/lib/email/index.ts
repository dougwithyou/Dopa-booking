import 'server-only';
import type { AvailabilitySlot, Booking, Client, Hold, LandingPage, Location, Locale } from '@/types/db';
import { sendEmailSafe } from './client';
import { resolveLocale } from './format';
import {
  buildAdminBookingNotificationEmail,
  buildBookingConfirmationEmail,
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
