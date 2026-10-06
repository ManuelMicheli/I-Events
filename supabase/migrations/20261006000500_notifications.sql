-- Notifications: one row per person for each thing that happened on their requests and proposals.
-- Rows are written by triggers in the same transaction as the change, so nothing is ever missed.
-- The web app shows them in the app; a scheduled job sends a periodic email digest of the pending ones.

alter table public.profiles add column email_notifications boolean not null default true;
grant update (email_notifications) on public.profiles to authenticated;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  email_status text not null default 'pending' check (email_status in ('pending', 'sending', 'sent', 'skipped', 'failed')),
  emailed_at timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_email_idx on public.notifications (created_at) where email_status in ('pending', 'sending');

alter table public.notifications enable row level security;
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Notifies every member of an organization except the person who caused the change.
create function public.notify_org(p_org uuid, p_kind text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, org_id, kind, title, body, link)
  select m.user_id, p_org, p_kind, p_title, p_body, p_link
  from memberships m
  where m.org_id = p_org and m.user_id is distinct from auth.uid();
$$;

create function public.notify_proposal_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r requests;
  v_client text;
  v_agency text;
  v_agency_link text := '/pro/richieste/' || new.id;
  v_client_link text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  select * into r from requests where id = new.request_id;
  select name into v_client from organizations where id = r.client_org_id;
  select name into v_agency from organizations where id = new.agency_org_id;
  v_client_link := '/client/richieste/' || r.id;

  if tg_op = 'INSERT' then
    perform notify_org(new.agency_org_id, 'request_received', format('Nuova richiesta da %s', v_client), r.title, v_agency_link);
    return new;
  end if;

  case new.status
    when 'submitted' then
      perform notify_org(r.client_org_id, 'proposal_submitted',
        case when new.version > 1 then format('%s ha aggiornato la proposta', v_agency) else format('Nuova proposta da %s', v_agency) end,
        r.title, v_client_link);
    when 'declined' then
      perform notify_org(r.client_org_id, 'proposal_declined', format('%s non parteciperà', v_agency), r.title, v_client_link);
    when 'withdrawn' then
      perform notify_org(r.client_org_id, 'proposal_withdrawn', format('%s ha ritirato la proposta', v_agency), r.title, v_client_link);
    when 'revision_requested' then
      perform notify_org(new.agency_org_id, 'revision_requested', format('%s chiede modifiche alla proposta', v_client), r.title, v_agency_link);
    when 'accepted' then
      perform notify_org(new.agency_org_id, 'proposal_accepted', format('%s ha scelto la tua proposta', v_client), r.title, v_agency_link);
    when 'rejected' then
      -- cancel_request closes the request before its proposals; accept_proposal leaves it open until after.
      if r.status = 'cancelled' then
        perform notify_org(new.agency_org_id, 'request_cancelled', format('%s ha annullato la richiesta', v_client), r.title, v_agency_link);
      else
        perform notify_org(new.agency_org_id, 'proposal_rejected', format('%s ha scelto un''altra proposta', v_client), r.title, v_agency_link);
      end if;
    else
      null;
  end case;
  return new;
end;
$$;

create trigger proposals_notify after insert or update of status on public.proposals
  for each row execute function public.notify_proposal_change();

create function public.notify_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p proposals;
  r requests;
  v_author text;
begin
  if new.internal then return new; end if;
  select * into p from proposals where id = new.proposal_id;
  select * into r from requests where id = p.request_id;
  select name into v_author from organizations where id = new.author_org_id;
  if new.author_org_id = p.agency_org_id then
    perform notify_org(r.client_org_id, 'message', format('Nuovo messaggio da %s', v_author), left(new.body, 280), '/client/richieste/' || r.id);
  else
    perform notify_org(p.agency_org_id, 'message', format('Nuovo messaggio da %s', v_author), left(new.body, 280), '/pro/richieste/' || p.id);
  end if;
  return new;
end;
$$;

create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_message();

-- Email digest, for the scheduled job only (service role). Claims pending rows so two runs never send
-- the same notification; rows stuck in 'sending' for 15 minutes are claimed again.
create function public.claim_notification_emails(p_limit int default 500)
returns table (id uuid, user_id uuid, email text, full_name text, locale text, title text, body text, link text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  -- Nothing to email if the person opted out or has already seen it in the app.
  update notifications n set email_status = 'skipped'
    from profiles pr
   where pr.id = n.user_id and n.email_status = 'pending' and (not pr.email_notifications or n.read_at is not null);

  return query
  with claimed as (
    update notifications n set email_status = 'sending', emailed_at = now()
     where n.id in (
       select c.id from notifications c
        where c.email_status = 'pending'
           or (c.email_status = 'sending' and c.emailed_at < now() - interval '15 minutes')
        order by c.created_at
        limit p_limit
        for update skip locked)
    returning n.*
  )
  select c.id, c.user_id, u.email::text, pr.full_name, pr.locale, c.title, c.body, c.link, c.created_at
    from claimed c
    join profiles pr on pr.id = c.user_id
    join auth.users u on u.id = c.user_id
   order by c.user_id, c.created_at;
end;
$$;

create function public.finish_notification_emails(p_ids uuid[], p_status text)
returns void language sql security definer set search_path = public as $$
  update notifications set email_status = p_status, emailed_at = now()
   where id = any(p_ids) and email_status = 'sending' and p_status in ('sent', 'failed', 'pending');
$$;

revoke execute on function public.notify_org, public.notify_proposal_change, public.notify_message,
  public.claim_notification_emails, public.finish_notification_emails from public, anon, authenticated;
grant execute on function public.claim_notification_emails, public.finish_notification_emails to service_role;
