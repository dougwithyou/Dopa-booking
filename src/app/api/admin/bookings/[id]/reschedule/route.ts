import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getStudioId } from '@/components/admin/lib/data';
import { studioDateTimeToIso } from '@/lib/time';
import type { AvailabilitySlot } from '@/types/db';
import {
  adminDb,
  fetchBooking,
  fetchClient,
  fetchLocation,
  fetchSlot,
  jsonError,
} from '@/app/api/_lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RescheduleSchema = z
  .object({
    // Move to an existing free slot…
    slotId: z.string().uuid().optional(),
    // …or to a custom time (a slot is created for it, studio time).
    custom: z
      .object({
        locationId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^\d{2}:\d{2}$/),
        durationMinutes: z.number().int().min(10).max(600),
      })
      .optional(),
    notify: z.boolean().default(true),
    locale: z.enum(['en', 'es']).default('es'),
  })
  .refine((v) => Boolean(v.slotId) !== Boolean(v.custom), { message: 'slotId or custom, not both' });

/**
 * POST /api/admin/bookings/[id]/reschedule — move a booking to another time.
 * The old slot is freed simply because the booking no longer points at it.
 * 200: { ok, slotId }   409: { error: 'slot_unavailable' | 'booking_cancelled' }
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  let studioId: string;
  try {
    studioId = await getStudioId(supabase);
  } catch {
    return jsonError(401, 'unauthorized');
  }

  let payload: z.infer<typeof RescheduleSchema>;
  try {
    payload = RescheduleSchema.parse(await request.json());
  } catch {
    return jsonError(400, 'invalid_request');
  }

  const db = adminDb();
  const booking = await fetchBooking(db, params.id);
  if (!booking || booking.studio_id !== studioId) return jsonError(404, 'not_found');
  if (booking.status === 'cancelled') return jsonError(409, 'booking_cancelled');

  try {
    let target: AvailabilitySlot | null = null;

    if (payload.slotId) {
      target = await fetchSlot(db, payload.slotId);
      if (!target || target.is_blocked) return jsonError(409, 'slot_unavailable');
      const { data: free } = await db.rpc('slot_is_available', { p_slot_id: target.id });
      if (free === false) return jsonError(409, 'slot_unavailable');
    } else if (payload.custom) {
      const c = payload.custom;
      const start = studioDateTimeToIso(c.date, c.time);
      const end = new Date(Date.parse(start) + c.durationMinutes * 60_000).toISOString();
      // Reuse an existing slot at exactly that time if there is one.
      const { data: existing } = await db
        .from('availability_slots')
        .select('*')
        .eq('location_id', c.locationId)
        .eq('start_time', start)
        .maybeSingle();
      if (existing) {
        target = existing as AvailabilitySlot;
        const { data: free } = await db.rpc('slot_is_available', { p_slot_id: target.id });
        if (free === false || target.is_blocked) return jsonError(409, 'slot_unavailable');
      } else {
        const { data, error } = await db
          .from('availability_slots')
          .insert({ location_id: c.locationId, start_time: start, end_time: end })
          .select('*')
          .single();
        if (error) throw error;
        target = data as AvailabilitySlot;
      }
    }
    if (!target) return jsonError(400, 'invalid_request');

    const location = await fetchLocation(db, target.location_id);
    if (!location || location.studio_id !== studioId) return jsonError(409, 'slot_unavailable');

    const previousSlot = booking.slot_id ? await fetchSlot(db, booking.slot_id) : null;
    const { error: updateError } = await db
      .from('bookings')
      .update({ slot_id: target.id, location_id: target.location_id })
      .eq('id', booking.id);
    if (updateError) throw updateError;
    if (booking.invoice_id) {
      await db.from('invoices').update({ slot_id: target.id, location_id: target.location_id }).eq('id', booking.invoice_id);
    }

    let emailed = false;
    if (payload.notify && booking.client_id) {
      const client = await fetchClient(db, booking.client_id);
      if (client?.email) {
        try {
          const { sendBookingRescheduled } = await import('@/lib/email');
          await sendBookingRescheduled({
            to: client.email,
            clientName: client.name,
            location,
            slot: target,
            previousSlot,
            locale: payload.locale,
          });
          emailed = true;
        } catch (err) {
          console.error('[admin/reschedule] email failed', err);
        }
      }
    }
    return NextResponse.json({ ok: true, slotId: target.id, emailed });
  } catch (error) {
    console.error('[admin/reschedule] failed', error);
    return jsonError(500, 'reschedule_failed');
  }
}
