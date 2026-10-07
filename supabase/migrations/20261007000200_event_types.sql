-- What kind of event it is ("Che evento è?"): six types, the same for Pubblico, Client and Pro.
-- Each type has its ink (packages/core/src/event-types.ts). Older requests and events have none.
create type public.event_type as enum ('music', 'brand', 'business', 'gala', 'culture', 'sport');

alter table public.requests add column event_type public.event_type;
alter table public.events add column event_type public.event_type;
-- Clients set it in their drafts (save_request_draft runs as the caller); agencies may correct it.
grant update (event_type) on public.requests, public.events to authenticated;

-- An event takes the type of the request it comes from (accept_proposal creates events).
create function public.events_inherit_type()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.event_type is null then
    select event_type into new.event_type from requests where id = new.request_id;
  end if;
  return new;
end;
$$;
create trigger events_inherit_type before insert on public.events
  for each row execute function public.events_inherit_type();

-- The wizard saves the type with the rest of the draft (p_payload.event_type).
create or replace function public.save_request_draft(p_client_org uuid, p_payload jsonb, p_request uuid default null)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := p_request;
  v_stage_ids uuid[];
begin
  if v_id is null then
    insert into requests (client_org_id, created_by, kind, event_type, title, objective, campaign)
    values (p_client_org, auth.uid(), (p_payload ->> 'kind')::request_kind, (p_payload ->> 'event_type')::event_type,
            p_payload ->> 'title', p_payload ->> 'objective',
            case when jsonb_typeof(p_payload -> 'campaign') = 'object' then p_payload -> 'campaign' end)
    returning id into v_id;
  end if;

  update requests set
    kind = (p_payload ->> 'kind')::request_kind,
    event_type = (p_payload ->> 'event_type')::event_type,
    title = p_payload ->> 'title',
    objective = p_payload ->> 'objective',
    start_date = (p_payload ->> 'start_date')::date,
    end_date = (p_payload ->> 'end_date')::date,
    guests = (p_payload ->> 'guests')::int,
    budget_min = (p_payload ->> 'budget_min')::numeric,
    budget_max = (p_payload ->> 'budget_max')::numeric,
    is_public = coalesce((p_payload ->> 'is_public')::boolean, false),
    audience = p_payload ->> 'audience',
    city = p_payload ->> 'city',
    free_text = p_payload ->> 'free_text',
    campaign = case when jsonb_typeof(p_payload -> 'campaign') = 'object' then p_payload -> 'campaign' end,
    completeness = coalesce((p_payload ->> 'completeness')::int, 0),
    updated_at = now()
  where id = v_id and client_org_id = p_client_org;
  if not found then
    raise exception 'draft not editable' using errcode = '42501';
  end if;

  delete from request_items where request_id = v_id;
  delete from campaign_stages where request_id = v_id;

  with inserted as (
    insert into campaign_stages (request_id, position, city, venue_hint, date)
    select v_id, (s.ord - 1)::int, s.value ->> 'city', s.value ->> 'venue_hint', (s.value ->> 'date')::date
    from jsonb_array_elements(coalesce(p_payload -> 'stages', '[]')) with ordinality as s(value, ord)
    returning id, position
  )
  select array_agg(id order by position) into v_stage_ids from inserted;

  insert into request_items (request_id, stage_id, category_key, answers)
  select v_id,
         case when i.value ? 'stage_index' and i.value ->> 'stage_index' is not null
              then v_stage_ids[(i.value ->> 'stage_index')::int + 1] end,
         i.value ->> 'category',
         coalesce(i.value -> 'answers', '{}')
  from jsonb_array_elements(coalesce(p_payload -> 'items', '[]')) as i(value);

  return v_id;
end;
$$;
