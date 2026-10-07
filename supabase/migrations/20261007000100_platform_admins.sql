-- Developer accounts: the I-Events team sees every organization and can do everything a member can, to test the
-- product and help customers. Who has one is decided only in the database: no API role can read or change the list.

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text check (length(note) <= 200),
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

create function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

-- Every access rule asks these two: a developer account counts as owner of every organization.
create or replace function public.is_member(target uuid, roles public.member_role[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = target and m.user_id = auth.uid()
      and (roles is null or m.role = any (roles))
  ) or (target is not null and public.is_platform_admin());
$$;

create or replace function public.my_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select org_id from public.memberships where user_id = auth.uid()
  union
  select id from public.organizations where public.is_platform_admin();
$$;

-- The organizations the apps let the user work in: their own first, then, for a developer account, all the others.
create function public.my_organizations()
returns table (id uuid, name text, slug text, type public.org_type, role public.member_role)
language sql stable security definer set search_path = public as $$
  select id, name, slug, type, role from (
    select o.id, o.name, o.slug, o.type, m.role, 0 as rank, m.created_at as since
      from public.memberships m join public.organizations o on o.id = m.org_id
     where m.user_id = auth.uid()
    union all
    select o.id, o.name, o.slug, o.type, 'owner'::public.member_role, 1, null
      from public.organizations o
     where public.is_platform_admin()
       and not exists (select 1 from public.memberships m where m.org_id = o.id and m.user_id = auth.uid())
  ) orgs
  order by rank, since, lower(name);
$$;
revoke execute on function public.my_organizations from public, anon;
grant execute on function public.my_organizations to authenticated;
