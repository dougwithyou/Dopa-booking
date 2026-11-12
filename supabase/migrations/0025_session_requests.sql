-- "Looking for a different session?" requests from the public session
-- catalog (book.hidopastudio.com): session type, estimated date and contact
-- details. Inserted server-side (service role) by POST /api/session-requests;
-- the admin reviews them under Admin → Requests.
create table session_requests (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references studios (id) on delete cascade,
  client_id uuid references clients (id) on delete set null,
  session_type text not null,
  preferred_date date,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  locale text not null default 'es',
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);
create index session_requests_studio_idx on session_requests (studio_id, created_at desc);
alter table session_requests enable row level security;
create policy "session_requests admin all" on session_requests
  for all using (is_studio_admin(studio_id)) with check (is_studio_admin(studio_id));
