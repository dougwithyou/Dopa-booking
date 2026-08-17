-- Row Level Security
--
-- Public (anon) traffic only ever needs read access to published landing
-- pages / active locations / open availability / active products, scoped to
-- the tenant. All writes that matter for booking correctness (holds,
-- bookings, clients, payments) go through server-side route handlers using
-- the Supabase service role key, which bypasses RLS entirely — so anon
-- INSERT/UPDATE policies for those tables are intentionally NOT granted.
--
-- Admin (authenticated) access is scoped through studio_admins: a signed-in
-- user can only see/edit rows belonging to the studio(s) they administer.

alter table studios enable row level security;
alter table studio_admins enable row level security;
alter table locations enable row level security;
alter table landing_pages enable row level security;
alter table landing_page_locations enable row level security;
alter table availability_slots enable row level security;
alter table holds enable row level security;
alter table clients enable row level security;
alter table discount_codes enable row level security;
alter table products enable row level security;
alter table landing_page_products enable row level security;
alter table bookings enable row level security;
alter table upsell_orders enable row level security;
alter table page_views enable row level security;

create or replace function is_studio_admin(p_studio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from studio_admins
    where user_id = auth.uid() and studio_id = p_studio_id
  );
$$;

-- studios: public can read basic public-facing fields via the anon key
-- (needed for pixel id / studio name on the landing page); admins can read/write their own.
create policy "studios readable by anyone" on studios
  for select using (true);
create policy "studios editable by their admins" on studios
  for update using (is_studio_admin(id));

create policy "studio_admins self read" on studio_admins
  for select using (user_id = auth.uid());

-- locations: public reads active locations; admins manage their studio's.
create policy "locations public read" on locations
  for select using (is_active = true);
create policy "locations admin all" on locations
  for all using (is_studio_admin(studio_id)) with check (is_studio_admin(studio_id));

-- landing_pages: public reads published pages; admins manage their studio's.
create policy "landing_pages public read" on landing_pages
  for select using (status = 'published');
create policy "landing_pages admin all" on landing_pages
  for all using (is_studio_admin(studio_id)) with check (is_studio_admin(studio_id));

create policy "landing_page_locations public read" on landing_page_locations
  for select using (
    exists (select 1 from landing_pages lp where lp.id = landing_page_id and lp.status = 'published')
  );
create policy "landing_page_locations admin all" on landing_page_locations
  for all using (
    exists (select 1 from landing_pages lp where lp.id = landing_page_id and is_studio_admin(lp.studio_id))
  ) with check (
    exists (select 1 from landing_pages lp where lp.id = landing_page_id and is_studio_admin(lp.studio_id))
  );

-- availability_slots: public reads unblocked slots; writes are server-side only for booking flow,
-- admins can manage directly.
create policy "availability_slots public read" on availability_slots
  for select using (is_blocked = false);
create policy "availability_slots admin all" on availability_slots
  for all using (
    exists (select 1 from locations l where l.id = location_id and is_studio_admin(l.studio_id))
  ) with check (
    exists (select 1 from locations l where l.id = location_id and is_studio_admin(l.studio_id))
  );

-- holds: no public policy (server-side/service-role only). Admins can view their studio's holds
-- (via landing_pages join) for visibility into in-flight checkouts.
create policy "holds admin read" on holds
  for select using (
    landing_page_id is null or exists (
      select 1 from landing_pages lp where lp.id = landing_page_id and is_studio_admin(lp.studio_id)
    )
  );

-- clients: admin-only.
create policy "clients admin all" on clients
  for all using (is_studio_admin(studio_id)) with check (is_studio_admin(studio_id));

-- discount_codes: public can read active, non-expired codes (needed to display/validate
-- auto-applied codes client-side); admins manage.
create policy "discount_codes public read active" on discount_codes
  for select using (is_active = true and (expires_at is null or expires_at > now()));
create policy "discount_codes admin all" on discount_codes
  for all using (is_studio_admin(studio_id)) with check (is_studio_admin(studio_id));

-- products: public reads active products (for upsell page); admins manage.
create policy "products public read" on products
  for select using (is_active = true);
create policy "products admin all" on products
  for all using (is_studio_admin(studio_id)) with check (is_studio_admin(studio_id));

create policy "landing_page_products public read" on landing_page_products
  for select using (
    exists (select 1 from landing_pages lp where lp.id = landing_page_id and lp.status = 'published')
  );
create policy "landing_page_products admin all" on landing_page_products
  for all using (
    exists (select 1 from landing_pages lp where lp.id = landing_page_id and is_studio_admin(lp.studio_id))
  ) with check (
    exists (select 1 from landing_pages lp where lp.id = landing_page_id and is_studio_admin(lp.studio_id))
  );

-- bookings: admin-only (no public policy — created server-side after payment).
create policy "bookings admin all" on bookings
  for all using (is_studio_admin(studio_id)) with check (is_studio_admin(studio_id));

-- upsell_orders: admin-only, scoped via booking -> studio.
create policy "upsell_orders admin all" on upsell_orders
  for all using (
    exists (select 1 from bookings b where b.id = booking_id and is_studio_admin(b.studio_id))
  ) with check (
    exists (select 1 from bookings b where b.id = booking_id and is_studio_admin(b.studio_id))
  );

-- page_views: public can insert (pageview tracking beacon), admin can read for stats.
create policy "page_views public insert" on page_views
  for insert with check (true);
create policy "page_views admin read" on page_views
  for select using (
    exists (select 1 from landing_pages lp where lp.id = landing_page_id and is_studio_admin(lp.studio_id))
  );
