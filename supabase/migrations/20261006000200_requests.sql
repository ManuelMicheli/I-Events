-- Requests from clients, the agencies they are sent to (one proposal per agency), and the events
-- created when the client accepts a proposal.

create type public.request_kind as enum ('single', 'campaign');
create type public.request_status as enum ('draft', 'sent', 'awarded', 'cancelled');
create type public.proposal_status as enum (
  'invited', 'reviewing', 'clarification', 'submitted', 'revision_requested',
  'accepted', 'rejected', 'declined', 'withdrawn'
);
create type public.event_status as enum ('planning', 'preparing', 'live', 'completed', 'cancelled');

-- Catalog mirror of packages/core SERVICE_CATALOG (seeded by supabase/seed.sql).
create table public.service_categories (
  key text primary key,
  name jsonb not null,
  icon text not null,
  questions jsonb not null default '[]',
  sort int not null default 0,
  active boolean not null default true
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  client_org_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  kind public.request_kind not null,
  status public.request_status not null default 'draft',
  title text not null check (char_length(title) between 3 and 120),
  objective text not null,
  start_date date,
  end_date date,
  guests int check (guests > 0),
  budget_min numeric(12, 2) check (budget_min >= 0),
  budget_max numeric(12, 2) check (budget_max >= 0),
  is_public boolean not null default false,
  audience text,
  city text,
  free_text text,
  -- Campaign structure: { eventsCount, sameVenue, servicesMode }
  campaign jsonb,
  completeness int not null default 0 check (completeness between 0 and 100),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or start_date <= end_date),
  check (budget_min is null or budget_max is null or budget_min <= budget_max),
  check ((kind = 'campaign') = (campaign is not null))
);
create index requests_client_idx on public.requests (client_org_id, status);

create table public.campaign_stages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  position int not null check (position >= 0),
  city text,
  venue_hint text,
  date date,
  unique (request_id, position)
);

create table public.request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  stage_id uuid references public.campaign_stages (id) on delete cascade,
  category_key text not null references public.service_categories (key),
  answers jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create unique index request_items_unique_idx on public.request_items (request_id, category_key, coalesce(stage_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- One row per agency a request was sent to.
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  agency_org_id uuid not null references public.organizations (id) on delete cascade,
  status public.proposal_status not null default 'invited',
  total_amount numeric(12, 2) check (total_amount >= 0),
  currency char(3) not null default 'EUR',
  summary text,
  -- Line items: [{ category, description, amount }]
  lines jsonb not null default '[]',
  version int not null default 0,
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, agency_org_id)
);
create index proposals_agency_idx on public.proposals (agency_org_id, status);

-- Conversation between client and one agency about one proposal. Agency-internal notes have internal = true.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  author_org_id uuid not null references public.organizations (id) on delete cascade,
  item_id uuid references public.request_items (id) on delete set null,
  body text not null check (char_length(body) between 1 and 10000),
  internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_proposal_idx on public.messages (proposal_id, created_at);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  proposal_id uuid not null references public.proposals (id) on delete restrict,
  stage_id uuid references public.campaign_stages (id) on delete set null,
  agency_org_id uuid not null references public.organizations (id) on delete cascade,
  client_org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  status public.event_status not null default 'planning',
  start_date date,
  end_date date,
  city text,
  venue text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index events_agency_idx on public.events (agency_org_id, status);
create index events_client_idx on public.events (client_org_id, status);

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create function public.can_read_request(p_request uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from requests r
    where r.id = p_request
      and (
        is_member(r.client_org_id)
        or (r.status <> 'draft' and exists (
          select 1 from proposals p where p.request_id = r.id and is_member(p.agency_org_id)
            and p.status not in ('declined')
        ))
      )
  );
$$;

create function public.can_edit_request(p_request uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from requests r
    where r.id = p_request and r.status = 'draft'
      and is_member(r.client_org_id, array['owner', 'admin', 'manager', 'member']::member_role[])
  );
$$;

-- ---------------------------------------------------------------------------
-- RPCs: the only way statuses change.
-- ---------------------------------------------------------------------------

-- Send a draft to one or more agencies. Limit on the number of agencies comes from the plan.
create function public.submit_request(p_request uuid, p_agencies uuid[])
returns int language plpgsql security definer set search_path = public as $$
declare
  r requests;
  v_plan plan_id;
  v_limit int;
  v_agency uuid;
  v_count int := 0;
