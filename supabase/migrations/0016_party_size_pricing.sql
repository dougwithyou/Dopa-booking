-- Party-size pricing: the landing page price covers up to `included_people`;
-- each person beyond that adds `extra_person_price_cents`. The booking flow
-- asks how many people are coming (1..max_people) and stores it on the
-- booking with the surcharge charged (already included in amount_cents).
alter table landing_pages
  add column included_people int not null default 5,
  add column extra_person_price_cents int not null default 3000,
  add column max_people int not null default 12;

alter table bookings
  add column party_size int,
  add column extra_people_cents int not null default 0;
