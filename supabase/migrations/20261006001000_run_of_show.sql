-- Run of show: the minute-by-minute schedule of the event days and the list of people expected on
-- site (suppliers and staff) with their check-in. Internal to the agency, like bookings and tasks.

create table public.event_schedule_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  -- The agency running the event, always copied from the event.
  org_id uuid not null references public.organizations (id) on delete cascade,
  day date not null,
  starts_at time not null,
  -- Optional; earlier than starts_at means it ends after midnight.
  ends_at time,
  title text not null check (length(trim(title)) between 1 and 200),
  location text check (length(location) <= 200),
  notes text check (length(notes) <= 2000),
  -- The supplier involved and the colleague in charge on site.
  booking_id uuid references public.event_bookings (id) on delete set null,
  assignee_id uuid references public.profiles (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index event_schedule_items_event_idx on public.event_schedule_items (event_id, day, starts_at);

-- Who has to be on site: a supplier booking, a colleague, or an external person by name (hostess,
-- freelance staff). Each has a call time and is checked in on arrival.
create table public.event_crew (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  booking_id uuid references public.event_bookings (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  name text check (length(name) <= 120),
  role text check (length(role) <= 120),
  phone text check (length(phone) <= 40),
  day date not null,
  call_time time,
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (booking_id is null or user_id is null),
  check (booking_id is not null or user_id is not null or coalesce(length(trim(name)), 0) > 0)
);
create unique index event_crew_booking_day on public.event_crew (event_id, day, booking_id) where booking_id is not null;
create unique index event_crew_user_day on public.event_crew (event_id, day, user_id) where user_id is not null;
create index event_crew_event_idx on public.event_crew (event_id, day, call_time);

create function public.event_schedule_items_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    select agency_org_id into new.org_id from events where id = new.event_id;
  elsif new.event_id is distinct from old.event_id or new.org_id is distinct from old.org_id then
    raise exception 'schedule items cannot move to another event' using errcode = '22023';
  end if;
  if new.assignee_id is not null and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id)
     and not exists (select 1 from memberships where org_id = new.org_id and user_id = new.assignee_id) then
    raise exception 'assignee must be in the agency team' using errcode = '42501';
  end if;
  if new.booking_id is not null and (tg_op = 'INSERT' or new.booking_id is distinct from old.booking_id)
     and not exists (select 1 from event_bookings where id = new.booking_id and event_id = new.event_id) then
    raise exception 'booking belongs to another event' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger event_schedule_items_before_write before insert or update on public.event_schedule_items
  for each row execute function public.event_schedule_items_before_write();

create function public.event_crew_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    select agency_org_id into new.org_id from events where id = new.event_id;
  elsif new.event_id is distinct from old.event_id or new.org_id is distinct from old.org_id
        or new.booking_id is distinct from old.booking_id or new.user_id is distinct from old.user_id then
    raise exception 'crew entries cannot change person or event' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' and new.user_id is not null
     and not exists (select 1 from memberships where org_id = new.org_id and user_id = new.user_id) then
    raise exception 'staff must be in the agency team' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and new.booking_id is not null
     and not exists (select 1 from event_bookings where id = new.booking_id and event_id = new.event_id) then
    raise exception 'booking belongs to another event' using errcode = '22023';
  end if;
  -- Check-ins may be recorded offline and synced later: the arrival time sent by the app is kept,
  -- within the last two days and never in the future. Who checked in is always the caller.
  if new.checked_in_at is not null and (tg_op = 'INSERT' or old.checked_in_at is null) then
    new.checked_in_at := greatest(least(new.checked_in_at, now()), now() - interval '2 days');
    new.checked_in_by := auth.uid();
  elsif new.checked_in_at is not null then
    new.checked_in_at := old.checked_in_at;
    new.checked_in_by := old.checked_in_by;
  else
    new.checked_in_by := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger event_crew_before_write before insert or update on public.event_crew
  for each row execute function public.event_crew_before_write();

alter table public.event_schedule_items enable row level security;
create policy event_schedule_items_select on public.event_schedule_items for select to authenticated using (public.is_member(org_id));
create policy event_schedule_items_insert on public.event_schedule_items for insert to authenticated
  with check (created_by = auth.uid() and exists (select 1 from public.events e where e.id = event_id and public.is_member(e.agency_org_id)));
create policy event_schedule_items_update on public.event_schedule_items for update to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy event_schedule_items_delete on public.event_schedule_items for delete to authenticated using (public.is_member(org_id));

alter table public.event_crew enable row level security;
create policy event_crew_select on public.event_crew for select to authenticated using (public.is_member(org_id));
create policy event_crew_insert on public.event_crew for insert to authenticated
  with check (created_by = auth.uid() and exists (select 1 from public.events e where e.id = event_id and public.is_member(e.agency_org_id)));
create policy event_crew_update on public.event_crew for update to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy event_crew_delete on public.event_crew for delete to authenticated using (public.is_member(org_id));

revoke all on public.event_schedule_items, public.event_crew from anon, authenticated;
grant select, delete on public.event_schedule_items, public.event_crew to authenticated;
grant insert (event_id, org_id, day, starts_at, ends_at, title, location, notes, booking_id, assignee_id, created_by)
  on public.event_schedule_items to authenticated;
grant update (day, starts_at, ends_at, title, location, notes, booking_id, assignee_id) on public.event_schedule_items to authenticated;
grant insert (event_id, org_id, booking_id, user_id, name, role, phone, day, call_time, checked_in_at, created_by)
  on public.event_crew to authenticated;
grant update (name, role, phone, day, call_time, checked_in_at) on public.event_crew to authenticated;

revoke execute on function public.event_schedule_items_before_write, public.event_crew_before_write from public, anon, authenticated;
