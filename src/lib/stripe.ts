import 'server-only';
import Stripe from 'stripe';

// Platform-level Stripe client.
//
// IMPORTANT: the key in `STRIPE_SECRET_KEY` belongs to the PLATFORM account.
// It is only ever used to (a) drive the Connect OAuth flow, (b) verify webhook
// signatures, and (c) make calls *on behalf of* a connected account by passing
// `{ stripeAccount }` as request options.
//
// Every booking / upsell charge MUST be created on the studio's connected
// account. Always pass `connectedAccount(studio.stripe_account_id)` as the
// second (request options) argument to the SDK call — e.g.
//
//   stripe.checkout.sessions.create(params, connectedAccount(accountId))
//
// Never hardcode keys here; they only ever come from `process.env`.

// Pinned to the API version bundled with the installed stripe-node major (17.x).
export const STRIPE_API_VERSION = '2024-09-30.acacia';

let cachedStripe: Stripe | null = null;

/**
 * Lazily-constructed singleton Stripe client.
 *
 * Lazy on purpose: route modules get imported during `next build`, where
 * `STRIPE_SECRET_KEY` may legitimately be absent. Constructing on first use
 * means a missing key surfaces as a runtime 500 on the route that needs it
 * rather than breaking the build.
 */
export function getStripe(): Stripe {
  if (!cachedStripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    cachedStripe = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION as Stripe.StripeConfig['apiVersion'],
      typescript: true,
      appInfo: { name: 'Dopa Studio Booking' },
    });
  }
  return cachedStripe;
}

/**
 * Request options that route an API call through a studio's connected account
 * (direct charges — the money lands in the studio's Stripe balance).
 */
export function connectedAccount(accountId: string): Stripe.RequestOptions {
  return { stripeAccount: accountId };
}

/**
 * Direct-charge mode (`STRIPE_DIRECT_CHARGES=true`): the studio owner's own
 * Stripe account IS the platform account (the one whose keys are in
 * STRIPE_SECRET_KEY), so payments are created on it directly instead of on
 * a Connect-linked account. Stripe can't OAuth-connect an account to
 * itself, hence this mode instead of Connect.
 */
export function directChargesEnabled(): boolean {
  return process.env.STRIPE_DIRECT_CHARGES === 'true';
}

/**
 * Request options for charging or refunding on behalf of a studio: none in
 * direct-charge mode (the platform account itself), the studio's connected
 * account otherwise. `null` means Stripe isn't set up for this studio yet.
 */
export function studioStripeOptions(stripeAccountId: string | null): Stripe.RequestOptions | null {
  if (directChargesEnabled()) return {};
  return stripeAccountId ? connectedAccount(stripeAccountId) : null;
}

/** Tags every Checkout Session this app creates, so the webhook can ignore
 * sessions created by other apps sharing the same Stripe account. */
export const APP_METADATA_KEY = 'app';
export const APP_METADATA_VALUE = 'dopa-booking';

/** The platform's Connect OAuth client id (`ca_...`). */
export function getConnectClientId(): string {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!clientId) {
    throw new Error('STRIPE_CONNECT_CLIENT_ID is not set');
  }
  return clientId;
}

/** Absolute site origin, without a trailing slash. */
export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_SITE_URL is not set');
  }
  return url.replace(/\/+$/, '');
}
