import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb, jsonError, upsertClient } from '@/app/api/_lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  sessionType: z.string().trim().min(2).max(200),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish()
    .or(z.literal('')),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(7).max(40),
  locale: z.enum(['en', 'es']).default('es'),
  /** Honeypot: hidden from people, filled by bots. */
  website: z.string().max(200).optional(),
});

/**
 * POST /api/session-requests — public "Looking for a different session?"
 * form on the session catalog. Stores the request, adds the person to the
 * CRM, emails the admin and sends the client an acknowledgment.
 * 200: { ok: true }   400: { error: 'invalid_request' }
 */
export async function POST(request: NextRequest) {
  let payload: z.infer<typeof RequestSchema>;
  try {
    payload = RequestSchema.parse(await request.json());
  } catch {
    return jsonError(400, 'invalid_request');
  }
  // Bots: pretend success, store nothing.
  if (payload.website) return NextResponse.json({ ok: true });

  const db = adminDb();
  try {
    const { data: studio } = await db.from('studios').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (!studio) return jsonError(500, 'no_studio');
    const email = payload.email.toLowerCase();
    const preferredDate = payload.preferredDate || null;

    // Double-submit guard: same email + session type in the last 10 minutes.
    const { count } = await db
      .from('session_requests')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .eq('session_type', payload.sessionType)
      .gt('created_at', new Date(Date.now() - 10 * 60_000).toISOString());
    if ((count ?? 0) > 0) return NextResponse.json({ ok: true });

    let clientId: string | null = null;
    try {
      const client = await upsertClient(db, {
        studioId: studio.id,
        email,
        name: `${payload.firstName} ${payload.lastName}`,
        phone: payload.phone,
      });
      clientId = client.id;
    } catch (err) {
      console.error('[session-requests] CRM upsert failed', err);
    }

    const { error } = await db.from('session_requests').insert({
      studio_id: studio.id,
      client_id: clientId,
      session_type: payload.sessionType,
      preferred_date: preferredDate,
      first_name: payload.firstName,
      last_name: payload.lastName,
      email,
      phone: payload.phone,
      locale: payload.locale,
    });
    if (error) throw error;

    try {
      const { sendSessionRequestEmails } = await import('@/lib/email');
      await sendSessionRequestEmails({
        sessionType: payload.sessionType,
        preferredDate,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email,
        phone: payload.phone,
        locale: payload.locale,
      });
    } catch (err) {
      console.error('[session-requests] emails failed', err);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[session-requests] failed', error);
    return jsonError(500, 'request_failed');
  }
}
