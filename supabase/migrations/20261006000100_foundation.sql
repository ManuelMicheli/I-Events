-- I-Events foundation: organizations, members, invitations, agency-client connections,
-- subscriptions and the marketplace profile. Every table is protected by row level security.

create extension if not exists pgcrypto with schema extensions;

create type public.org_type as enum ('agency', 'client', 'supplier');
create type public.member_role as enum ('owner', 'admin', 'manager', 'member', 'approver');
create type public.plan_id as enum ('trial', 'starter', 'pro', 'enterprise');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');
create type public.connection_status as enum ('pending', 'active', 'revoked');

-- Profiles mirror auth.users with what other members may see.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  locale text not null default 'it' check (locale in ('it', 'en')),
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  type public.org_type not null,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url text,
  vat_number text,
  city text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- References profiles (which cascades from auth.users) so the API can embed member names.
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

-- Invitation of a person into an organization.
create table public.member_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(email)),
  role public.member_role not null check (role <> 'owner'),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index member_invitations_open_idx on public.member_invitations (org_id, email) where accepted_at is null;

-- Link between an agency and a client that already know each other.
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  agency_org_id uuid references public.organizations (id) on delete cascade,
  client_org_id uuid references public.organizations (id) on delete cascade,
  initiated_by_org uuid not null references public.organizations (id) on delete cascade,
  invite_email text check (invite_email = lower(invite_email)),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  status public.connection_status not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check ((agency_org_id is not null and client_org_id is not null) or invite_email is not null),
  check (initiated_by_org = agency_org_id or initiated_by_org = client_org_id)
);
create unique index connections_pair_idx on public.connections (agency_org_id, client_org_id)
  where agency_org_id is not null and client_org_id is not null and status <> 'revoked';

create table public.subscriptions (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  plan public.plan_id not null default 'trial',
  status public.subscription_status not null default 'trialing',
  current_period_end timestamptz not null default now() + interval '30 days',
  provider_customer_id text,
  provider_subscription_id text,
  updated_at timestamptz not null default now()
);

