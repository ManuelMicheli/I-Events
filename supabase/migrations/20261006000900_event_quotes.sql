-- Event quote: after winning, the agency sends the client the detailed quote for each event, in
-- versions. The client's owner, admin or spend approver approves it or asks for changes. The latest
-- approved version is what the event is sold for.

create type public.quote_status as enum ('draft', 'sent', 'approved', 'changes_requested', 'superseded');

create table public.event_quotes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  -- Copied from the event: the agency writes the quote, the client decides on it.
  org_id uuid not null references public.organizations (id) on delete cascade,
  client_org_id uuid not null references public.organizations (id) on delete cascade,
  status public.quote_status not null default 'draft',
  -- Set when sent: 1, 2, 3...
  version int,
  -- Same shape as proposal lines: [{ category, description, amount }]
  lines jsonb not null default '[]' check (jsonb_typeof(lines) = 'array'),
  total_amount numeric(12, 2) not null default 0,
  note text check (length(note) <= 5000),
  decision_note text check (length(decision_note) <= 2000),
  created_by uuid references auth.users (id) on delete set null,
  sent_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, version)
);
-- One draft at a time per event.
create unique index event_quotes_one_draft on public.event_quotes (event_id) where status = 'draft';

create function public.event_quotes_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    select agency_org_id, client_org_id into new.org_id, new.client_org_id from events where id = new.event_id;
  elsif new.event_id is distinct from old.event_id or new.org_id is distinct from old.org_id or new.client_org_id is distinct from old.client_org_id then
    raise exception 'quotes cannot move to another event' using errcode = '22023';
  elsif old.status <> 'draft' and (new.lines is distinct from old.lines or new.note is distinct from old.note) then
    raise exception 'a sent quote cannot be edited' using errcode = '22023';
  end if;
  if jsonb_array_length(new.lines) > 200
     or exists (select 1 from jsonb_array_elements(new.lines) l where jsonb_typeof(l -> 'amount') <> 'number' or (l ->> 'amount')::numeric < 0) then
    raise exception 'invalid quote lines' using errcode = '22023';
  end if;
  -- The total always matches the lines.
  new.total_amount := coalesce((select sum(round((l ->> 'amount')::numeric, 2)) from jsonb_array_elements(new.lines) l), 0);
  new.updated_at := now();
  return new;
end;
$$;
create trigger event_quotes_before_write before insert or update on public.event_quotes
  for each row execute function public.event_quotes_before_write();

-- Agency: sends the current draft as the next version; earlier open versions are superseded.
create function public.send_event_quote(p_quote uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  q event_quotes;
  v_version int;
begin
  select * into q from event_quotes where id = p_quote for update;
  if q.id is null or not is_member(q.org_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if q.status <> 'draft' then raise exception 'quote already sent' using errcode = '22023'; end if;
  if jsonb_array_length(q.lines) = 0 then raise exception 'quote has no lines' using errcode = '22023'; end if;
  if exists (select 1 from events where id = q.event_id and status in ('completed', 'cancelled')) then
    raise exception 'event is closed' using errcode = '22023';
  end if;
  perform 1 from events where id = q.event_id for update;
  select coalesce(max(version), 0) + 1 into v_version from event_quotes where event_id = q.event_id;
  update event_quotes set status = 'superseded', updated_at = now()
   where event_id = q.event_id and status in ('sent', 'changes_requested');
  update event_quotes set status = 'sent', version = v_version, sent_at = now() where id = q.id;
  perform log_activity(q.org_id, 'event_quote', q.id, 'sent', jsonb_build_object('version', v_version));
  return v_version;
end;
$$;

-- Client: only owners, admins and spend approvers decide; a request for changes needs a reason.
create function public.decide_event_quote(p_quote uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  q event_quotes;
begin
  select * into q from event_quotes where id = p_quote for update;
  if q.id is null or not is_member(q.client_org_id, array['owner', 'admin', 'approver']::member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if q.status <> 'sent' then raise exception 'quote is not waiting for a decision' using errcode = '22023'; end if;
  if not p_approve and coalesce(trim(p_note), '') = '' then
    raise exception 'say what to change' using errcode = '22023';
  end if;
  update event_quotes
     set status = case when p_approve then 'approved'::quote_status else 'changes_requested'::quote_status end,
         decided_at = now(), decided_by = auth.uid(), decision_note = nullif(left(trim(p_note), 2000), '')
   where id = q.id;
  perform log_activity(q.client_org_id, 'event_quote', q.id, case when p_approve then 'approved' else 'changes_requested' end);
end;
$$;

create function public.notify_event_quote()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_event text;
  v_agency text;
  v_client text;
begin
  if new.status is not distinct from old.status then return new; end if;
  select title into v_event from events where id = new.event_id;
  select name into v_agency from organizations where id = new.org_id;
  select name into v_client from organizations where id = new.client_org_id;
  case new.status
    when 'sent' then
      perform notify_org(new.client_org_id, 'quote_sent',
        case when new.version > 1 then format('%s ha aggiornato il preventivo', v_agency) else format('Preventivo da approvare da %s', v_agency) end,
        v_event, '/client/eventi/' || new.event_id);
    when 'approved' then
      perform notify_org(new.org_id, 'quote_approved', format('%s ha approvato il preventivo', v_client), v_event, '/pro/eventi/' || new.event_id);
    when 'changes_requested' then
      perform notify_org(new.org_id, 'quote_changes_requested', format('%s chiede modifiche al preventivo', v_client),
        v_event || ': ' || left(new.decision_note, 200), '/pro/eventi/' || new.event_id);
    else
      null;
  end case;
  return new;
end;
$$;
create trigger event_quotes_notify after update of status on public.event_quotes
  for each row execute function public.notify_event_quote();

alter table public.event_quotes enable row level security;
create policy event_quotes_select on public.event_quotes for select to authenticated using (
  public.is_member(org_id) or (status <> 'draft' and public.is_member(client_org_id))
);
create policy event_quotes_insert on public.event_quotes for insert to authenticated
  with check (created_by = auth.uid() and exists (select 1 from public.events e where e.id = event_id and public.is_member(e.agency_org_id)));
create policy event_quotes_update on public.event_quotes for update to authenticated
  using (public.is_member(org_id) and status = 'draft') with check (public.is_member(org_id));
create policy event_quotes_delete on public.event_quotes for delete to authenticated
  using (public.is_member(org_id) and status = 'draft');

revoke all on public.event_quotes from anon, authenticated;
grant select, delete on public.event_quotes to authenticated;
grant insert (event_id, org_id, client_org_id, lines, note, created_by) on public.event_quotes to authenticated;
grant update (lines, note) on public.event_quotes to authenticated;

revoke execute on function public.event_quotes_before_write, public.notify_event_quote from public, anon, authenticated;
revoke execute on function public.send_event_quote, public.decide_event_quote from public, anon;
grant execute on function public.send_event_quote, public.decide_event_quote to authenticated;
