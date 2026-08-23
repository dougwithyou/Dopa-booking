import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import '../globals.css';
import Sidebar from '@/components/admin/Sidebar';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// This is a root layout for the /admin segment (own <html>/<body>) — the
// public site under src/app/[locale]/ defines its own separate root
// layout, which Next.js supports since neither top-level segment shares a
// parent app/layout.tsx.

export const metadata: Metadata = {
  title: 'Dopa Studio Admin',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed out (only reachable at /admin/login — middleware redirects
  // every other /admin/* request to login when unauthenticated): no
  // sidebar chrome, just a centered auth screen.
  if (!user) {
    return (
      <html lang="en">
        <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
          <div className="flex min-h-screen items-center justify-center px-4">{children}</div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar userEmail={user.email ?? ''} />
          <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
