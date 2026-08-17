import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb, jsonError } from '@/app/api/_lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HoldIdSchema = z.string().uuid();

/**
 * DELETE /api/holds/[holdId]
 *
 * Releases a hold so the slot immediately frees up again. Called by the client
 * when the user backs out before checkout (or on unload).
 *
 * 204 on success. Intentionally idempotent — releasing an already-released or
 * unknown hold still returns 204 so a duplicate beacon never surfaces an error
 * to the user.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { holdId: string } }
) {
  const parsed = HoldIdSchema.safeParse(params.holdId);
  if (!parsed.success) {
    return jsonError(400, 'invalid_request');
  }

  try {
    const db = adminDb();
    const { error } = await db
      .from('holds')
      .update({ released: true })
      .eq('id', parsed.data)
      .eq('released', false);
    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[holds] DELETE failed', error);
    return jsonError(500, 'release_failed');
  }
}
