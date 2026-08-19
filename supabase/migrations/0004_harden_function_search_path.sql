-- Pins search_path on SQL/PLpgSQL functions per Supabase's linter
-- (function_search_path_mutable) so they can't be tricked by a caller-
-- controlled search_path into resolving an unqualified table/function name
-- to something other than public.*.

create or replace function slot_is_available(p_slot_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select not exists (
    select 1 from bookings
    where slot_id = p_slot_id and status in ('pending', 'confirmed')
  )
  and not exists (
    select 1 from holds
    where slot_id = p_slot_id and released = false and expires_at > now()
  );
$$;

create or replace function set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
