import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { Hold } from '@/types/db';
import {
  adminDb,
  fetchLandingPage,
  jsonError,
  nowIso,
  releaseHold,
  resolveSlotChain,
  slotHasBlockingBooking,
  slotIsAvailable,
  type AdminDb,
} from '@/app/api/_lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateHoldSchema = z.object({
  slotId: z.string().uuid(),
  landingPageId: z.string().uuid(),
  clientName: z.string().trim().min(1).max(200),
  clientEmail: z.string().trim().email().max(320),
  clientPhone: z.string().trim().max(50).nullish(),
});

/**
 * POST /api/holds
 *
 * Body: { slotId, landingPageId, clientName, clientEmail, clientPhone? }
 * 200:  { holdId, expiresAt }
 * 409:  { error: 'slot_unavailable' }
 *
 * Race safety
 * -----------
 * There is no way to take a row lock through the REST API, so this uses an
 * insert-then-verify (optimistic) protocol:
 *
 *   1. re-check availability server-side (never trust the client)
 *   2. insert the hold
 *   3. re-check for *competing* live holds and blocking bookings, ignoring our
 *      own row
 *   4. if a competitor exists, both requests deterministically pick the same
 *      winner (oldest `created_at`, tie-broken by uuid), and the loser releases
 *      its own hold and returns 409
 *
 * Because step 4 is a pure function of DB-assigned values, two simultaneous
 * requests can never both believe they won.
 */
export async function POST(request: NextRequest) {
  let payload: z.infer<typeof CreateHoldSchema>;
  try {
    payload = CreateHoldSchema.parse(await request.json());
  } catch (error) {
    return jsonError(400, 'invalid_request', {
      details: error instanceof z.ZodError ? error.flatten() : undefined,
    });
  }

  const db = adminDb();

  try {
    const chain = await resolveSlotChain(db, payload.slotId);
    if (!chain) {
      return jsonError(404, 'slot_not_found');
    }
    const { slot, studio } = chain;

    if (slot.is_blocked) {
      return jsonError(409, 'slot_unavailable');
    }

    if (Date.parse(slot.start_time) <= Date.now()) {
      return jsonError(409, 'slot_unavailable');
    }

    // Guard the FK (and cross-studio mixups) before inserting.
    const landingPage = await fetchLandingPage(db, payload.landingPageId);
    if (!landingPage || landingPage.studio_id !== studio.id) {
      return jsonError(404, 'landing_page_not_found');
    }

    // (1) Server-side availability re-check.
    if (!(await slotIsAvailable(db, slot.id))) {
      return jsonError(409, 'slot_unavailable');
    }

    // Hold duration always comes from the studio row, never a constant.
    const holdMinutes =
      Number.isFinite(studio.hold_duration_minutes) && studio.hold_duration_minutes > 0
        ? studio.hold_duration_minutes
        : 15;
    const expiresAt = new Date(Date.now() + holdMinutes * 60_000).toISOString();

    // (2) Insert.
    const { data: inserted, error: insertError } = await db
      .from('holds')
      .insert({
        slot_id: slot.id,
        landing_page_id: payload.landingPageId,
        client_name: payload.clientName,
        client_email: payload.clientEmail.toLowerCase(),
        client_phone: payload.clientPhone?.trim() || null,
        expires_at: expiresAt,
        released: false,
      })
      .select('*')
      .single();
    if (insertError) throw insertError;

    const hold = inserted as Hold;

    // (3) + (4) Resolve any race we just walked into.
    const lost = await lostHoldRace(db, hold);
    if (lost) {
      await releaseHold(db, hold.id).catch((error) =>
        console.error('[holds] failed to release losing hold', { holdId: hold.id, error })
      );
      return jsonError(409, 'slot_unavailable');
    }

    return NextResponse.json({ holdId: hold.id, expiresAt: hold.expires_at });
  } catch (error) {
    console.error('[holds] POST failed', error);
    return jsonError(500, 'hold_failed');
  }
}

/**
 * Did `hold` lose a race for its slot? A booking always wins; among competing
 * live holds the oldest wins (uuid tie-break for identical timestamps).
 */
async function lostHoldRace(db: AdminDb, hold: Hold): Promise<boolean> {
  if (await slotHasBlockingBooking(db, hold.slot_id)) {
    return true;
  }

  const { data, error } = await db
    .from('holds')
    .select('id, created_at')
    .eq('slot_id', hold.slot_id)
    .eq('released', false)
    .gt('expires_at', nowIso())
    .neq('id', hold.id);
  if (error) throw error;

  const competitors = (data as { id: string; created_at: string }[] | null) ?? [];
  const mine = Date.parse(hold.created_at);

  return competitors.some((other) => {
    const theirs = Date.parse(other.created_at);
    if (theirs < mine) return true;
    if (theirs > mine) return false;
    return other.id < hold.id;
  });
}
