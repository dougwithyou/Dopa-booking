-- Booking funnel per landing page since a date, for the admin Stats page:
-- views and unique visitors (page_views 'view'), "Book now" clicks and
-- unique clickers ('book_click'), checkouts started (distinct emails that
-- reached the hold/checkout step) and confirmed client bookings.
-- SECURITY INVOKER + is_studio_admin(): an admin only sees their studio.
create or replace function admin_booking_funnel(p_since timestamptz)
returns table (
  landing_page_id uuid,
  views bigint,
  unique_visitors bigint,
  book_clicks bigint,
  unique_clickers bigint,
  checkouts_started bigint,
  bookings bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select lp.id,
    (select count(*) from page_views v where v.landing_page_id = lp.id and v.event = 'view' and v.created_at >= p_since),
    (select count(distinct v.visitor_id) from page_views v where v.landing_page_id = lp.id and v.event = 'view' and v.created_at >= p_since),
    (select count(*) from page_views v where v.landing_page_id = lp.id and v.event = 'book_click' and v.created_at >= p_since),
    (select count(distinct v.visitor_id) from page_views v where v.landing_page_id = lp.id and v.event = 'book_click' and v.created_at >= p_since),
    (select count(distinct lower(h.client_email)) from holds h where h.landing_page_id = lp.id and h.created_at >= p_since),
    (select count(*) from bookings b where b.landing_page_id = lp.id and b.status = 'confirmed' and b.created_by_admin = false and b.created_at >= p_since)
  from landing_pages lp
  where is_studio_admin(lp.studio_id);
$$;
grant execute on function admin_booking_funnel(timestamptz) to authenticated;
