import 'server-only';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import type {
  AvailabilitySlot,
  Booking,
  Client,
  DiscountCode,
  Hold,
  LandingPage,
  Locale,
  Location,
  Studio,
} from '@/types/db';

// Internal helpers shared by the payment route handlers (holds / checkout /
// upsell-checkout / webhooks). Lives under `src/app/api/_lib/` — the leading
// underscore keeps Next's App Router from treating it as a route segment.
//
// NOTE on typing: `src/types/db.ts` is hand-written and its schema type does
// not carry the `Views` / `Functions` / `Relationships` metadata that
// `supabase-js` (2.x) needs for query inference — with it, `.select()` rows
// resolve to `never` and `.insert()/.update()` payloads are rejected. Rather
// than fight that here (the type file is owned elsewhere), the client is
// aliased to a loosely-typed `SupabaseClient` and every read is cast
// explicitly to the row interfaces from `@/types/db`, so all the code below
// this boundary stays properly typed.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type AdminDb = SupabaseClient<any, 'public', any>;

export function adminDb(): AdminDb {
  return createAdminSupabaseClient() as unknown as AdminDb;
}

export function jsonError(
  status: number,
  error: string,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error, ...extra }, { status });
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function isHoldLive(hold: Hold, at: number = Date.now()): boolean {
  return !hold.released && Date.parse(hold.expires_at) > at;
}

// ---------------------------------------------------------------------------
// Row fetch helpers
// ---------------------------------------------------------------------------

export async function fetchHold(db: AdminDb, holdId: string): Promise<Hold | null> {
  const { data, error } = await db.from('holds').select('*').eq('id', holdId).maybeSingle();
  if (error) throw error;
  return (data as Hold | null) ?? null;
}

export async function fetchSlot(
  db: AdminDb,
  slotId: string
): Promise<AvailabilitySlot | null> {
  const { data, error } = await db
    .from('availability_slots')
    .select('*')
    .eq('id', slotId)
    .maybeSingle();
  if (error) throw error;
  return (data as AvailabilitySlot | null) ?? null;
}

export async function fetchLocation(
  db: AdminDb,
  locationId: string
): Promise<Location | null> {
  const { data, error } = await db
    .from('locations')
    .select('*')
    .eq('id', locationId)
    .maybeSingle();
  if (error) throw error;
  return (data as Location | null) ?? null;
}

export async function fetchStudio(db: AdminDb, studioId: string): Promise<Studio | null> {
  const { data, error } = await db.from('studios').select('*').eq('id', studioId).maybeSingle();
  if (error) throw error;
  return (data as Studio | null) ?? null;
}

export async function fetchLandingPage(
  db: AdminDb,
  landingPageId: string
): Promise<LandingPage | null> {
  const { data, error } = await db
    .from('landing_pages')
    .select('*')
    .eq('id', landingPageId)
    .maybeSingle();
  if (error) throw error;
  return (data as LandingPage | null) ?? null;
}

export async function fetchBooking(db: AdminDb, bookingId: string): Promise<Booking | null> {
  const { data, error } = await db.from('bookings').select('*').eq('id', bookingId).maybeSingle();
  if (error) throw error;
  return (data as Booking | null) ?? null;
}

export async function fetchClient(db: AdminDb, clientId: string): Promise<Client | null> {
  const { data, error } = await db.from('clients').select('*').eq('id', clientId).maybeSingle();
  if (error) throw error;
  return (data as Client | null) ?? null;
}

/**
 * Resolve slot -> location -> studio in one go. Returns null if any link in the
 * chain is missing.
 */
export async function resolveSlotChain(
  db: AdminDb,
  slotId: string
): Promise<{ slot: AvailabilitySlot; location: Location; studio: Studio } | null> {
  const slot = await fetchSlot(db, slotId);
  if (!slot) return null;
  const location = await fetchLocation(db, slot.location_id);
  if (!location) return null;
  const studio = await fetchStudio(db, location.studio_id);
  if (!studio) return null;
  return { slot, location, studio };
}

