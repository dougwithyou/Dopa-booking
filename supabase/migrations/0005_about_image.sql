-- Dedicated photo for the "About / Who we are" section — previously it
-- silently reused the second gallery photo with no way to set it directly
-- from the admin editor.
alter table landing_pages add column about_image_url text;
