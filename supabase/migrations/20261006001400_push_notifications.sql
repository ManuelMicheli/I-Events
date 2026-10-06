-- Push notifications for the mobile app. Each phone registers its Expo push token for the signed-in person;
-- the notifications written by the existing triggers are queued for push exactly like the email digest,
-- and a scheduled job (service role) claims them, sends them through Expo and settles them.

create table public.push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[[^\]]+\]$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id, last_seen_at desc);

alter table public.push_tokens enable row level security;
create policy push_tokens_select on public.push_tokens for select to authenticated using (user_id = auth.uid());
revoke all on public.push_tokens from anon, authenticated;
grant select on public.push_tokens to authenticated;

-- Pushes only for what happens from now on: the notifications already there are not sent to phones.
alter table public.notifications
  add column push_status text not null default 'skipped' check (push_status in ('pending', 'sending', 'sent', 'skipped', 'failed')),
  add column pushed_at timestamptz;
alter table public.notifications alter column push_status set default 'pending';
create index notifications_push_idx on public.notifications (created_at) where push_status in ('pending', 'sending');

-- A phone belongs to whoever signed in on it last: the token moves to them. Ten phones per person at most.
create function public.register_push_token(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  insert into push_tokens (token, user_id, platform) values (p_token, auth.uid(), p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now();
  delete from push_tokens
   where user_id = auth.uid()
     and token not in (select t.token from push_tokens t where t.user_id = auth.uid() order by t.last_seen_at desc limit 10);
end;
$$;

-- Called on sign out, so the phone stops receiving that person's notifications.
create function public.unregister_push_token(p_token text)
returns void language sql security definer set search_path = public as $$
  delete from push_tokens where token = p_token and user_id = auth.uid();
$$;

-- For the scheduled job only. Claims pending rows so two runs never push the same notification; rows stuck
-- in 'sending' for 5 minutes are claimed again. Returns every phone of the person and their unread count.
create function public.claim_notification_pushes(p_limit int default 500)
returns table (id uuid, user_id uuid, org_id uuid, kind text, title text, body text, link text, tokens text[], unread int)
language plpgsql security definer set search_path = public as $$
begin
  -- Nothing to push if it was already seen, nobody has a phone registered, or it is too old to be news.
  update notifications n set push_status = 'skipped'
   where n.push_status = 'pending'
     and (n.read_at is not null
       or n.created_at < now() - interval '1 hour'
       or not exists (select 1 from push_tokens t where t.user_id = n.user_id));

  return query
  with claimed as (
    update notifications n set push_status = 'sending', pushed_at = now()
     where n.id in (
       select c.id from notifications c
        where c.push_status = 'pending'
           or (c.push_status = 'sending' and c.pushed_at < now() - interval '5 minutes')
        order by c.created_at
        limit p_limit
        for update skip locked)
    returning n.*
  )
  select c.id, c.user_id, c.org_id, c.kind, c.title, c.body, c.link,
         array(select t.token from push_tokens t where t.user_id = c.user_id order by t.last_seen_at desc),
         (select count(*)::int from notifications u where u.user_id = c.user_id and u.read_at is null)
    from claimed c
   order by c.created_at;
end;
$$;

create function public.finish_notification_pushes(p_ids uuid[], p_status text)
returns void language sql security definer set search_path = public as $$
  update notifications set push_status = p_status, pushed_at = now()
   where id = any(p_ids) and push_status = 'sending' and p_status in ('sent', 'failed', 'pending');
$$;

-- Expo reports uninstalled apps as DeviceNotRegistered: their tokens are dropped.
create function public.remove_push_tokens(p_tokens text[])
returns void language sql security definer set search_path = public as $$
  delete from push_tokens where token = any(p_tokens);
$$;

revoke execute on function public.register_push_token, public.unregister_push_token, public.claim_notification_pushes,
  public.finish_notification_pushes, public.remove_push_tokens from public, anon, authenticated;
grant execute on function public.register_push_token, public.unregister_push_token to authenticated;
grant execute on function public.claim_notification_pushes, public.finish_notification_pushes, public.remove_push_tokens to service_role;
