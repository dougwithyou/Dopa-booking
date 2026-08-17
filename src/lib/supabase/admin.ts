import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/db';

// Service-role client — BYPASSES ROW LEVEL SECURITY. Server-only (route
// handlers, webhooks). Never import this from a client component and never
// expose SUPABASE_SERVICE_ROLE_KEY to the browser.
//
// This is the client the booking flow uses to create holds/bookings/clients:
// those tables intentionally have no public write RLS policy (see
// supabase/migrations/0002_rls.sql), so writes must go through here after
// the server has validated the request (e.g. a slot is actually free, a
// Stripe webhook signature is valid).
export function createAdminSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
