-- Address book: the suppliers and people an organization works with (DJs, security firms, venues,
-- caterers...). Each organization has its own; nobody else can see it. Imports merge with what is
-- already there by email or phone, so importing the same file twice changes nothing.

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  company text check (length(company) <= 200),
  role_title text check (length(role_title) <= 120),
  -- Stored lowercase; phones in international format (+39...), so duplicates are easy to spot.
  email text check (email = lower(email) and email like '%_@_%'),
  phone text check (phone ~ '^\+[0-9]{6,15}$'),
  website text check (length(website) <= 300),
  city text check (length(city) <= 120),
  -- Service categories from the catalog (security, entertainment...), proposed on import and confirmed by people.
  services text[] not null default '{}',
  regions text[] not null default '{}',
  notes text check (length(notes) <= 5000),
  rating smallint check (rating between 1 and 5),
  source text not null default 'manual' check (source in ('manual', 'csv', 'excel', 'vcard', 'text', 'google', 'phone')),
  -- Set when the supplier claims its own I-Events account.
  supplier_org_id uuid references public.organizations (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index contacts_org_email_key on public.contacts (org_id, email) where email is not null;
create unique index contacts_org_phone_key on public.contacts (org_id, phone) where phone is not null;
create index contacts_org_name_idx on public.contacts (org_id, lower(name));
create index contacts_services_idx on public.contacts using gin (services);

alter table public.contacts enable row level security;
create policy contacts_select on public.contacts for select to authenticated using (public.is_member(org_id));
create policy contacts_insert on public.contacts for insert to authenticated
  with check (public.is_member(org_id) and created_by = auth.uid());
create policy contacts_update on public.contacts for update to authenticated
  using (public.is_member(org_id)) with check (public.is_member(org_id));
create policy contacts_delete on public.contacts for delete to authenticated
  using (public.is_member(org_id, array['owner', 'admin', 'manager']::public.member_role[]));

revoke all on public.contacts from anon, authenticated;
grant select, delete on public.contacts to authenticated;
grant insert (id, org_id, name, company, role_title, email, phone, website, city, services, regions, notes, rating, source, created_by)
  on public.contacts to authenticated;
grant update (name, company, role_title, email, phone, website, city, services, regions, notes, rating, updated_at)
  on public.contacts to authenticated;

-- Only known service categories are kept, whatever the client sends.
create function public.valid_services(p_services text[])
returns text[] language sql stable set search_path = public as $$
  select coalesce(array_agg(distinct s order by s), '{}')
  from unnest(coalesce(p_services, '{}')) s
  where s in (select key from service_categories);
$$;

create function public.contacts_before_write()
returns trigger language plpgsql set search_path = public as $$
begin
  new.services := valid_services(new.services);
  new.updated_at := now();
  return new;
end;
$$;
create trigger contacts_before_write before insert or update on public.contacts
  for each row execute function public.contacts_before_write();

-- Bulk import with deduplication. Rows: [{ name, company, role_title, email, phone, website, city, services, notes }],
-- already normalized by the app (packages/core/src/contacts). An existing contact with the same email or
-- phone is completed, never overwritten: empty fields are filled and services are added.
create function public.import_contacts(p_org uuid, p_rows jsonb, p_source text default 'csv')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
  v_email text;
  v_phone text;
  v_name text;
  v_existing uuid;
  v_created int := 0;
  v_merged int := 0;
  v_skipped int := 0;
begin
  if not is_member(p_org) then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 1000 then
    raise exception 'send at most 1000 rows per call' using errcode = '22023';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_email := nullif(lower(trim(v_row ->> 'email')), '');
    v_phone := nullif(trim(v_row ->> 'phone'), '');
    if v_email is not null and v_email not like '%_@_%' then v_email := null; end if;
    if v_phone is not null and v_phone !~ '^\+[0-9]{6,15}$' then v_phone := null; end if;
    v_name := left(coalesce(nullif(trim(v_row ->> 'name'), ''), nullif(trim(v_row ->> 'company'), ''), v_email, v_phone), 200);
    if v_name is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    select id into v_existing from contacts
     where org_id = p_org and ((v_email is not null and email = v_email) or (v_phone is not null and phone = v_phone))
     order by created_at limit 1;

    if v_existing is not null then
      update contacts c set
        company = coalesce(c.company, nullif(trim(v_row ->> 'company'), '')),
        role_title = coalesce(c.role_title, nullif(trim(v_row ->> 'role_title'), '')),
        -- Fill a missing email or phone only if no other contact already uses it.
        email = coalesce(c.email, case when not exists (select 1 from contacts o where o.org_id = p_org and o.email = v_email) then v_email end),
        phone = coalesce(c.phone, case when not exists (select 1 from contacts o where o.org_id = p_org and o.phone = v_phone) then v_phone end),
        website = coalesce(c.website, nullif(trim(v_row ->> 'website'), '')),
        city = coalesce(c.city, nullif(trim(v_row ->> 'city'), '')),
        notes = coalesce(c.notes, nullif(trim(v_row ->> 'notes'), '')),
        services = c.services || array(select jsonb_array_elements_text(coalesce(v_row -> 'services', '[]')))
      where c.id = v_existing;
      v_merged := v_merged + 1;
    else
      insert into contacts (org_id, name, company, role_title, email, phone, website, city, services, notes, source, created_by)
      values (
        p_org, v_name,
        left(nullif(trim(v_row ->> 'company'), ''), 200),
        left(nullif(trim(v_row ->> 'role_title'), ''), 120),
        v_email, v_phone,
        left(nullif(trim(v_row ->> 'website'), ''), 300),
        left(nullif(trim(v_row ->> 'city'), ''), 120),
        array(select jsonb_array_elements_text(coalesce(v_row -> 'services', '[]'))),
        left(nullif(trim(v_row ->> 'notes'), ''), 5000),
        p_source, auth.uid());
      v_created := v_created + 1;
    end if;
    v_existing := null;
  end loop;

  perform log_activity(p_org, 'contacts', null, 'imported',
    jsonb_build_object('created', v_created, 'merged', v_merged, 'skipped', v_skipped, 'source', p_source));
  return jsonb_build_object('created', v_created, 'merged', v_merged, 'skipped', v_skipped);
end;
$$;

revoke execute on function public.import_contacts, public.valid_services, public.contacts_before_write from public, anon;
grant execute on function public.import_contacts, public.valid_services to authenticated;
