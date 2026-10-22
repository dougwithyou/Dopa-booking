import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb, applyDiscount, fetchLandingPage, jsonError, resolveDiscountByCode } from '@/app/api/_lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/discount/preview
 *
 * Validates a discount code typed on the checkout step so the ticket can
 * show the discounted price before paying. /api/checkout re-validates the
 * same code server-side, so this is display-only.
 *
 * Body: { landingPageId, code }
 * 200: { code, type, value, currency, sessionCents }
 * 404: { error: 'invalid_discount_code' } — unknown, inactive, expired or used up
 */
const PreviewSchema = z.object({
  landingPageId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
});

export async function POST(request: NextRequest) {
  let payload: z.infer<typeof PreviewSchema>;
  try {
    payload = PreviewSchema.parse(await request.json());
  } catch {
    return jsonError(400, 'invalid_request');
  }

  try {
    const db = adminDb();
    const page = await fetchLandingPage(db, payload.landingPageId);
    if (!page || page.status !== 'published') return jsonError(404, 'landing_page_not_found');

    const code = await resolveDiscountByCode(db, {
      studioId: page.studio_id,
      code: payload.code,
      landingPageId: page.id,
    });
    if (!code) return jsonError(404, 'invalid_discount_code');

    return NextResponse.json({
      code: code.code,
      type: code.type,
      value: code.value,
      currency: code.currency,
      sessionCents: applyDiscount(page.base_price_cents ?? 0, code),
    });
  } catch (error) {
    console.error('[discount/preview] failed', error);
    return jsonError(500, 'preview_failed');
  }
}
