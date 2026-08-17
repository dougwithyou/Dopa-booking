-- Storage bucket for landing-page and product photos (hero image, gallery
-- photos, product images). Public read (photos are served on the public
-- marketing site); writes happen only from the authenticated admin panel,
-- enforced by the policies below.

insert into storage.buckets (id, name, public)
values ('landing-media', 'landing-media', true)
on conflict (id) do nothing;

create policy "landing-media public read"
  on storage.objects for select
  using (bucket_id = 'landing-media');

create policy "landing-media admin write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'landing-media');

create policy "landing-media admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'landing-media');

create policy "landing-media admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'landing-media');