// ---------------------------------------------------------------------------
// Availability — the TS mirror of the `slot_is_available(uuid)` SQL function.
//
// Implemented as explicit queries rather than `.rpc()` because the hand-written
// `Database` type has no `Functions` map (so `.rpc()` is untyped), and because
// doing it here lets the caller exclude its *own* freshly-inserted hold from
// the check, which is what makes the insert-then-verify race resolution below
// possible.
// ---------------------------------------------------------------------------

export async function slotHasBlockingBooking(db: AdminDb, slotId: string): Promise<boolean> {
  const { data, error } = await db
    .from('bookings')
    .select('id')
    .eq('slot_id', slotId)
    .in('status', ['pending', 'confirmed'])
    .limit(1);
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

export async function slotHasLiveHold(
  db: AdminDb,
  slotId: string,
  ignoreHoldId?: string
): Promise<boolean> {
  let query = db
    .from('holds')
    .select('id')
    .eq('slot_id', slotId)
    .eq('released', false)
    .gt('expires_at', nowIso())
    .limit(1);
  if (ignoreHoldId) {
    query = query.neq('id', ignoreHoldId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

/** Equivalent of `slot_is_available(slotId)`, optionally ignoring one hold. */
export async function slotIsAvailable(
  db: AdminDb,
  slotId: string,
  ignoreHoldId?: string
): Promise<boolean> {
  if (await slotHasBlockingBooking(db, slotId)) return false;
  if (await slotHasLiveHold(db, slotId, ignoreHoldId)) return false;
  return true;
}

export async function releaseHold(db: AdminDb, holdId: string): Promise<void> {
  const { error } = await db.from('holds').update({ released: true }).eq('id', holdId);
  if (error) throw error;
}

/**
 * Release the live hold that a booking was made against: the most recent
 * unreleased hold on the booking's slot.
 */
export async function releaseHoldForSlot(db: AdminDb, slotId: string): Promise<void> {
  const { data, error } = await db
    .from('holds')
    .select('id')
    .eq('slot_id', slotId)
    .eq('released', false)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const holdId = (data as { id: string }[] | null)?.[0]?.id;
  if (holdId) {
    await releaseHold(db, holdId);
  }
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

/**
 * Upsert the CRM client row for a studio+email. Only overwrites name/phone
 * when the incoming values are non-empty, so a later booking with a blank
 * phone number never wipes data we already have.
 */
export async function upsertClient(
  db: AdminDb,
  params: { studioId: string; email: string; name?: string | null; phone?: string | null }
): Promise<Client> {
  const email = params.email.trim().toLowerCase();

  const { data: existingData, error: existingError } = await db
    .from('clients')
    .select('*')
    .eq('studio_id', params.studioId)
    .eq('email', email)
    .maybeSingle();
  if (existingError) throw existingError;

  const existing = (existingData as Client | null) ?? null;
  const name = params.name?.trim() || null;
  const phone = params.phone?.trim() || null;

  if (existing) {
    const patch: Partial<Client> = {};
    if (name && name !== existing.name) patch.name = name;
    if (phone && phone !== existing.phone) patch.phone = phone;
    if (Object.keys(patch).length === 0) return existing;

    const { data, error } = await db
      .from('clients')
      .update(patch)
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data as Client;
  }

  const { data, error } = await db
    .from('clients')
    .insert({ studio_id: params.studioId, email, name, phone })
    .select('*')
    .single();
  if (error) {
    // Lost an insert race on the unique (studio_id, email) index — re-read.
    const { data: raced, error: racedError } = await db
      .from('clients')
      .select('*')
      .eq('studio_id', params.studioId)
      .eq('email', email)
      .maybeSingle();
    if (racedError || !raced) throw error;
    return raced as Client;
  }
  return data as Client;
}

// ---------------------------------------------------------------------------
// Discounts
// ---------------------------------------------------------------------------

export function isDiscountUsable(code: DiscountCode, at: number = Date.now()): boolean {
  if (!code.is_active) return false;
  if (code.expires_at && Date.parse(code.expires_at) <= at) return false;
  if (code.max_uses !== null && code.times_used >= code.max_uses) return false;
  return true;
}

/** Apply a discount to a base amount in cents. Never returns a negative value. */
export function applyDiscount(baseCents: number, code: DiscountCode | null): number {
  if (!code) return Math.max(0, Math.round(baseCents));
  const base = Math.max(0, Math.round(baseCents));
  if (code.type === 'percent') {
    const pct = Math.min(100, Math.max(0, Number(code.value)));
    return Math.max(0, base - Math.round((base * pct) / 100));
  }
  // 'fixed' — `value` is an amount in cents.
  const off = Math.max(0, Math.round(Number(code.value)));
  return Math.max(0, base - off);
}

/**
 * Resolve which discount code applies:
 *   1. an active, non-expired code whose `promo_param` matches `promoParam`
 *   2. otherwise the landing page's auto-apply `discount_code_id`
 * Both are scoped to the studio.
 */
export async function resolveDiscountCode(
  db: AdminDb,
  params: { studioId: string; promoParam?: string | null; landingPage: LandingPage }
): Promise<DiscountCode | null> {
  const at = Date.now();
  const promoParam = params.promoParam?.trim();

  if (promoParam) {
    const { data, error } = await db
      .from('discount_codes')
      .select('*')
      .eq('studio_id', params.studioId)
      .eq('promo_param', promoParam)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const match = ((data as DiscountCode[] | null) ?? []).find((code) =>
      isDiscountUsable(code, at)
    );
    if (match) return match;
  }

  if (params.landingPage.discount_code_id) {
    const { data, error } = await db
      .from('discount_codes')
      .select('*')
      .eq('id', params.landingPage.discount_code_id)
      .eq('studio_id', params.studioId)
      .maybeSingle();
    if (error) throw error;
    const code = (data as DiscountCode | null) ?? null;
    if (code && isDiscountUsable(code, at)) return code;
  }

  return null;
}

async function incrementDiscountUse(db: AdminDb, discountCodeId: string): Promise<void> {
  // Read-then-write: `times_used` is a soft cap used for reporting and
  // `max_uses` enforcement, not a correctness-critical counter, so the small
  // lost-update window under heavy concurrency is acceptable. (A future
  // migration could add a `increment_discount_use(uuid)` SQL function.)
  const { data, error } = await db
    .from('discount_codes')
    .select('times_used')
    .eq('id', discountCodeId)
    .maybeSingle();
  if (error || !data) return;
  const current = (data as { times_used: number }).times_used ?? 0;
  await db
    .from('discount_codes')
    .update({ times_used: current + 1 })
    .eq('id', discountCodeId);
}

// ---------------------------------------------------------------------------
// Emails
//
// `src/lib/email` is owned by the email-integrator agent and may not exist (or
// may throw) when this code runs. It is imported dynamically inside a
// try/catch and typed through a local structural interface so neither a missing
// module nor a signature change can break payment processing: a booking must
// end up confirmed even if the email fails.
// ---------------------------------------------------------------------------

interface BookingEmailContext {
  booking: Booking;
  client: Client;
  landingPage: LandingPage;
  location: Location | null;
  slot: AvailabilitySlot | null;
  locale: Locale;
}

// `typeof import(...)` is a type-only reference (no runtime require), so the
// calls below are checked against the email agent's real signatures while the
// actual load stays inside a try/catch. `Partial<>` means an export that isn't
// there yet is a no-op rather than a TypeError.
type EmailModule = Partial<typeof import('@/lib/email')>;

async function loadEmailModule(): Promise<EmailModule | null> {
  try {
    return (await import('@/lib/email')) as EmailModule;
  } catch (error) {
    console.error('[payments] email module unavailable', error);
    return null;
  }
}

export async function sendBookingEmailsSafely(ctx: BookingEmailContext): Promise<void> {
  const mod = await loadEmailModule();
  if (!mod) return;

  try {
    await mod.sendBookingConfirmation?.(ctx);
  } catch (error) {
    console.error('[payments] sendBookingConfirmation failed', {
      bookingId: ctx.booking.id,
      error,
    });
  }

  try {
    const { locale: _locale, ...adminCtx } = ctx;
    await mod.sendAdminBookingNotification?.(adminCtx);
  } catch (error) {
    console.error('[payments] sendAdminBookingNotification failed', {
      bookingId: ctx.booking.id,
      error,
    });
  }
}

// ---------------------------------------------------------------------------
// Confirmation
// ---------------------------------------------------------------------------

/**
 * Idempotently move a booking to `confirmed`: stamp `paid_at` / the payment
 * intent, release the slot's live hold, bump the discount-code usage counter,
 * and fire the notification emails.
 *
 * Safe to call twice for the same booking (Stripe retries webhooks): the
 * status transition is guarded so the side effects only run once.
 */
export async function confirmBooking(
  db: AdminDb,
  params: {
    bookingId: string;
    paymentIntentId?: string | null;
    checkoutSessionId?: string | null;
    locale?: Locale;
  }
): Promise<{ ok: boolean; alreadyConfirmed: boolean }> {
  const booking = await fetchBooking(db, params.bookingId);
  if (!booking) {
    console.error('[payments] confirmBooking: booking not found', params.bookingId);
    return { ok: false, alreadyConfirmed: false };
  }

  if (booking.status === 'confirmed') {
    // Still backfill the payment intent id if a later event carries it.
    if (params.paymentIntentId && !booking.stripe_payment_intent_id) {
      await db
        .from('bookings')
        .update({ stripe_payment_intent_id: params.paymentIntentId })
        .eq('id', booking.id);
    }
    return { ok: true, alreadyConfirmed: true };
  }

  const patch: Partial<Booking> = {
    status: 'confirmed',
    paid_at: booking.paid_at ?? nowIso(),
  };
  if (params.paymentIntentId) patch.stripe_payment_intent_id = params.paymentIntentId;
  if (params.checkoutSessionId) patch.stripe_checkout_session_id = params.checkoutSessionId;

  // Guarded update: only transition out of a non-confirmed state, so two
  // concurrent webhook deliveries can't both run the side effects.
  const { data, error } = await db
    .from('bookings')
    .update(patch)
    .eq('id', booking.id)
    .neq('status', 'confirmed')
    .select('*');
  if (error) throw error;

  const updated = (data as Booking[] | null) ?? [];
  if (updated.length === 0) {
    // Someone else confirmed it between our read and write.
    return { ok: true, alreadyConfirmed: true };
  }

  const confirmed = updated[0];

  if (confirmed.slot_id) {
    try {
      await releaseHoldForSlot(db, confirmed.slot_id);
    } catch (error) {
      console.error('[payments] failed to release hold for slot', {
        slotId: confirmed.slot_id,
        error,
      });
    }
  }

  if (confirmed.discount_code_id) {
    try {
      await incrementDiscountUse(db, confirmed.discount_code_id);
    } catch (error) {
      console.error('[payments] failed to increment discount usage', error);
    }
  }

  const client = confirmed.client_id ? await fetchClient(db, confirmed.client_id) : null;
  const landingPage = confirmed.landing_page_id
    ? await fetchLandingPage(db, confirmed.landing_page_id)
    : null;
  const location = confirmed.location_id ? await fetchLocation(db, confirmed.location_id) : null;
  const slot = confirmed.slot_id ? await fetchSlot(db, confirmed.slot_id) : null;

  const studio = await fetchStudio(db, confirmed.studio_id);
  const locale: Locale = params.locale ?? studio?.default_locale ?? 'en';

  if (client && landingPage) {
    await sendBookingEmailsSafely({
      booking: confirmed,
      client,
      landingPage,
      location,
      slot,
      locale,
    });
  } else {
    console.error('[payments] skipping booking emails — missing client or landing page', {
      bookingId: confirmed.id,
      hasClient: Boolean(client),
      hasLandingPage: Boolean(landingPage),
    });
  }

  return { ok: true, alreadyConfirmed: false };
}
