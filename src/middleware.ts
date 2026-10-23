import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { routing } from '@/i18n/routing';
import type { Database } from '@/types/db';
import { VISITOR_COOKIE, VISITOR_COOKIE_MAX_AGE } from '@/lib/analytics/visitor';

const intlMiddleware = createIntlMiddleware(routing);

// Admin routes are unlocalized (Doug operates in English/whatever his
// browser is) and gated behind Supabase Auth. Everything else is public
// marketing/booking surface and goes through next-intl's locale detection.
async function handleAdmin(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // Signed-out screens: redirect away from them once signed in.
  const isSignedOutPage = path === '/admin/login' || path === '/admin/forgot-password';
  // Password-recovery steps: reachable without a session (the emailed link
  // lands here before one exists) and with one (right after the link signs
  // the admin in, to set the new password).
  const isRecoveryStep = path === '/admin/auth/confirm' || path === '/admin/reset-password';

  if (!user && !isSignedOutPage && !isRecoveryStep) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  if (user && isSignedOutPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return response;
}

export default async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return handleAdmin(request);
  }
  const response = intlMiddleware(request);
  // Anonymous visitor id for unique-visitor stats (random, no personal data).
  if (!request.cookies.get(VISITOR_COOKIE)) {
    response.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
      maxAge: VISITOR_COOKIE_MAX_AGE,
      sameSite: 'lax',
      secure: true,
      httpOnly: true,
      path: '/',
    });
  }
  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    // Everything except Next.js internals, API routes and static assets.
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
