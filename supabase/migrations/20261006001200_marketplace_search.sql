-- Marketplace search: companies find agencies and agencies find suppliers among the profiles listed
-- in the marketplace, by words, service and area. An agency adds a listed supplier to its address
-- book in one step, already linked to the supplier's account.

-- Public contact details a listed profile may show.
alter table public.marketplace_profiles
  add column email text check (email = lower(email) and email like '%_@_%'),
  add column phone text check (phone ~ '^\+[0-9]{6,15}$');
grant update (email, phone) on public.marketplace_profiles to authenticated;

alter table public.contacts drop constraint contacts_source_check;
alter table public.contacts add constraint contacts_source_check
  check (source in ('manual', 'csv', 'excel', 'vcard', 'text', 'google', 'phone', 'marketplace'));

-- Listed profiles of one type matching the filters. p_from_org (one of the caller's organizations)
-- adds whether each result is already connected (agencies) or in its address book (suppliers).
create function public.search_marketplace(
  p_type public.org_type, p_from_org uuid default null, p_query text default null, p_service text default null,
  p_area text default null, p_limit int default 50
)
returns table (
  org_id uuid, slug text, name text, city text, headline text, services text[], regions text[],
  connected boolean, contact_id uuid
)
language sql stable security definer set search_path = public as $$
  with me as (select p_from_org as id where p_from_org is not null and is_member(p_from_org)),
  q as (select nullif(lower(trim(p_query)), '') as term, nullif(lower(trim(p_area)), '') as area)
  select o.id, o.slug, o.name, o.city, p.headline, p.services, p.regions,
         exists (select 1 from me where is_connected(me.id, o.id)),
         (select c.id from contacts c, me where c.org_id = me.id and c.supplier_org_id = o.id limit 1)
    from marketplace_profiles p
    join organizations o on o.id = p.org_id
    cross join q
   where p.is_listed and o.type = p_type and p_type <> 'client'
     and (q.term is null or strpos(lower(concat_ws(' ', o.name, o.city, p.headline, p.description, array_to_string(p.regions, ' '))), q.term) > 0)
     and (nullif(p_service, '') is null or p_service = any (p.services))
     and (q.area is null or strpos(lower(coalesce(o.city, '')), q.area) > 0
          or exists (select 1 from unnest(p.regions) r where strpos(lower(r), q.area) > 0 or strpos(q.area, lower(r)) > 0))
   order by (p.headline <> '' and p.description <> '') desc, o.name
   limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

-- One listed profile (or one of your own) with a few facts that help to choose.
create function public.marketplace_profile(p_slug text)
returns table (
  org_id uuid, type public.org_type, name text, city text, headline text, description text, services text[],
  regions text[], website text, email text, phone text, member_since timestamptz, events_done bigint
)
language sql stable security definer set search_path = public as $$
  select o.id, o.type, o.name, o.city, p.headline, p.description, p.services, p.regions, p.website, p.email, p.phone,
         o.created_at,
         case o.type
           when 'agency' then (select count(*) from events e where e.agency_org_id = o.id and e.status = 'completed')
           else (select count(distinct b.event_id) from event_bookings b join contacts c on c.id = b.contact_id join events e on e.id = b.event_id
                  where c.supplier_org_id = o.id and b.status = 'confirmed' and e.status = 'completed')
         end
    from organizations o
    join marketplace_profiles p on p.org_id = o.id
   where o.slug = p_slug and o.type <> 'client' and (p.is_listed or is_member(o.id));
$$;

-- Agency: adds a listed supplier to its address book, linked to the supplier's account. An existing
-- contact with the same email or phone is linked instead of duplicated. Returns the contact.
create function public.add_marketplace_supplier(p_agency uuid, p_supplier uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_contact uuid;
  o organizations;
  p marketplace_profiles;
  v_agency text;
begin
  if not is_member(p_agency) or (select type from organizations where id = p_agency) <> 'agency' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into o from organizations where id = p_supplier and type = 'supplier';
  select * into p from marketplace_profiles where org_id = p_supplier and is_listed;
  if o.id is null or p.org_id is null then raise exception 'supplier not listed' using errcode = 'P0002'; end if;

  select id into v_contact from contacts where org_id = p_agency and supplier_org_id = p_supplier limit 1;
  if v_contact is not null then return v_contact; end if;
  select id into v_contact from contacts
   where org_id = p_agency and supplier_org_id is null
     and ((p.email is not null and email = p.email) or (p.phone is not null and phone = p.phone))
   limit 1;
  if v_contact is not null then
    update contacts set supplier_org_id = p_supplier, updated_at = now() where id = v_contact;
  else
    insert into contacts (org_id, name, company, email, phone, website, city, services, regions, source, supplier_org_id, created_by)
    values (p_agency, o.name, o.name, p.email, p.phone, p.website, o.city,
            array(select s from unnest(p.services) s where exists (select 1 from service_categories c where c.key = s)),
            p.regions, 'marketplace', p_supplier, auth.uid())
    returning id into v_contact;
  end if;
  select name into v_agency from organizations where id = p_agency;
  perform notify_org(p_supplier, 'supplier_added', format('%s ti ha aggiunto ai suoi fornitori', v_agency),
    'Le sue richieste arriveranno qui.', '/supplier/richieste');
  perform log_activity(p_agency, 'contact', v_contact, 'added_from_marketplace');
  return v_contact;
end;
$$;

revoke execute on function public.search_marketplace, public.marketplace_profile, public.add_marketplace_supplier from public, anon;
grant execute on function public.search_marketplace, public.marketplace_profile, public.add_marketplace_supplier to authenticated;
