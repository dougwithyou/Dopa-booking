import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { adminDb, fetchStudio, nowIso } from '@/app/api/_lib/payments';
import type { Studio } from '@/types/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().uuid(),
});

/**
 * GET /api/stripe/connect/callback?code=...&state=<studioId>
 *
 * Exchanges the OAuth code for the connected account id and stores it on the
 * studio row (service-role client — `studios` has no anon write policy), then
 * bounces back to /admin/settings.
 *
 * Security: `state` is only a studio id, so it is not by itself proof of intent.
 * The caller's admin session is re-verified against `state` before anything is
 * written — otherwise an attacker could complete the OAuth dance with their own
 * Stripe account and redirect the studio's payouts to themselves.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const searchParams = request.nextUrl.searchParams;

  // Stripe reports user-facing denials as ?error=access_denied.
  const stripeError = searchParams.get('error');
  if (stripeError) {
    return redirectToSettings(origin, {
      connected: '0',
      error: stripeError.slice(0, 100),
    });
  }

  const parsed = CallbackSchema.safeParse({
    code: searchParams.get('code') ?? '',
    state: searchParams.get('state') ?? '',
  });
  if (!parsed.success) {
    return redirectToSettings(origin, { connected: '0', error: 'invalid_callback' });
  }
  const { code, state: studioId } = parsed.data;

  // ---- Re-verify the admin session ---------------------------------------
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return redirectToSettings(origin, { connected: '0', error: 'unauthorized' });
    }

    const { data, error } = await supabase
      .from('studio_admins')
      .select('studio_id')
      .eq('user_id', user.id)
      .eq('studio_id', studioId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return redirectToSettings(origin, { connected: '0', error: 'unauthorized' });
    }
  } catch (error) {
    console.error('[connect/callback] admin verification failed', error);
    return redirectToSettings(origin, { connected: '0', error: 'unauthorized' });
  }

  // ---- Exchange the code --------------------------------------------------
  let accountId: string;
  try {
    const token = await getStripe().oauth.token({
      grant_type: 'authorization_code',
      code,
    });
    if (!token.stripe_user_id) {
      throw new Error('OAuth token response had no stripe_user_id');
    }
    accountId = token.stripe_user_id;
  } catch (error) {
    console.error('[connect/callback] token exchange failed', error);
    return redirectToSettings(origin, { connected: '0', error: 'token_exchange_failed' });
  }

  // ---- Read the account's onboarding state --------------------------------
  let chargesEnabled = false;
  let detailsSubmitted = false;
  try {
    const account = await getStripe().accounts.retrieve(accountId);
    chargesEnabled = account.charges_enabled === true;
    detailsSubmitted = account.details_submitted === true;
  } catch (error) {
    // Non-fatal: we still have the account id. The settings page can re-check.
    console.error('[connect/callback] accounts.retrieve failed', error);
  }

  // ---- Persist on the studio row (service role) ---------------------------
  try {
    const db = adminDb();
    const studio = await fetchStudio(db, studioId);
    if (!studio) {
      return redirectToSettings(origin, { connected: '0', error: 'studio_not_found' });
    }

    const patch: Partial<Studio> = {
      stripe_account_id: accountId,
      stripe_charges_enabled: chargesEnabled,
      stripe_details_submitted: detailsSubmitted,
    };
    if (!studio.stripe_onboarding_started_at) {
      patch.stripe_onboarding_started_at = nowIso();
    }

    const { error } = await db.from('studios').update(patch).eq('id', studioId);
    if (error) throw error;
  } catch (error) {
    console.error('[connect/callback] failed to save connected account', error);
    return redirectToSettings(origin, { connected: '0', error: 'save_failed' });
  }

  return redirectToSettings(origin, { connected: '1' });
}

function redirectToSettings(origin: string, params: Record<string, string>): NextResponse {
  const url = new URL('/admin/settings', origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url, { status: 302 });
}
