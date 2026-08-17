-- Dopa Studio Booking & CRM — initial schema
-- Single-tenant today (one row in `studios`), but every core table carries
-- `studio_id` so a future multi-tenant migration doesn't require reshaping data.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- studios: the tenant root. One row for Dopa Studio today.
-- ---------------------------------------------------------------------------
create table studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  contact_email text,
  default_locale text not null default 'en' check (default_locale in ('en', 'es')),
  timezone text not null default 'America/New_York',

  -- Stripe Connect
  stripe_account_id text,
  stripe_charges_enabled boolean not null default false,
  stripe_details_submitted boolean not null default false,
  stripe_onboarding_started_at timestamptz,

  -- Marketing
  meta_pixel_id text,

  -- Future SaaS custom-domain support (unused for now — see build spec §6)
  custom_domain text,

  hold_duration_minutes int not null default 15,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- studio_admins: maps Supabase Auth users to a studio. Today Doug is the
-- only row here; this is what a future multi-user studio would extend.
-- ---------------------------------------------------------------------------
create table studio_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  studio_id uuid not null references studios (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- locations: each has its own independent set of availability slots so Doug
-- never has to travel between two locations in a day.
-- ---------------------------------------------------------------------------
create table locations (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios (id) on delete cascade,
  name text not null,
  address text,
  city text,
  state text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index locations_studio_id_idx on locations (studio_id);

-- ---------------------------------------------------------------------------
-- landing_pages: one row per public page (session type). Admin-created,
-- each gets its own slug. All copy fields are bilingual (en/es columns)
-- so admin edits stay bilingual automatically.
-- ---------------------------------------------------------------------------
create table landing_pages (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios (id) on delete cascade,
  slug text not null,
  template text not null default 'general', -- e.g. couples, family, quinceanera, general
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),

  eyebrow_en text, eyebrow_es text,
  headline_en text not null default '', headline_es text not null default '',
  subheadline_en text, subheadline_es text,
  cta_primary_en text default 'Book my session', cta_primary_es text default 'Reservar mi sesión',
  cta_secondary_en text default 'See past sessions', cta_secondary_es text default 'Ver sesiones anteriores',

  gallery_heading_en text, gallery_heading_es text,
  about_heading_en text, about_heading_es text,
  about_body_en text, about_body_es text,

  closer_heading_en text, closer_heading_es text,
  closer_body_en text, closer_body_es text,

  hero_image_url text,
  gallery jsonb not null default '[]'::jsonb,       -- [{url, tag_en, tag_es, order}]
  testimonials jsonb not null default '[]'::jsonb,  -- [{quote_en, quote_es, author, order}]

  theme jsonb not null default '{}'::jsonb, -- color/font overrides, falls back to brand defaults

  base_price_cents int,
  currency text not null default 'usd',

  meta_pixel_id text, -- overrides studio-level pixel if set

  discount_code_id uuid, -- FK added after discount_codes exists; auto-applies on this page
  custom_domain text,    -- future-proofing, unused for now

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (studio_id, slug)
);

create index landing_pages_studio_id_idx on landing_pages (studio_id);
create index landing_pages_status_idx on landing_pages (status);

-- ---------------------------------------------------------------------------
-- landing_page_locations: which locations a given landing page offers.
-- ---------------------------------------------------------------------------
create table landing_page_locations (
  landing_page_id uuid not null references landing_pages (id) on delete cascade,
  location_id uuid not null references locations (id) on delete cascade,
  primary key (landing_page_id, location_id)
);

-- ---------------------------------------------------------------------------
-- availability_slots: individual bookable time slots at a location.
-- ---------------------------------------------------------------------------
create table availability_slots (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  is_blocked boolean not null default false, -- admin can block a slot manually
  created_at timestamptz not null default now()
);

create index availability_slots_location_idx on availability_slots (location_id, start_time);

-- ---------------------------------------------------------------------------
-- holds: temporary reservation on a slot while a client checks out.
-- Expired/released holds are cleared by application logic (checked against
-- expires_at at read time — no separate cron required, see helper below).
-- ---------------------------------------------------------------------------
create table holds (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references availability_slots (id) on delete cascade,
  client_email text,
  client_name text,
  client_phone text,
  landing_page_id uuid references landing_pages (id),
  expires_at timestamptz not null,
  released boolean not null default false,
  created_at timestamptz not null default now()
);

create index holds_slot_idx on holds (slot_id);
create index holds_expires_idx on holds (expires_at) where released = false;

-- ---------------------------------------------------------------------------
-- clients: CRM record. One per studio+email.
-- ---------------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios (id) on delete cascade,
  name text,
  email text not null,
  phone text,
  notes text, -- Doug's private notes/preferences about this client
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studio_id, email)
);

