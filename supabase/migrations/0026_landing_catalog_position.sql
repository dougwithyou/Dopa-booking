-- Admin-chosen order of landing pages on the public session catalog
-- (book.hidopastudio.com). Lower first; null (e.g. new pages) goes last.
-- Existing pages are seeded newest-first, matching the previous order.
alter table landing_pages add column catalog_position int;
with ordered as (
  select id, row_number() over (order by created_at desc) as pos from landing_pages
)
update landing_pages lp set catalog_position = ordered.pos from ordered where ordered.id = lp.id;
