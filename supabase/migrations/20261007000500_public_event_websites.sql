-- Public area, events of the city: the I-Events editorial team lists the important events of a city.
-- Such an event points to its official website (tickets are sold there, so I-Events takes no
-- registration) and names its real organiser; the calendar can also look back at the days gone by.

alter table public.events
  add column public_url text check (public_url ~ '^https://[^\s]+$' and char_length(public_url) <= 500),
  add column public_organizer text check (char_length(btrim(public_organizer)) between 2 and 120);

-- The page gains the website, so the functions are recreated with the new column.
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
  website text
)
language sql stable security definer set search_path = public as $$
  select e.id, e.number, e.title, e.event_type, e.status, e.start_date, e.end_date, e.public_starts_at, e.public_ends_at,
         e.city, e.venue, coalesce(e.public_organizer, c.name), a.name, e.public_description, e.public_capacity,
         coalesce((select sum(r.guests) from event_registrations r where r.event_id = e.id), 0)::int,
         e.public_url
    from events e
    join organizations c on c.id = e.client_org_id
    join organizations a on a.id = e.agency_org_id
   where e.is_public and e.start_date is not null;
$$;
revoke execute on function public.public_event_rows from public;

-- The calendar between two days (Italian time). Without p_from it starts today; with a day in the past
-- it also lists the events already gone on stage, never the cancelled ones.
create function public.public_events(p_from date default null, p_to date default null)
returns table (
  id uuid, number int, title text, event_type public.event_type, status public.event_status, start_date date, end_date date,
  starts_at time, ends_at time, city text, venue text, organizer text, produced_by text, description text, capacity int,
  registered int, website text
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
  registered int, website text
)
language sql stable security definer set search_path = public as $$
  select p.* from public_event_rows() p where p.id = p_event;
$$;

revoke execute on function public.public_events from public;
revoke execute on function public.public_event from public;
grant execute on function public.public_events to anon, authenticated;
grant execute on function public.public_event to anon, authenticated;

-- Same registration, closed for the events that sell their tickets on their own website.
create or replace function public.register_for_event(p_event uuid, p_name text, p_email text, p_guests int default 1)
returns text
language plpgsql security definer set search_path = public as $$
declare
  e events;
  taken int;
  tok text;
begin
  if p_guests is not null and p_guests not between 1 and 4 then
    raise exception 'from 1 to 4 people' using errcode = '23514';
  end if;
  -- The lock makes concurrent registrations count places one at a time.
  select * into e from events where id = p_event and is_public for update;
  if not found then
    raise exception 'event not found' using errcode = 'P0002';
  end if;
  if e.public_url is not null or e.status not in ('planning', 'preparing', 'live')
     or coalesce(e.end_date, e.start_date) < (now() at time zone 'Europe/Rome')::date then
    raise exception 'registrations closed' using errcode = '22023';
  end if;
  if e.public_capacity is not null then
    select coalesce(sum(guests), 0) into taken from event_registrations where event_id = p_event;
    if taken + coalesce(p_guests, 1) > e.public_capacity then
      raise exception 'not enough places: %', greatest(e.public_capacity - taken, 0) using errcode = 'P0001';
    end if;
  end if;
  begin
    insert into event_registrations (event_id, name, email, guests)
    values (p_event, btrim(p_name), lower(btrim(p_email)), coalesce(p_guests, 1))
    returning token into tok;
  exception when unique_violation then
    raise exception 'already registered' using errcode = '23505';
  end;
  return tok;
end;
$$;
