-- Supplier accounts: an agency invites a supplier from its address book to claim its own I-Events
-- account. From then on the supplier receives the agency's booking requests in its area, answers
-- them (available with a price, or not available) and sees its schedule on the event day. Agency
-- costs, internal notes and the client stay private: suppliers read bookings only through the
-- functions below, never the table.

create table public.supplier_invitations (
  id uuid primary key default gen_random_uuid(),
  -- The agency whose address book holds the contact.
  org_id uuid not null references public.organizations (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '30 days',
  accepted_at timestamptz,
  supplier_org_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index supplier_invitations_open_idx on public.supplier_invitations (contact_id) where accepted_at is null;
create index contacts_supplier_org_idx on public.contacts (supplier_org_id) where supplier_org_id is not null;

-- Agencies can read the name of the supplier accounts linked to their contacts.
drop policy organizations_select on public.organizations;
create policy organizations_select on public.organizations for select to authenticated using (
  public.is_member(id)
  or exists (select 1 from public.my_org_ids() o where public.is_connected(o, organizations.id))
  or exists (select 1 from public.marketplace_profiles p where p.org_id = organizations.id and p.is_listed)
  or exists (select 1 from public.contacts c where c.supplier_org_id = organizations.id and public.is_member(c.org_id))
);

alter table public.supplier_invitations enable row level security;
create policy supplier_invitations_select on public.supplier_invitations for select to authenticated using (public.is_member(org_id));
revoke all on public.supplier_invitations from anon, authenticated;
grant select on public.supplier_invitations to authenticated;

-- The supplier's answer to a booking request, and when the request was (last) sent.
alter table public.event_bookings
  add column requested_at timestamptz,
  add column supplier_response text check (supplier_response in ('available', 'unavailable')),
  add column supplier_price numeric(12, 2) check (supplier_price >= 0),
  add column supplier_note text check (length(supplier_note) <= 2000),
  add column responded_at timestamptz;
-- Bookings already asked or confirmed count as sent.
update public.event_bookings set requested_at = updated_at where status in ('requested', 'confirmed');

-- Same rules as before; a new request (or another supplier) starts with no answer.
create or replace function public.event_bookings_before_write()
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
  if new.status = 'requested' and (tg_op = 'INSERT' or old.status <> 'requested' or new.contact_id is distinct from old.contact_id) then
    new.requested_at := now();
    new.supplier_response := null;
    new.supplier_price := null;
    new.supplier_note := null;
    new.responded_at := null;
  elsif tg_op = 'UPDATE' and new.contact_id is distinct from old.contact_id then
    -- Another supplier: confirmed directly or not asked yet, with no answer of its own.
    new.requested_at := case when new.status = 'confirmed' then now() end;
    new.supplier_response := null;
    new.supplier_price := null;
    new.supplier_note := null;
    new.responded_at := null;
  elsif new.status = 'confirmed' and new.requested_at is null then
    -- Confirmed without asking first: the supplier still gets it.
    new.requested_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- The supplier organization a booking is visible to: its contact's claimed account, once requested.
create function public.booking_supplier_org(b public.event_bookings)
returns uuid language sql stable security definer set search_path = public as $$
  select c.supplier_org_id from contacts c
   where c.id = b.contact_id and b.status in ('requested', 'confirmed') and b.requested_at is not null;
$$;

-- Tells the supplier about requests, confirmations and withdrawals.
create function public.notify_booking_supplier()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old uuid;
  v_new uuid := booking_supplier_org(new);
  v_agency text;
  v_body text;
  v_service text;
begin
  if tg_op = 'UPDATE' then v_old := booking_supplier_org(old); end if;
  if v_old is null and v_new is null then return new; end if;
  select name into v_agency from organizations where id = new.org_id;
  select coalesce(name ->> 'it', key) into v_service from service_categories where key = new.service_key;
  select concat_ws(' · ', v_service, e.title, to_char(e.start_date, 'DD/MM/YYYY')) into v_body from events e where e.id = new.event_id;

  if v_old is not null and v_old is distinct from v_new then
    perform notify_org(v_old, 'booking_cancelled', format('%s ha annullato la richiesta', v_agency), v_body, '/supplier/richieste');
  end if;
  if v_new is not null and new.status = 'requested'
     and (v_old is distinct from v_new or old.status is distinct from 'requested' or new.requested_at is distinct from old.requested_at) then
    perform notify_org(v_new, 'booking_requested', format('Nuova richiesta da %s', v_agency), v_body, '/supplier/richieste/' || new.id);
  elsif v_new is not null and new.status = 'confirmed' and (v_old is distinct from v_new or old.status is distinct from 'confirmed') then
    perform notify_org(v_new, 'booking_confirmed', format('%s ti ha confermato', v_agency), v_body, '/supplier/richieste/' || new.id);
  end if;
  return new;
end;
$$;
create trigger event_bookings_notify_supplier after insert or update of status, contact_id on public.event_bookings
  for each row execute function public.notify_booking_supplier();

-- Agency: invites the supplier behind a contact to claim its account. Returns the link token.
create function public.invite_supplier(p_contact uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  c contacts;
  v_token text;
begin
  select * into c from contacts where id = p_contact;
  if c.id is null or not is_member(c.org_id) or (select type from organizations where id = c.org_id) <> 'agency' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if c.supplier_org_id is not null then raise exception 'already on I-Events' using errcode = '22023'; end if;
  delete from supplier_invitations where contact_id = c.id and accepted_at is null;
  insert into supplier_invitations (org_id, contact_id, invited_by) values (c.org_id, c.id, auth.uid())
  returning token into v_token;
  perform log_activity(c.org_id, 'supplier_invitation', c.id, 'created');
  return v_token;
end;
$$;

-- Supplier: claims the contact with one of its supplier organizations (owner or admin).
create function public.accept_supplier_invitation(p_token text, p_org uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv supplier_invitations;
  v_supplier text;
  v_contact text;
begin
  if not is_member(p_org, array['owner', 'admin']::member_role[]) or (select type from organizations where id = p_org) <> 'supplier' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into inv from supplier_invitations where token = p_token for update;
  if inv.id is null or inv.accepted_at is not null or inv.expires_at < now() then
    raise exception 'invitation not valid' using errcode = 'P0002';
  end if;
  update contacts set supplier_org_id = p_org, updated_at = now() where id = inv.contact_id returning name into v_contact;
  update supplier_invitations set accepted_at = now(), supplier_org_id = p_org where id = inv.id;
  select name into v_supplier from organizations where id = p_org;
  perform notify_org(inv.org_id, 'supplier_joined', format('%s è ora su I-Events', v_contact),
    format('Le richieste per %s arrivano direttamente nel suo account.', v_supplier), '/pro/rubrica/' || inv.contact_id);
  perform log_activity(p_org, 'supplier_invitation', inv.id, 'accepted');
  return inv.contact_id;
end;
$$;

-- What an invitation link shows before it is accepted, now including supplier invitations.
create or replace function public.preview_invitation(p_token text)
returns table (kind text, org_name text, org_type public.org_type, role public.member_role, valid boolean)
language sql stable security definer set search_path = public as $$
  select 'member', o.name, o.type, i.role, (i.accepted_at is null and i.expires_at > now())
    from member_invitations i join organizations o on o.id = i.org_id
   where i.token = p_token
  union all
  select 'connection', o.name, o.type, null, c.status = 'pending'
    from connections c join organizations o on o.id = c.initiated_by_org
   where c.token = p_token
  union all
  select 'supplier', o.name, o.type, null, (s.accepted_at is null and s.expires_at > now())
    from supplier_invitations s join organizations o on o.id = s.org_id
   where s.token = p_token;
$$;

-- Supplier: the requests it received, with what it needs to know about the event and nothing else.
create function public.supplier_bookings(p_org uuid)
returns table (
  id uuid, agency_name text, event_title text, event_status public.event_status, start_date date, end_date date,
  city text, venue text, service_key text, description text, status public.booking_status, requested_at timestamptz,
  supplier_response text, supplier_price numeric, supplier_note text, responded_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select b.id, a.name, e.title, e.status, e.start_date, e.end_date, e.city, e.venue, b.service_key, b.description, b.status,
         b.requested_at, b.supplier_response, b.supplier_price, b.supplier_note, b.responded_at
    from event_bookings b
    join contacts c on c.id = b.contact_id
    join events e on e.id = b.event_id
    join organizations a on a.id = b.org_id
   where is_member(p_org) and c.supplier_org_id = p_org and b.requested_at is not null
     and b.status in ('requested', 'confirmed', 'cancelled')
   order by e.start_date nulls last, b.requested_at;
$$;

create function public.is_booking_supplier(p_booking uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from event_bookings b join contacts c on c.id = b.contact_id
     where b.id = p_booking and b.requested_at is not null and b.status in ('requested', 'confirmed', 'cancelled')
       and is_member(c.supplier_org_id)
  );
$$;

-- Supplier: its part of the run of show once confirmed: when to arrive and the moments it is in.
create function public.supplier_booking_schedule(p_booking uuid)
returns table (kind text, day date, starts_at time, ends_at time, title text, location text)
language sql stable security definer set search_path = public as $$
  select * from (
    select 'call'::text as kind, w.day, w.call_time as starts_at, null::time as ends_at, 'Arrivo'::text as title, null::text as location
      from event_crew w join event_bookings b on b.id = w.booking_id
     where w.booking_id = p_booking and w.call_time is not null and b.status = 'confirmed'
    union all
    select 'item', i.day, i.starts_at, i.ends_at, i.title, i.location
      from event_schedule_items i join event_bookings b on b.id = i.booking_id
     where i.booking_id = p_booking and b.status = 'confirmed'
  ) s
  where is_booking_supplier(p_booking)
  order by s.day, s.starts_at, s.kind;
$$;

-- Supplier: answers a pending request. A price, when the agency has none yet, becomes its planned cost.
create function public.respond_to_booking(p_booking uuid, p_available boolean, p_price numeric default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  b event_bookings;
  v_supplier text;
  v_service text;
  v_event text;
begin
  if not is_booking_supplier(p_booking) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into b from event_bookings where id = p_booking for update;
  if b.status <> 'requested' then raise exception 'request is not open' using errcode = '22023'; end if;
  if p_price is not null and (p_price < 0 or p_price > 10000000) then raise exception 'invalid price' using errcode = '22023'; end if;
  update event_bookings
     set supplier_response = case when p_available then 'available' else 'unavailable' end,
         supplier_price = case when p_available then round(p_price, 2) end,
         supplier_note = nullif(left(trim(p_note), 2000), ''),
         responded_at = now(),
         planned_cost = case when p_available and planned_cost is null then round(p_price, 2) else planned_cost end
   where id = b.id;
  select o.name into v_supplier from contacts c join organizations o on o.id = c.supplier_org_id where c.id = b.contact_id;
  select coalesce(name ->> 'it', key) into v_service from service_categories where key = b.service_key;
  select title into v_event from events where id = b.event_id;
  perform notify_org(b.org_id, 'booking_response',
    case when p_available then format('%s è disponibile', v_supplier) else format('%s non è disponibile', v_supplier) end,
    concat_ws(' · ', v_service, v_event,
      case when p_available and p_price is not null then to_char(p_price, 'FM999G999G990D00') || ' €' end,
      nullif(left(trim(p_note), 200), '')),
    '/pro/eventi/' || b.event_id);
  perform log_activity(b.org_id, 'event_booking', b.id, case when p_available then 'available' else 'unavailable' end);
end;
$$;

-- Supplier: the agencies that work with it on I-Events.
create function public.supplier_agencies(p_org uuid)
returns table (agency_name text, open_requests bigint)
language sql stable security definer set search_path = public as $$
  select a.name, count(b.id) filter (where b.status = 'requested' and b.supplier_response is null)
    from contacts c
    join organizations a on a.id = c.org_id
    left join event_bookings b on b.contact_id = c.id and b.requested_at is not null
   where is_member(p_org) and c.supplier_org_id = p_org
   group by a.id, a.name
   order by a.name;
$$;

revoke execute on function public.booking_supplier_org, public.notify_booking_supplier from public, anon, authenticated;
revoke execute on function public.invite_supplier, public.accept_supplier_invitation, public.supplier_bookings,
  public.is_booking_supplier, public.supplier_booking_schedule, public.respond_to_booking, public.supplier_agencies from public, anon;
grant execute on function public.invite_supplier, public.accept_supplier_invitation, public.supplier_bookings,
  public.is_booking_supplier, public.supplier_booking_schedule, public.respond_to_booking, public.supplier_agencies to authenticated;
