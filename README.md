# Dopa Studio — Booking & CRM

A bilingual (EN/ES) booking, payments, and CRM system for Dopa Studio, built
with Next.js (App Router), Supabase, Stripe Connect, and Resend.

## Stack

- **Frontend**: Next.js 14 (App Router) + React + Tailwind CSS, bilingual via `next-intl`
- **Database/Auth/Storage**: Supabase (Postgres, Row Level Security, Storage)
- **Payments**: Stripe Connect (studio links its own account — no platform-held funds)
- **Email**: Resend
- **Hosting**: Vercel

Single-tenant for Dopa Studio today, but every core table carries a
`studio_id` foreign key so a future multi-tenant SaaS migration doesn't
require a data reshape (see `supabase/migrations/0001_init.sql`).

## Repo layout

```
src/app/[locale]/        Public site: landing pages, booking flow, confirmation/upsell
src/app/admin/            Admin dashboard (unlocalized, Supabase-Auth gated)
src/app/api/              Route handlers: holds, checkout, Stripe Connect, webhooks
src/components/           Landing / booking / admin UI components
src/lib/                  Supabase clients, Stripe client, Resend email templates
src/i18n/                 next-intl routing/config
src/messages/{en,es}.json UI chrome strings (landing-page content itself lives in the DB)
src/types/db.ts           Hand-written types mirroring the Supabase schema
supabase/migrations/      SQL migrations (schema, RLS policies, storage bucket)
.claude/agents/           Subagent role definitions used to build this repo
```

## First-time setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations in `supabase/migrations/` in order (via the SQL editor,
   the Supabase CLI, or the `mcp__Supabase__apply_migration` tool):
   - `0001_init.sql` — schema + seeds the single Dopa Studio row
   - `0002_rls.sql` — Row Level Security policies
   - `0003_storage.sql` — `landing-media` Storage bucket + policies
3. Create Doug's admin login: Authentication → Users → Add user (email +
   password). Then insert a `studio_admins` row linking that user to the
   seeded studio:
   ```sql
   insert into studio_admins (user_id, studio_id, role)
   values ('<the new user's UUID>', (select id from studios limit 1), 'owner');
   ```
4. Copy the project URL and keys into `.env.local` (see below).

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (keep secret — server-only) |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | Your **platform** Stripe account (Dopa Studio's own Stripe account is connected separately via OAuth, see below — never hardcode a connected account's keys) |
| `STRIPE_CONNECT_CLIENT_ID` | Stripe Dashboard → Connect → Settings ("OAuth settings" `ca_...` client ID) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks (see below) |
| `RESEND_API_KEY` | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | A verified sending address/domain in Resend |
| `ADMIN_NOTIFICATION_EMAIL` | Doug's inbox for new-booking alerts |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally, the Vercel URL in production |

### 3. Stripe Connect

This app never stores or hardcodes a studio's Stripe keys. Instead:

1. Set `STRIPE_CONNECT_CLIENT_ID` (from your Stripe platform account).
2. Add `${NEXT_PUBLIC_SITE_URL}/api/stripe/connect/callback` as an allowed
   OAuth redirect URI in Stripe Dashboard → Connect → Settings.
3. Log into `/admin/settings` and click **Connect Stripe** — this starts the
   OAuth flow and stores the resulting `stripe_account_id` on the `studios`
   row. All booking/upsell charges route through that connected account.
4. Create a webhook endpoint in Stripe pointing at
   `${NEXT_PUBLIC_SITE_URL}/api/webhooks/stripe`, subscribed to:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.expired`
   - **Enable "Listen to events on connected accounts"** — booking/upsell
     charges are direct charges on the connected account, so without this
     the webhook never fires.
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### 4. Install & run

```bash
npm install
npm run dev
```

Visit `/admin/login` to sign in, then `/admin/landing-pages/new` to create
the first public landing page.

### 5. Deploy (Vercel)

1. Import the repo into Vercel.
2. Add all the env vars from `.env.local`, with `NEXT_PUBLIC_SITE_URL` set
   to the production domain.
3. Update the Stripe Connect redirect URI and webhook endpoint to the
   production URL.

## Notes / known follow-ups

- **Hold-expiration reminder emails** (`sendHoldExpirationReminder` in
  `src/lib/email`) are implemented but not wired to a scheduler — nothing in
  this repo currently triggers them on a timer. Wire up a Vercel Cron job or
  Supabase scheduled function hitting a small route that queries
  soon-to-expire `holds` if you want this in production.
- The upsell page shows all active products rather than a landing-page-scoped
  subset in one code path (see `src/lib/landing/`), as a v1 simplification;
  admin can still scope upsell eligibility per landing page from the editor
  (`landing_page_products`) for the primary path.
- No automated tests are included yet.

## Built with

Sections of this codebase were built by parallel Claude Code subagents
following the roles defined in `.claude/agents/`: `schema-architect`,
`frontend-builder`, `admin-dashboard-builder`, `payments-integrator`,
`email-integrator`.
