-- Saving a request draft from the wizard in one transaction, and cancelling a sent request.

-- SECURITY INVOKER: row level security still decides what the caller may write.
-- p_payload = {
--   kind, title, objective, start_date, end_date, guests, budget_min, budget_max, is_public,
--   audience, city, free_text, campaign, completeness,
--   stages: [{ city, venue_hint, date }],
--   items:  [{ category, stage_index, answers }]
-- }
create function public.save_request_draft(p_client_org uuid, p_payload jsonb, p_request uuid default null)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := p_request;
  v_stage_ids uuid[];
begin
  if v_id is null then
    insert into requests (client_org_id, created_by, kind, title, objective, campaign)
    values (p_client_org, auth.uid(), (p_payload ->> 'kind')::request_kind, p_payload ->> 'title', p_payload ->> 'objective',
            case when jsonb_typeof(p_payload -> 'campaign') = 'object' then p_payload -> 'campaign' end)
    returning id into v_id;
  end if;

  update requests set
    kind = (p_payload ->> 'kind')::request_kind,
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

-- Client withdraws a sent request: open proposals are closed as rejected.
create function public.cancel_request(p_request uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r requests;
begin
  select * into r from requests where id = p_request for update;
  if r.id is null then raise exception 'request not found' using errcode = 'P0002'; end if;
  if not is_member(r.client_org_id, array['owner', 'admin', 'manager']::member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if r.status <> 'sent' then raise exception 'only sent requests can be cancelled' using errcode = '22023'; end if;
  update requests set status = 'cancelled', updated_at = now() where id = r.id;
  update proposals set status = 'rejected', decided_at = now(), updated_at = now()
   where request_id = r.id
     and status in ('invited', 'reviewing', 'clarification', 'submitted', 'revision_requested', 'withdrawn');
  perform log_activity(r.client_org_id, 'request', r.id, 'cancelled');
end;
$$;

revoke execute on function public.save_request_draft, public.cancel_request from public, anon;
grant execute on function public.save_request_draft, public.cancel_request to authenticated;

-- Messages show their author's name (visible to colleagues) next to the organization name.
alter table public.messages drop constraint messages_author_id_fkey;
alter table public.messages add constraint messages_author_id_fkey
  foreign key (author_id) references public.profiles (id) on delete set null;
