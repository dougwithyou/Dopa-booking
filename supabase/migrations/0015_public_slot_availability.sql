-- Public booking calendar: which slots of a location are still free.
-- holds/bookings have no public read policy (they carry client data), so
-- the booking flow used to list every non-blocked slot as open — including
-- ones already booked or held by someone mid-checkout. This SECURITY
-- DEFINER function exposes only slot times plus a free/taken flag, nothing
-- about who holds or booked them.
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
  select s.id, s.location_id, s.start_time, s.end_time, slot_is_available(s.id) as available
  from availability_slots s
  join locations l on l.id = s.location_id and l.is_active
  where s.location_id = p_location_id
    and s.is_blocked = false
    and s.start_time > greatest(p_from, now())
    and s.start_time < p_to
  order by s.start_time;
$$;

revoke all on function public_slot_availability(uuid, timestamptz, timestamptz) from public;
grant execute on function public_slot_availability(uuid, timestamptz, timestamptz) to anon, authenticated;
