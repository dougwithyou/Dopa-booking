-- Funnel stats: page_views now records two events per landing page —
-- 'view' (landing page rendered) and 'book_click' (booking flow opened) —
-- plus an anonymous visitor id (random cookie) for unique-visitor counts.
alter table page_views
  add column event text not null default 'view',
  add column visitor_id text;
alter table page_views add constraint page_views_event_check check (event in ('view', 'book_click'));
create index page_views_page_event_idx on page_views (landing_page_id, event, created_at);

-- Abandoned-cart follow-up: the hold remembers the visitor's language, and
-- when the "you didn't finish your booking" email went out (once per hold).
alter table holds
  add column locale text,
  add column abandoned_email_sent_at timestamptz;
create index holds_abandoned_idx on holds (created_at) where abandoned_email_sent_at is null and client_email is not null;
