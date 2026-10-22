import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /admin/auth/confirm — landing point of the password-reset email.
 *
 * Supports both link styles Supabase can send: `?code=` (PKCE; the code
 * verifier cookie was set by the browser that requested the reset) and
 * `?token_hash=&type=recovery` (custom email templates). Either way it
 * establishes the session in cookies and continues to `next` (only
 * same-site /admin paths are allowed), or back to the request form.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const nextParam = url.searchParams.get('next') ?? '/admin/reset-password';
  const next = nextParam.startsWith('/admin/') && !nextParam.startsWith('//') ? nextParam : '/admin/reset-password';

  const supabase = await createServerSupabaseClient();
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) console.error('[auth/confirm] code exchange failed', error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
    if (error) console.error('[auth/confirm] verifyOtp failed', error.message);
  }

  const redirect = request.nextUrl.clone();
  redirect.search = '';
  if (ok) {
    redirect.pathname = next;
  } else {
    redirect.pathname = '/admin/reset-password';
    redirect.searchParams.set('error', 'link');
  }
  return NextResponse.redirect(redirect);
}
