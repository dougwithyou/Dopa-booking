import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getConnectClientId, siteUrl } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/stripe/connect/start
 *
 * Admin-only. Kicks off Stripe Connect OAuth for the signed-in admin's studio
 * by redirecting to Stripe's authorize URL with `state=<studioId>`.
 *
 * Middleware already gates `/admin/*`, but this route lives under `/api` (which
 * middleware skips), so the auth check is repeated here.
 */
export async function GET(request: NextRequest) {
  const loginUrl = new URL('/admin/login', request.nextUrl.origin);

  let studioId: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(loginUrl, { status: 302 });
    }

    // RLS: `studio_admins self read` restricts this to the caller's own row.
    const { data, error } = await supabase
      .from('studio_admins')
      .select('studio_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    studioId = (data as { studio_id: string } | null)?.studio_id ?? null;
  } catch (error) {
    console.error('[connect/start] failed to resolve admin studio', error);
    return NextResponse.redirect(
      settingsUrl(request, { connected: '0', error: 'studio_lookup_failed' }),
      { status: 302 }
    );
  }

  if (!studioId) {
    return NextResponse.redirect(
      settingsUrl(request, { connected: '0', error: 'no_studio' }),
      { status: 302 }
    );
  }

  let authorizeUrl: string;
  try {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: getConnectClientId(),
      scope: 'read_write',
      redirect_uri: `${siteUrl()}/api/stripe/connect/callback`,
      state: studioId,
    });
    authorizeUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  } catch (error) {
    console.error('[connect/start] Stripe Connect is not configured', error);
    return NextResponse.redirect(
      settingsUrl(request, { connected: '0', error: 'stripe_not_configured' }),
      { status: 302 }
    );
  }

  return NextResponse.redirect(authorizeUrl, { status: 302 });
}

function settingsUrl(request: NextRequest, params: Record<string, string>): URL {
  const url = new URL('/admin/settings', request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}