create index clients_studio_id_idx on clients (studio_id);

-- ---------------------------------------------------------------------------
-- discount_codes
-- ---------------------------------------------------------------------------
create table discount_codes (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios (id) on delete cascade,
  code text not null,
  type text not null check (type in ('percent', 'fixed')),
  value numeric not null, -- percent (0-100) or fixed amount in cents depending on type
  currency text not null default 'usd',
  expires_at timestamptz,
  landing_page_id uuid references landing_pages (id) on delete set null, -- ties auto-apply to a page
  promo_param text, -- ?promo=<value> triggers auto-apply
  max_uses int,
  times_used int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (studio_id, code)
);

create index discount_codes_studio_id_idx on discount_codes (studio_id);
create index discount_codes_promo_param_idx on discount_codes (promo_param);

alter table landing_pages
  add constraint landing_pages_discount_code_fk
  foreign key (discount_code_id) references discount_codes (id) on delete set null;

-- ---------------------------------------------------------------------------
-- products: photobooks, prints, etc.
-- ---------------------------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios (id) on delete cascade,
  name text not null,
  description text,
  price_cents int not null,
  currency text not null default 'usd',
  images jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_studio_id_idx on products (studio_id);

-- which products are offered as upsells for which landing page / session type
create table landing_page_products (
  landing_page_id uuid not null references landing_pages (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  primary key (landing_page_id, product_id)
);

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios (id) on delete cascade,
  landing_page_id uuid references landing_pages (id) on delete set null,
  location_id uuid references locations (id) on delete set null,
  slot_id uuid references availability_slots (id) on delete set null,
  client_id uuid references clients (id) on delete set null,

  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),

  amount_cents int not null default 0,
  currency text not null default 'usd',
  discount_code_id uuid references discount_codes (id) on delete set null,

  payment_method text not null default 'stripe' check (payment_method in ('stripe', 'cash', 'other')),
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  paid_at timestamptz,

  source_promo_param text, -- ?promo= value present at time of booking
  admin_note text,          -- e.g. "booked via WhatsApp"
  created_by_admin boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_studio_id_idx on bookings (studio_id);
create index bookings_client_id_idx on bookings (client_id);
create index bookings_slot_id_idx on bookings (slot_id);
create index bookings_status_idx on bookings (status);

-- ---------------------------------------------------------------------------
-- upsell_orders: post-payment product purchases against a booking.
-- ---------------------------------------------------------------------------
create table upsell_orders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  product_id uuid not null references products (id),
  quantity int not null default 1,
  amount_cents int not null,
  currency text not null default 'usd',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  created_at timestamptz not null default now()
);

create index upsell_orders_booking_id_idx on upsell_orders (booking_id);

-- ---------------------------------------------------------------------------
-- page_views: lightweight funnel tracking for conversion-rate stats.
-- ---------------------------------------------------------------------------
create table page_views (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references landing_pages (id) on delete cascade,
  promo_param text,
  locale text,
  created_at timestamptz not null default now()
);

create index page_views_landing_page_idx on page_views (landing_page_id, created_at);

-- ---------------------------------------------------------------------------
-- helper: is a slot currently free? (no confirmed booking, no live hold)
-- ---------------------------------------------------------------------------
create or replace function slot_is_available(p_slot_id uuid)
returns boolean
language sql
stable
as $$
  select not exists (
    select 1 from bookings
    where slot_id = p_slot_id and status in ('pending', 'confirmed')
  )
  and not exists (
    select 1 from holds
    where slot_id = p_slot_id and released = false and expires_at > now()
  );
$$;

-- updated_at trigger helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger studios_set_updated_at before update on studios
  for each row execute function set_updated_at();
create trigger locations_set_updated_at before update on locations
  for each row execute function set_updated_at();
create trigger landing_pages_set_updated_at before update on landing_pages
  for each row execute function set_updated_at();
create trigger clients_set_updated_at before update on clients
  for each row execute function set_updated_at();
create trigger products_set_updated_at before update on products
  for each row execute function set_updated_at();
create trigger bookings_set_updated_at before update on bookings
  for each row execute function set_updated_at();

-- seed the single Dopa Studio tenant
insert into studios (name, slug, contact_email, default_locale)
values ('Dopa Studio', 'dopa-studio', 'hello@hidopastudio.com', 'es');
