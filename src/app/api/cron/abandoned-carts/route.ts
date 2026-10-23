import { NextResponse, type NextRequest } from 'next/server';
import { siteUrl } from '@/lib/stripe';
import { isDiscountUsable } from '@/lib/landing/discount';
import type { DiscountCode, Hold, LandingPage, Locale } from '@/types/db';
import { adminDb, fetchLandingPage, fetchLocation, fetchSlot, nowIso } from '@/app/api/_lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A checkout counts as abandoned once its hold has expired and it's been
// at least this long since it started, with no booking from that email.
const MIN_AGE_MS = 45 * 60 * 1000;
// Don't chase checkouts older than this (e.g. the first run after deploy).
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
// At most one follow-up per email in this window, however many carts.
const PER_EMAIL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const BATCH = 50;

/**
 * POST /api/cron/abandoned-carts — run every 15 minutes by Supabase
 * pg_cron (see migration 0022) with `Authorization: Bearer $CRON_SECRET`.
 *
 * Finds checkouts where the client entered their details (a hold with an
 * email) but never booked, and sends one "you didn't finish your booking"
 * email per person. Every hold it looks at is stamped
 * abandoned_email_sent_at (sent or skipped) so it's never processed twice.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = adminDb();
  const now = Date.now();
  const { data, error } = await db
    .from('holds')
    .select('*')
    .not('client_email', 'is', null)
    .is('abandoned_email_sent_at', null)
    .lt('expires_at', new Date(now).toISOString())
    .lt('created_at', new Date(now - MIN_AGE_MS).toISOString())
    .gt('created_at', new Date(now - MAX_AGE_MS).toISOString())
    .order('created_at', { ascending: false })
    .limit(BATCH);
  if (error) {
    console.error('[cron/abandoned-carts] query failed', error);
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }

  // Latest cart per email; the others are just stamped.
  const byEmail = new Map<string, Hold[]>();
  for (const hold of (data as Hold[] | null) ?? []) {
    const email = hold.client_email!.toLowerCase();
    byEmail.set(email, [...(byEmail.get(email) ?? []), hold]);
  }

  let sent = 0;
  let skipped = 0;
  for (const [email, holds] of byEmail) {
    const latest = holds[0];
    const earliest = holds[holds.length - 1];
    const stamp = () =>
      db.from('holds').update({ abandoned_email_sent_at: nowIso() }).in('id', holds.map((h) => h.id));

    try {
      if (await bookedSince(db, email, earliest.created_at)) {
        skipped++;
        await stamp();
        continue;
      }
      if (await recentlyEmailed(db, email, now)) {
        skipped++;
        await stamp();
        continue;
      }

      const page = latest.landing_page_id ? await fetchLandingPage(db, latest.landing_page_id) : null;
      if (!page || page.status !== 'published') {
        skipped++;
        await stamp();
        continue;
      }
      const locale: Locale = latest.locale === 'es' ? 'es' : latest.locale === 'en' ? 'en' : 'es';
      const slot = await fetchSlot(db, latest.slot_id);
      const location = slot ? await fetchLocation(db, slot.location_id) : null;

      // Stamp first: a send failure must not turn into a retry loop.
      await stamp();
      const { sendAbandonedCartEmail } = await import('@/lib/email');
      await sendAbandonedCartEmail({
        to: email,
        clientName: latest.client_name,
        landingPage: page,
        location,
        slot,
        locale,
        bookUrl: `${siteUrl()}/${locale}/l/${page.slug}/book`,
        discountCode: await activeAutoDiscount(db, page),
      });
      sent++;
    } catch (err) {
      console.error('[cron/abandoned-carts] failed for one cart', { holdId: latest.id, err });
    }
  }

  return NextResponse.json({ ok: true, carts: byEmail.size, sent, skipped });
}

type Db = ReturnType<typeof adminDb>;

/** Exact, case-insensitive match for ilike: escape its wildcards. */
function likeExact(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Did this email book (pending or confirmed) after starting the cart? */
async function bookedSince(db: Db, email: string, since: string): Promise<boolean> {
  const { data: clients } = await db.from('clients').select('id').ilike('email', likeExact(email));
  const ids = ((clients as { id: string }[] | null) ?? []).map((c) => c.id);
  if (ids.length === 0) return false;
  const { count } = await db
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .in('client_id', ids)
    .in('status', ['pending', 'confirmed'])
    .gte('created_at', new Date(Date.parse(since) - 60 * 60 * 1000).toISOString());
  return (count ?? 0) > 0;
}

/** Was this email already sent a follow-up recently (another cart)? */
async function recentlyEmailed(db: Db, email: string, now: number): Promise<boolean> {
  const { count } = await db
    .from('holds')
    .select('id', { count: 'exact', head: true })
    .ilike('client_email', likeExact(email))
    .gt('abandoned_email_sent_at', new Date(now - PER_EMAIL_COOLDOWN_MS).toISOString());
  return (count ?? 0) > 0;
}

/** The page's auto-applied discount code, if it's still usable. */
async function activeAutoDiscount(db: Db, page: LandingPage): Promise<string | null> {
  if (!page.discount_code_id) return null;
  const { data } = await db.from('discount_codes').select('*').eq('id', page.discount_code_id).maybeSingle();
  const code = (data as DiscountCode | null) ?? null;
  return code && isDiscountUsable(code) ? code.code : null;
}