-- Public marketplace card of an agency or supplier.
create table public.marketplace_profiles (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  headline text not null default '',
  description text not null default '',
  services text[] not null default '{}',
  regions text[] not null default '{}',
  website text,
  is_listed boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.activity_log (
  id bigint generated always as identity primary key,
  org_id uuid references public.organizations (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  entity text not null,
  entity_id uuid,
  action text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activity_log_entity_idx on public.activity_log (entity, entity_id);

-- ---------------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so policies can ask about membership without recursion.
-- ---------------------------------------------------------------------------

create function public.is_member(target uuid, roles public.member_role[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = target and m.user_id = auth.uid()
      and (roles is null or m.role = any (roles))
  );
$$;

create function public.my_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select org_id from public.memberships where user_id = auth.uid();
$$;

create function public.is_connected(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.connections c
    where c.status = 'active'
      and ((c.agency_org_id = a and c.client_org_id = b) or (c.agency_org_id = b and c.client_org_id = a))
  );
$$;

create function public.log_activity(p_org uuid, p_entity text, p_entity_id uuid, p_action text, p_data jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.activity_log (org_id, actor_id, entity, entity_id, action, data)
  values (p_org, auth.uid(), p_entity, p_entity_id, p_action, coalesce(p_data, '{}'));
$$;
revoke execute on function public.log_activity from public, anon, authenticated;

-- New auth user -> profile.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Creates an organization, makes the caller its owner and starts the trial.
create function public.create_organization(p_type public.org_type, p_name text, p_slug text, p_city text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_slug text := p_slug;
  v_try int := 0;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  while exists (select 1 from organizations where slug = v_slug) loop
    v_try := v_try + 1;
    v_slug := p_slug || '-' || v_try;
  end loop;
  insert into organizations (type, name, slug, city, created_by)
  values (p_type, trim(p_name), v_slug, nullif(trim(p_city), ''), auth.uid())
  returning id into v_org;
  insert into memberships (org_id, user_id, role) values (v_org, auth.uid(), 'owner');
  insert into subscriptions (org_id) values (v_org);
  if p_type in ('agency', 'supplier') then
    insert into marketplace_profiles (org_id) values (v_org);
  end if;
  perform log_activity(v_org, 'organization', v_org, 'created');
  return v_org;
end;
$$;

-- Invite a person to the caller's organization (owner/admin only).
create function public.invite_member(p_org uuid, p_email text, p_role public.member_role)
returns text language plpgsql security definer set search_path = public as $$
declare v_token text;
begin
  if not is_member(p_org, array['owner', 'admin']::member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role = 'approver' and (select type from organizations where id = p_org) <> 'client' then
    raise exception 'approver role is for clients only' using errcode = '22023';
  end if;
  delete from member_invitations where org_id = p_org and email = lower(p_email) and accepted_at is null;
  insert into member_invitations (org_id, email, role, invited_by)
  values (p_org, lower(trim(p_email)), p_role, auth.uid())
  returning token into v_token;
  perform log_activity(p_org, 'member_invitation', null, 'created', jsonb_build_object('email', lower(p_email), 'role', p_role));
  return v_token;
end;
$$;

create function public.accept_member_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv member_invitations;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into inv from member_invitations where token = p_token for update;
  if inv.id is null or inv.accepted_at is not null or inv.expires_at < now() then
    raise exception 'invitation not valid' using errcode = 'P0002';
  end if;
  if inv.email <> lower((select email from auth.users where id = auth.uid())) then
    raise exception 'invitation is for another email' using errcode = '42501';
  end if;
  insert into memberships (org_id, user_id, role) values (inv.org_id, auth.uid(), inv.role)
  on conflict (org_id, user_id) do nothing;
  update member_invitations set accepted_at = now() where id = inv.id;
  perform log_activity(inv.org_id, 'membership', null, 'joined');
  return inv.org_id;
end;
$$;

-- Agency invites a client (or client invites an agency) it already works with.
-- p_target_org: an existing organization; otherwise p_email receives the link.
create function public.invite_connection(p_from_org uuid, p_target_org uuid default null, p_email text default null, p_message text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_from org_type;
  v_target org_type;
  v_token text;
begin
  if not is_member(p_from_org, array['owner', 'admin']::member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select type into v_from from organizations where id = p_from_org;
  if v_from = 'supplier' then raise exception 'suppliers cannot open client connections' using errcode = '22023'; end if;
  if p_target_org is not null then
    select type into v_target from organizations where id = p_target_org;
    if v_target is null or v_target = v_from or v_target = 'supplier' then
      raise exception 'connection must be between an agency and a client' using errcode = '22023';
    end if;
  elsif p_email is null then
    raise exception 'target organization or email required' using errcode = '22023';
  end if;
  insert into connections (agency_org_id, client_org_id, initiated_by_org, invite_email, message)
  values (
    case when v_from = 'agency' then p_from_org else p_target_org end,
    case when v_from = 'client' then p_from_org else p_target_org end,
    p_from_org, lower(p_email), p_message
  )
  returning token into v_token;
  perform log_activity(p_from_org, 'connection', null, 'invited', jsonb_build_object('email', lower(p_email), 'target', p_target_org));
  return v_token;
end;
$$;

-- The other side accepts with one of its organizations.
create function public.accept_connection(p_token text, p_org uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  c connections;
  v_org_type org_type;
  v_from_type org_type;
begin
  if not is_member(p_org, array['owner', 'admin']::member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into c from connections where token = p_token for update;
  if c.id is null or c.status <> 'pending' then raise exception 'invitation not valid' using errcode = 'P0002'; end if;
  if p_org = c.initiated_by_org then raise exception 'cannot accept own invitation' using errcode = '22023'; end if;
  select type into v_org_type from organizations where id = p_org;
  select type into v_from_type from organizations where id = c.initiated_by_org;
  if v_org_type = v_from_type or v_org_type = 'supplier' then
    raise exception 'connection must be between an agency and a client' using errcode = '22023';
  end if;
  if v_from_type = 'agency' then
    if c.client_org_id is not null and c.client_org_id <> p_org then raise exception 'invitation is for another organization' using errcode = '42501'; end if;
    update connections set client_org_id = p_org, status = 'active', accepted_at = now() where id = c.id;
  else
    if c.agency_org_id is not null and c.agency_org_id <> p_org then raise exception 'invitation is for another organization' using errcode = '42501'; end if;
    update connections set agency_org_id = p_org, status = 'active', accepted_at = now() where id = c.id;
  end if;
  perform log_activity(p_org, 'connection', c.id, 'accepted');
  return c.id;
end;
$$;

-- What an invitation link shows before it is accepted (the invitee cannot read the invitation row).
create function public.preview_invitation(p_token text)
returns table (kind text, org_name text, org_type public.org_type, role public.member_role, valid boolean)
language sql stable security definer set search_path = public as $$
  select 'member', o.name, o.type, i.role, (i.accepted_at is null and i.expires_at > now())
    from member_invitations i join organizations o on o.id = i.org_id
   where i.token = p_token
  union all
  select 'connection', o.name, o.type, null, c.status = 'pending'
    from connections c join organizations o on o.id = c.initiated_by_org
   where c.token = p_token;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.member_invitations enable row level security;
alter table public.connections enable row level security;
alter table public.subscriptions enable row level security;
alter table public.marketplace_profiles enable row level security;
alter table public.activity_log enable row level security;

-- Profiles: yourself and people who share an organization with you.
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from public.memberships m where m.user_id = profiles.id and m.org_id in (select public.my_org_ids())
  )
);
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Organizations: your own, connected ones, and listed marketplace profiles.
create policy organizations_select on public.organizations for select to authenticated using (
  public.is_member(id)
  or exists (select 1 from public.my_org_ids() o where public.is_connected(o, organizations.id))
  or exists (select 1 from public.marketplace_profiles p where p.org_id = organizations.id and p.is_listed)
);
create policy organizations_update on public.organizations for update to authenticated
  using (public.is_member(id, array['owner', 'admin']::public.member_role[]))
  with check (public.is_member(id, array['owner', 'admin']::public.member_role[]));

create policy memberships_select on public.memberships for select to authenticated using (public.is_member(org_id));
create policy memberships_delete on public.memberships for delete to authenticated using (
  (public.is_member(org_id, array['owner', 'admin']::public.member_role[]) and role <> 'owner') or (user_id = auth.uid() and role <> 'owner')
);

create policy member_invitations_select on public.member_invitations for select to authenticated using (
  public.is_member(org_id, array['owner', 'admin']::public.member_role[])
);
create policy member_invitations_delete on public.member_invitations for delete to authenticated using (
  public.is_member(org_id, array['owner', 'admin']::public.member_role[])
);

create policy connections_select on public.connections for select to authenticated using (
  public.is_member(agency_org_id) or public.is_member(client_org_id) or public.is_member(initiated_by_org)
);
create policy connections_revoke on public.connections for update to authenticated
  using (public.is_member(agency_org_id, array['owner', 'admin']::public.member_role[]) or public.is_member(client_org_id, array['owner', 'admin']::public.member_role[]))
  with check (status = 'revoked');

create policy subscriptions_select on public.subscriptions for select to authenticated using (public.is_member(org_id));

create policy marketplace_select on public.marketplace_profiles for select to anon, authenticated using (is_listed or public.is_member(org_id));
create policy marketplace_update on public.marketplace_profiles for update to authenticated
  using (public.is_member(org_id, array['owner', 'admin']::public.member_role[]))
  with check (public.is_member(org_id, array['owner', 'admin']::public.member_role[]));

create policy activity_select on public.activity_log for select to authenticated using (public.is_member(org_id));

-- Supabase grants everything to anon/authenticated by default; start from nothing and grant precisely.
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from anon;
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.organizations, public.marketplace_profiles, public.connections to authenticated;
grant update (full_name, avatar_url, locale) on public.profiles to authenticated;
grant update (name, logo_url, vat_number, city) on public.organizations to authenticated;
grant update (headline, description, services, regions, website, is_listed) on public.marketplace_profiles to authenticated;
grant update (status) on public.connections to authenticated;
grant select, delete on public.memberships, public.member_invitations to authenticated;
grant select on public.subscriptions, public.activity_log to authenticated;
grant select on public.marketplace_profiles to anon;
