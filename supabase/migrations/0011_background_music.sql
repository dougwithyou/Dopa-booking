-- Optional looping background track for a landing page (e.g. the Christmas
-- template). Uploaded by the admin into the public `landing-media` bucket;
-- the public page only starts it after a visitor interaction, since
-- browsers block audible autoplay.
alter table landing_pages add column background_music_url text;
