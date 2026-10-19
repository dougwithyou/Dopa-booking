-- Lets the admin reorder the body sections of a landing page (gallery,
-- testimonials, about, closer). Hero and Footer stay fixed as the first/last
-- elements since they're structural chrome, not content sections. `theme`
-- (added in 0001_init.sql) already covers the color-palette override; this
-- migration only adds section ordering.

alter table landing_pages
  add column section_order jsonb not null default '["gallery", "testimonials", "about", "closer"]'::jsonb;
