-- Invoices: bill a client directly for a photo session (outside the landing
-- page booking flow) and let them pay online via a private link
-- (/[locale]/invoice/[token]). An invoice with a slot owns a booking
-- (status 'pending' until paid), so the time is taken on the shared
-- availability calendar — landing pages show it as "Ocupado". Paying
-- confirms the booking; voiding cancels it and frees the slot.
create table invoices (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios (id) on delete cascade,
  number int not null,
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  client_id uuid references clients (id) on delete set null,
  client_name text,
  client_email text not null,
  client_phone text,
  booking_id uuid references bookings (id) on delete set null,
  location_id uuid references locations (id) on delete set null,
  slot_id uuid references availability_slots (id) on delete set null,
  title text not null,
  notes text,
  items jsonb not null default '[]'::jsonb, -- [{ description, quantity, unit_cents }]
  discount_cents int not null default 0,
  total_cents int not null,
  currency text not null default 'usd',
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  due_date date,
  locale text not null default 'es' check (locale in ('en', 'es')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (studio_id, number)
);
create index invoices_studio_idx on invoices (studio_id, created_at desc);

-- Admin-only; the public pay page reads by token server-side (service role).
alter table invoices enable row level security;
create policy "invoices admin all" on invoices
  for all using (is_studio_admin(studio_id)) with check (is_studio_admin(studio_id));

create trigger invoices_updated_at before update on invoices
  for each row execute function set_updated_at();

alter table bookings add column invoice_id uuid references invoices (id) on delete set null;
