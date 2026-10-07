-- Public area: an event open to the public (events.is_public, from the request) gets a page with a
-- short description, the time and an optional number of places. Anyone registers with name and email,
-- no account needed, and gets a ticket that opens from its link (the token).

alter table public.events
  add column public_description text check (char_length(public_description) <= 2000),
  add column public_starts_at time,
  add column public_ends_at time,
  add column public_capacity int check (public_capacity between 1 and 100000);

grant update (public_description, public_starts_at, public_ends_at, public_capacity) on public.events to authenticated;

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  email text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  guests int not null default 1 check (guests between 1 and 4),
  token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);
create unique index event_registrations_email on public.event_registrations (event_id, lower(email));

-- Only the agency and the company of the event see who registered; nobody writes the table directly.
alter table public.event_registrations enable row level security;
revoke all on public.event_registrations from anon, authenticated;
grant select on public.event_registrations to authenticated;
create policy event_registrations_select on public.event_registrations for select to authenticated using (
  exists (select 1 from events e where e.id = event_id and (is_member(e.agency_org_id) or is_member(e.client_org_id)))
);

-- What the public sees of an event: never budgets, suppliers or people, only the page.
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
  registered int
)
language sql stable security definer set search_path = public as $$
  select e.id, e.number, e.title, e.event_type, e.status, e.start_date, e.end_date, e.public_starts_at, e.public_ends_at,
         e.city, e.venue, c.name, a.name, e.public_description, e.public_capacity,
         coalesce((select sum(r.guests) from event_registrations r where r.event_id = e.id), 0)::int
    from events e
    join organizations c on c.id = e.client_org_id
    join organizations a on a.id = e.agency_org_id
   where e.is_public and e.start_date is not null;
$$;
revoke execute on function public.public_event_rows from public;

-- The calendar: public events still to come or happening between two days (Italian time).
create function public.public_events(p_from date default null, p_to date default null)
returns table (
  id uuid, number int, title text, event_type public.event_type, status public.event_status, start_date date, end_date date,
  starts_at time, ends_at time, city text, venue text, organizer text, produced_by text, description text, capacity int, registered int
)
language sql stable security definer set search_path = public as $$
  select p.* from public_event_rows() p
   where p.status in ('planning', 'preparing', 'live')
     and coalesce(p.end_date, p.start_date) >= greatest(coalesce(p_from, (now() at time zone 'Europe/Rome')::date), (now() at time zone 'Europe/Rome')::date)
     and (p_to is null or p.start_date <= p_to)
   order by p.start_date, p.starts_at nulls last, p.title;
$$;

create function public.public_event(p_event uuid)
returns table (
  id uuid, number int, title text, event_type public.event_type, status public.event_status, start_date date, end_date date,
  starts_at time, ends_at time, city text, venue text, organizer text, produced_by text, description text, capacity int, registered int
)
language sql stable security definer set search_path = public as $$
  select p.* from public_event_rows() p where p.id = p_event;
$$;

revoke execute on function public.public_events from public;
revoke execute on function public.public_event from public;
grant execute on function public.public_events to anon, authenticated;
grant execute on function public.public_event to anon, authenticated;

-- Registers someone for a public event and returns the ticket's token. One registration per email
-- per event, up to 4 people each, within the places left; closed once the event is over or cancelled.
create function public.register_for_event(p_event uuid, p_name text, p_email text, p_guests int default 1)
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
  if e.status not in ('planning', 'preparing', 'live') or coalesce(e.end_date, e.start_date) < (now() at time zone 'Europe/Rome')::date then
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
revoke execute on function public.register_for_event from public;
grant execute on function public.register_for_event to anon, authenticated;

-- The ticket as its holder sees it, from the link: the event, the name and how many people.
create function public.registration_ticket(p_token text)
returns table (
  event_id uuid, number int, title text, event_type public.event_type, status public.event_status, start_date date, end_date date,
  starts_at time, ends_at time, city text, venue text, organizer text, name text, guests int, registered_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select e.id, e.number, e.title, e.event_type, e.status, e.start_date, e.end_date, e.public_starts_at, e.public_ends_at,
         e.city, e.venue, c.name, r.name, r.guests, r.created_at
    from event_registrations r
    join events e on e.id = r.event_id
    join organizations c on c.id = e.client_org_id
   where r.token = lower(p_token);
$$;
revoke execute on function public.registration_ticket from public;
grant execute on function public.registration_ticket to anon, authenticated;

-- Whoever has the ticket can give the place back.
create function public.cancel_registration(p_token text)
returns void
language sql security definer set search_path = public as $$
  delete from event_registrations where token = lower(p_token);
$$;
revoke execute on function public.cancel_registration from public;
grant execute on function public.cancel_registration to anon, authenticated;
