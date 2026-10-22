-- Hero photos are no longer cropped on upload: the admin marks a focal
-- point (percent of width/height) and the page frames the photo around it
-- with object-position. Gallery photos carry the same point inside the
-- `gallery` jsonb items (focal_x / focal_y), so they need no column.
alter table landing_pages
  add column hero_focal_x numeric not null default 50,
  add column hero_focal_y numeric not null default 50;