begin
  select * into r from requests where id = p_request for update;
  if r.id is null then raise exception 'request not found' using errcode = 'P0002'; end if;
  if not is_member(r.client_org_id, array['owner', 'admin', 'manager']::member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if r.status <> 'draft' then raise exception 'request already sent' using errcode = '22023'; end if;
  if coalesce(array_length(p_agencies, 1), 0) = 0 then raise exception 'choose at least one agency' using errcode = '22023'; end if;
  if not exists (select 1 from request_items where request_id = r.id) and coalesce(trim(r.free_text), '') = '' then
    raise exception 'request is empty' using errcode = '22023';
  end if;
  if r.kind = 'campaign' and (select count(*) from campaign_stages where request_id = r.id) <> (r.campaign ->> 'eventsCount')::int then
    raise exception 'campaign stages do not match the number of events' using errcode = '22023';
  end if;

  select plan into v_plan from subscriptions where org_id = r.client_org_id;
  v_limit := case coalesce(v_plan, 'trial') when 'trial' then 3 when 'starter' then 3 when 'pro' then 5 else 10 end;
  if array_length(p_agencies, 1) > v_limit then
    raise exception 'plan allows % agencies per request', v_limit using errcode = '22023';
  end if;

  foreach v_agency in array p_agencies loop
    if (select type from organizations where id = v_agency) is distinct from 'agency' then
      raise exception 'not an agency: %', v_agency using errcode = '22023';
    end if;
    -- Reachable agencies: connected ones, or listed on the marketplace.
    if not (is_connected(r.client_org_id, v_agency)
            or exists (select 1 from marketplace_profiles m where m.org_id = v_agency and m.is_listed)) then
      raise exception 'agency not reachable: %', v_agency using errcode = '42501';
    end if;
    insert into proposals (request_id, agency_org_id) values (r.id, v_agency) on conflict do nothing;
    v_count := v_count + 1;
  end loop;

  update requests set status = 'sent', submitted_at = now(), updated_at = now() where id = r.id;
  perform log_activity(r.client_org_id, 'request', r.id, 'sent', jsonb_build_object('agencies', p_agencies));
  return v_count;
end;
$$;

-- Agency-side moves: reviewing, clarification, declined, withdrawn.
create function public.set_proposal_status(p_proposal uuid, p_status public.proposal_status)
returns void language plpgsql security definer set search_path = public as $$
declare
  p proposals;
  v_ok boolean;
begin
  select * into p from proposals where id = p_proposal for update;
  if p.id is null then raise exception 'proposal not found' using errcode = 'P0002'; end if;
  if not is_member(p.agency_org_id, array['owner', 'admin', 'manager']::member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_ok := (p.status, p_status) in (
    ('invited', 'reviewing'), ('invited', 'declined'),
    ('reviewing', 'clarification'), ('reviewing', 'declined'),
    ('clarification', 'reviewing'), ('clarification', 'declined'),
    ('revision_requested', 'declined'),
    ('submitted', 'withdrawn')
  );
  if not v_ok then raise exception 'cannot move proposal from % to %', p.status, p_status using errcode = '22023'; end if;
  update proposals set status = p_status, updated_at = now() where id = p.id;
  perform log_activity(p.agency_org_id, 'proposal', p.id, p_status::text);
end;
$$;

-- Agency sends (or re-sends) its offer.
create function public.submit_proposal(p_proposal uuid, p_total numeric, p_summary text, p_lines jsonb default '[]')
returns int language plpgsql security definer set search_path = public as $$
declare p proposals;
begin
  select * into p from proposals where id = p_proposal for update;
  if p.id is null then raise exception 'proposal not found' using errcode = 'P0002'; end if;
  if not is_member(p.agency_org_id, array['owner', 'admin', 'manager']::member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p.status not in ('invited', 'reviewing', 'clarification', 'revision_requested', 'withdrawn') then
    raise exception 'cannot submit from %', p.status using errcode = '22023';
  end if;
  if (select status from requests where id = p.request_id) <> 'sent' then
    raise exception 'request is closed' using errcode = '22023';
  end if;
  if p_total is null or p_total < 0 then raise exception 'total required' using errcode = '22023'; end if;
  if jsonb_typeof(coalesce(p_lines, '[]')) <> 'array' then raise exception 'lines must be an array' using errcode = '22023'; end if;
  update proposals
     set status = 'submitted', total_amount = p_total, summary = p_summary, lines = coalesce(p_lines, '[]'),
         version = version + 1, submitted_at = now(), updated_at = now()
   where id = p.id;
  perform log_activity(p.agency_org_id, 'proposal', p.id, 'submitted', jsonb_build_object('total', p_total));
  return p.version + 1;
end;
$$;

-- Client asks an agency to revise its offer.
create function public.request_revision(p_proposal uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare p proposals; v_client uuid;
begin
  select * into p from proposals where id = p_proposal for update;
  select client_org_id into v_client from requests where id = p.request_id;
  if not is_member(v_client, array['owner', 'admin', 'manager', 'approver']::member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p.status <> 'submitted' then raise exception 'only submitted proposals can be revised' using errcode = '22023'; end if;
  update proposals set status = 'revision_requested', updated_at = now() where id = p.id;
  if coalesce(trim(p_note), '') <> '' then
    insert into messages (proposal_id, author_id, author_org_id, body) values (p.id, auth.uid(), v_client, p_note);
  end if;
  perform log_activity(v_client, 'proposal', p.id, 'revision_requested');
end;
$$;

-- Client picks the winner: the request is awarded, other open proposals are rejected and the
-- event (or one event per campaign stage) is created for the winning agency.
create function public.accept_proposal(p_proposal uuid)
returns setof uuid language plpgsql security definer set search_path = public as $$
declare
  p proposals;
  r requests;
  s campaign_stages;
  v_event uuid;
begin
  select * into p from proposals where id = p_proposal for update;
  if p.id is null then raise exception 'proposal not found' using errcode = 'P0002'; end if;
  select * into r from requests where id = p.request_id for update;
  if not is_member(r.client_org_id, array['owner', 'admin', 'approver']::member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if r.status <> 'sent' then raise exception 'request is not open' using errcode = '22023'; end if;
  if p.status <> 'submitted' then raise exception 'only submitted proposals can be accepted' using errcode = '22023'; end if;

  update proposals set status = 'accepted', decided_at = now(), updated_at = now() where id = p.id;
  update proposals set status = 'rejected', decided_at = now(), updated_at = now()
   where request_id = r.id and id <> p.id
     and status in ('invited', 'reviewing', 'clarification', 'submitted', 'revision_requested', 'withdrawn');
  update requests set status = 'awarded', updated_at = now() where id = r.id;

  if r.kind = 'single' then
    insert into events (request_id, proposal_id, agency_org_id, client_org_id, title, start_date, end_date, city, is_public)
    values (r.id, p.id, p.agency_org_id, r.client_org_id, r.title, r.start_date, r.end_date, r.city, r.is_public)
    returning id into v_event;
    return next v_event;
  else
    for s in select * from campaign_stages where request_id = r.id order by position loop
      insert into events (request_id, proposal_id, stage_id, agency_org_id, client_org_id, title, start_date, end_date, city, venue, is_public)
      values (r.id, p.id, s.id, p.agency_org_id, r.client_org_id,
              r.title || ' · ' || coalesce(s.city, 'tappa ' || (s.position + 1)),
              coalesce(s.date, r.start_date), coalesce(s.date, r.end_date), coalesce(s.city, r.city), s.venue_hint, r.is_public)
      returning id into v_event;
      return next v_event;
    end loop;
  end if;
  perform log_activity(r.client_org_id, 'request', r.id, 'awarded', jsonb_build_object('proposal', p.id));
  perform log_activity(p.agency_org_id, 'proposal', p.id, 'accepted');
end;
$$;

-- Event status follows planning -> preparing -> live -> completed, with cancel before live.
create function public.check_event_status()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status and not (old.status, new.status) in (
    ('planning', 'preparing'), ('planning', 'cancelled'),
    ('preparing', 'live'), ('preparing', 'cancelled'),
    ('live', 'completed')
  ) then
    raise exception 'cannot move event from % to %', old.status, new.status using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger events_status_flow before update on public.events
  for each row execute function public.check_event_status();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.service_categories enable row level security;
alter table public.requests enable row level security;
alter table public.campaign_stages enable row level security;
alter table public.request_items enable row level security;
alter table public.request_attachments enable row level security;
alter table public.proposals enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;

-- An agency sees the clients that sent it a request, and a client sees the agencies it asked.
create function public.shares_request_with(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from proposals p join requests r on r.id = p.request_id
    where r.status <> 'draft'
      and ((r.client_org_id = p_org and is_member(p.agency_org_id))
        or (p.agency_org_id = p_org and is_member(r.client_org_id)))
  );
$$;
create policy organizations_select_via_requests on public.organizations for select to authenticated
  using (public.shares_request_with(id));

create policy service_categories_select on public.service_categories for select to anon, authenticated using (active);

create policy requests_select on public.requests for select to authenticated using (
  public.is_member(client_org_id) or public.can_read_request(id)
);
create policy requests_insert on public.requests for insert to authenticated with check (
  status = 'draft' and created_by = auth.uid()
  and public.is_member(client_org_id, array['owner', 'admin', 'manager', 'member']::public.member_role[])
  and (select type from public.organizations where id = client_org_id) = 'client'
);
create policy requests_update on public.requests for update to authenticated
  using (public.can_edit_request(id)) with check (status = 'draft');
create policy requests_delete on public.requests for delete to authenticated using (public.can_edit_request(id));

create policy stages_select on public.campaign_stages for select to authenticated using (public.can_read_request(request_id));
create policy stages_write on public.campaign_stages for all to authenticated
  using (public.can_edit_request(request_id)) with check (public.can_edit_request(request_id));

create policy items_select on public.request_items for select to authenticated using (public.can_read_request(request_id));
create policy items_write on public.request_items for all to authenticated
  using (public.can_edit_request(request_id)) with check (public.can_edit_request(request_id));

create policy attachments_select on public.request_attachments for select to authenticated using (public.can_read_request(request_id));
create policy attachments_write on public.request_attachments for all to authenticated
  using (public.can_edit_request(request_id)) with check (public.can_edit_request(request_id));

-- Client sees every proposal on its requests; an agency sees only its own.
create policy proposals_select on public.proposals for select to authenticated using (
  public.is_member(agency_org_id)
  or exists (select 1 from public.requests r where r.id = request_id and public.is_member(r.client_org_id))
);

create policy messages_select on public.messages for select to authenticated using (
  exists (
    select 1 from public.proposals p join public.requests r on r.id = p.request_id
    where p.id = proposal_id
      and (public.is_member(p.agency_org_id) or (not internal and public.is_member(r.client_org_id)))
  )
);
create policy messages_insert on public.messages for insert to authenticated with check (
  author_id = auth.uid()
  and public.is_member(author_org_id)
  and exists (
    select 1 from public.proposals p join public.requests r on r.id = p.request_id
    where p.id = proposal_id
      and r.status <> 'draft'
      and p.status not in ('declined')
      and (author_org_id = p.agency_org_id or (author_org_id = r.client_org_id and not internal))
  )
);

create policy events_select on public.events for select to authenticated using (
  public.is_member(agency_org_id) or public.is_member(client_org_id)
);
create policy events_update on public.events for update to authenticated
  using (public.is_member(agency_org_id, array['owner', 'admin', 'manager']::public.member_role[]))
  with check (public.is_member(agency_org_id, array['owner', 'admin', 'manager']::public.member_role[]));

revoke all on public.service_categories, public.requests, public.campaign_stages, public.request_items,
  public.request_attachments, public.proposals, public.messages, public.events from anon, authenticated;
revoke execute on all functions in schema public from anon;

grant select on public.service_categories to anon, authenticated;
grant select, insert, delete on public.requests to authenticated;
grant update (kind, title, objective, start_date, end_date, guests, budget_min, budget_max, is_public,
  audience, city, free_text, campaign, completeness, updated_at) on public.requests to authenticated;
grant select, insert, update, delete on public.campaign_stages, public.request_items, public.request_attachments to authenticated;
grant select on public.proposals, public.events to authenticated;
grant select, insert on public.messages to authenticated;
grant update (title, status, start_date, end_date, city, venue, is_public) on public.events to authenticated;
