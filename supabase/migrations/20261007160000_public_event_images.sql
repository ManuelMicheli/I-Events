-- Public area, events of the city: the poster of an event, shown from the organiser's own website
-- (the image stays there, I-Events only links it) with its credit; empty means the ink cover.

alter table public.events
  add column public_image_url text check (public_image_url ~ '^https://[^\s]+$' and char_length(public_image_url) <= 1000),
  add column public_image_credit text check (char_length(btrim(public_image_credit)) between 2 and 120);

-- The page gains the image, so the functions are recreated with the new columns.
drop function public.public_event(uuid);
drop function public.public_events(date, date);
drop function public.public_event_rows();

create function public.public_event_rows()
returns table (
  id uuid,
  number int,
  title text,
  event_type public.event_type,
  status public.event_status,
  start_date date,
  end_date date,
  starts_at time,
  ends_at time,
  city text,
  venue text,
  organizer text,
  produced_by text,
  description text,
  capacity int,
  registered int,
  website text,
  image text,
  image_credit text
)
language sql stable security definer set search_path = public as $$
  select e.id, e.number, e.title, e.event_type, e.status, e.start_date, e.end_date, e.public_starts_at, e.public_ends_at,
         e.city, e.venue, coalesce(e.public_organizer, c.name), a.name, e.public_description, e.public_capacity,
         coalesce((select sum(r.guests) from event_registrations r where r.event_id = e.id), 0)::int,
         e.public_url, e.public_image_url, e.public_image_credit
    from events e
    join organizations c on c.id = e.client_org_id
    join organizations a on a.id = e.agency_org_id
   where e.is_public and e.start_date is not null;
$$;
revoke execute on function public.public_event_rows from public;

-- The calendar, as before (20261007000500).
create function public.public_events(p_from date default null, p_to date default null)
returns table (
  id uuid, number int, title text, event_type public.event_type, status public.event_status, start_date date, end_date date,
  starts_at time, ends_at time, city text, venue text, organizer text, produced_by text, description text, capacity int,
  registered int, website text, image text, image_credit text
)
language sql stable security definer set search_path = public as $$
  select p.* from public_event_rows() p
   where p.status <> 'cancelled'
     and coalesce(p.end_date, p.start_date) >= coalesce(p_from, (now() at time zone 'Europe/Rome')::date)
     and (p.status <> 'completed' or coalesce(p.end_date, p.start_date) < (now() at time zone 'Europe/Rome')::date)
     and (p_to is null or p.start_date <= p_to)
   order by p.start_date, p.starts_at nulls last, p.title;
$$;

create function public.public_event(p_event uuid)
returns table (
  id uuid, number int, title text, event_type public.event_type, status public.event_status, start_date date, end_date date,
  starts_at time, ends_at time, city text, venue text, organizer text, produced_by text, description text, capacity int,
  registered int, website text, image text, image_credit text
)
language sql stable security definer set search_path = public as $$
  select p.* from public_event_rows() p where p.id = p_event;
$$;

revoke execute on function public.public_events from public;
revoke execute on function public.public_event from public;
grant execute on function public.public_events to anon, authenticated;
grant execute on function public.public_event to anon, authenticated;

