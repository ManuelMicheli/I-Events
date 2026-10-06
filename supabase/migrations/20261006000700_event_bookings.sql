-- Event workspace: for each service an event needs, the agency picks a supplier from its address book,
-- tracks the booking, and records the planned and actual cost. Bookings are the agency's own working
-- data: the client never sees suppliers or costs.

create type public.booking_status as enum ('to_book', 'requested', 'confirmed', 'cancelled');

create table public.event_bookings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  -- The agency running the event, always copied from the event so access checks stay simple.
  org_id uuid not null references public.organizations (id) on delete cascade,
  service_key text not null references public.service_categories (key),
  description text check (length(description) <= 300),
  contact_id uuid references public.contacts (id) on delete set null,
  status public.booking_status not null default 'to_book',
  planned_cost numeric(12, 2) check (planned_cost >= 0),
  actual_cost numeric(12, 2) check (actual_cost >= 0),
  notes text check (length(notes) <= 2000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index event_bookings_event_idx on public.event_bookings (event_id, created_at);
create index event_bookings_contact_idx on public.event_bookings (contact_id) where contact_id is not null;

create function public.event_bookings_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    select agency_org_id into new.org_id from events where id = new.event_id;
  elsif new.event_id is distinct from old.event_id or new.org_id is distinct from old.org_id then
    raise exception 'bookings cannot move to another event' using errcode = '22023';
  end if;
  if new.contact_id is not null and (tg_op = 'INSERT' or new.contact_id is distinct from old.contact_id)
     and not exists (select 1 from contacts where id = new.contact_id and org_id = new.org_id) then
    raise exception 'supplier must be in the agency address book' using errcode = '42501';
  end if;
  -- A supplier can only be asked or confirmed once chosen. Deleting the contact later keeps the booking.
  if new.status in ('requested', 'confirmed') and new.contact_id is null
     and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    raise exception 'choose a supplier first' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger event_bookings_before_write before insert or update on public.event_bookings
  for each row execute function public.event_bookings_before_write();

-- Every new event starts with one booking per service the client asked for (for campaigns, the
-- services of that stage plus the ones requested for every stage).
create function public.seed_event_bookings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into event_bookings (event_id, org_id, service_key)
  select new.id, new.agency_org_id, i.category_key
    from request_items i
    join service_categories c on c.key = i.category_key
   where i.request_id = new.request_id
     and (i.stage_id is null or i.stage_id is not distinct from new.stage_id)
   group by i.category_key, c.sort
   order by c.sort;
  return new;
end;
$$;
create trigger events_seed_bookings after insert on public.events
  for each row execute function public.seed_event_bookings();

-- Events created before this migration get their bookings too.
insert into public.event_bookings (event_id, org_id, service_key)
select e.id, e.agency_org_id, i.category_key
  from public.events e
  join public.request_items i on i.request_id = e.request_id and (i.stage_id is null or i.stage_id is not distinct from e.stage_id)
 group by e.id, e.agency_org_id, i.category_key;

alter table public.event_bookings enable row level security;
create policy event_bookings_select on public.event_bookings for select to authenticated using (public.is_member(org_id));
create policy event_bookings_insert on public.event_bookings for insert to authenticated
  with check (created_by = auth.uid() and exists (select 1 from public.events e where e.id = event_id and public.is_member(e.agency_org_id)));
create policy event_bookings_update on public.event_bookings for update to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy event_bookings_delete on public.event_bookings for delete to authenticated using (public.is_member(org_id));

revoke all on public.event_bookings from anon, authenticated;
grant select, delete on public.event_bookings to authenticated;
grant insert (event_id, org_id, service_key, description, contact_id, status, planned_cost, actual_cost, notes, created_by)
  on public.event_bookings to authenticated;
grant update (service_key, description, contact_id, status, planned_cost, actual_cost, notes)
  on public.event_bookings to authenticated;

revoke execute on function public.event_bookings_before_write, public.seed_event_bookings from public, anon, authenticated;
