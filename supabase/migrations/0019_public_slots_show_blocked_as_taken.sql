-- Slots the admin blocks now appear on the public booking calendar as
-- taken ("Ocupado"), like booked or held ones, instead of disappearing —
-- the studio uses blocking to mark times as already filled. Booking a
-- blocked slot is still refused server-side (POST /api/holds, /api/checkout).
create or replace function public_slot_availability(
  p_location_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (id uuid, location_id uuid, start_time timestamptz, end_time timestamptz, available boolean)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.location_id, s.start_time, s.end_time,
         (not s.is_blocked and slot_is_available(s.id)) as available
  from availability_slots s
  join locations l on l.id = s.location_id and l.is_active
  where s.location_id = p_location_id
    and s.start_time > greatest(p_from, now())
    and s.start_time < p_to
  order by s.start_time;
$$;
