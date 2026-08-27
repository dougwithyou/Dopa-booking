-- Contracts + e-signature. A contract is authored by the admin (optionally
-- pre-filled from a booking), sent to a client via an unguessable
-- public_token link, and signed there with no login required. Following
-- the same trust model as holds/bookings: there is no public RLS write
-- policy — the public signing route reads/writes through the service-role
-- client after validating status server-side.

create table contracts (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios (id) on delete cascade,
  client_id uuid references clients (id) on delete set null,
  booking_id uuid references bookings (id) on delete set null,

  status text not null default 'draft' check (status in ('draft', 'sent', 'signed', 'void')),
  public_token uuid not null default gen_random_uuid(),

  title text not null default 'Photography Services Contract',
  -- Small markdown-lite (# / ## headings, "- " lists, **bold**, blank-line
  -- paragraphs) rather than real HTML — the admin editor is a plain
  -- textarea, and this keeps the public page and PDF renderer trivial and
  -- injection-safe (see src/lib/contracts/markdown.ts).
  content text not null default '',
  pdf_url text,

  signer_name text,
  signer_id_number text,
  signature_data text,
  signer_ip text,
  signed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (public_token)
);

create index contracts_studio_id_idx on contracts (studio_id);
create index contracts_client_id_idx on contracts (client_id);
create index contracts_booking_id_idx on contracts (booking_id);
create index contracts_public_token_idx on contracts (public_token);

create trigger contracts_set_updated_at before update on contracts
  for each row execute function set_updated_at();

alter table contracts enable row level security;

-- Admin-only. No public select/insert/update policy at all: the public
-- signing page and API routes read/write via the service-role client in
-- src/app/api/contracts/**, after validating the token and status
-- server-side (a contract's content shouldn't be select-able by just
-- guessing at RLS, and letting anon UPDATE the signature columns directly
-- would mean trusting the browser for signer_ip and status transitions).
create policy "contracts admin all" on contracts
  for all using (is_studio_admin(studio_id)) with check (is_studio_admin(studio_id));

-- Storage bucket for generated contract PDFs. Public read (the client needs
-- to download their signed PDF from an unauthenticated page), no public
-- write — PDFs are uploaded server-side via service-role after a contract
-- is signed.
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', true)
on conflict (id) do nothing;

create policy "contracts-pdf public read"
  on storage.objects for select
  using (bucket_id = 'contracts');
