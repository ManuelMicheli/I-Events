-- The marketplace shows each agency's and supplier's logo, in the results and on the profile.

drop function public.search_marketplace(public.org_type, uuid, text, text, text, int, date);
create function public.search_marketplace(
  p_type public.org_type, p_from_org uuid default null, p_query text default null, p_service text default null,
  p_area text default null, p_limit int default 50, p_date date default null
)
returns table (
  org_id uuid, slug text, name text, city text, headline text, services text[], regions text[],
  connected boolean, contact_id uuid, rating_avg numeric, rating_count int, logo_url text
)
language sql stable security definer set search_path = public as $$
  with me as (select p_from_org as id where p_from_org is not null and is_member(p_from_org)),
  q as (select nullif(lower(trim(p_query)), '') as term, nullif(lower(trim(p_area)), '') as area)
  select o.id, o.slug, o.name, o.city, p.headline, p.services, p.regions,
         exists (select 1 from me where is_connected(me.id, o.id)),
         (select c.id from contacts c, me where c.org_id = me.id and c.supplier_org_id = o.id limit 1),
         rt.rating_avg, rt.rating_count, o.logo_url
    from marketplace_profiles p
    join organizations o on o.id = p.org_id
    cross join q
    cross join lateral (
      select round(avg(r.rating)::numeric, 1) as rating_avg, count(r.id)::int as rating_count from reviews r where r.subject_org_id = o.id
    ) rt
   where p.is_listed and o.type = p_type and p_type <> 'client'
     and (q.term is null or strpos(lower(concat_ws(' ', o.name, o.city, p.headline, p.description, array_to_string(p.regions, ' '))), q.term) > 0)
     and (nullif(p_service, '') is null or p_service = any (p.services))
     and (q.area is null or strpos(lower(coalesce(o.city, '')), q.area) > 0
          or exists (select 1 from unnest(p.regions) r where strpos(lower(r), q.area) > 0 or strpos(q.area, lower(r)) > 0))
     and (p_date is null or o.type <> 'supplier' or not exists (select 1 from supplier_busy(o.id, p_date, p_date)))
   order by (p.headline <> '' and p.description <> '') desc, rt.rating_count > 0 desc, rt.rating_avg desc nulls last, o.name
   limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

drop function public.marketplace_profile(text);
create function public.marketplace_profile(p_slug text)
returns table (
  org_id uuid, type public.org_type, name text, city text, headline text, description text, services text[],
  regions text[], website text, email text, phone text, member_since timestamptz, events_done bigint,
  rating_avg numeric, rating_count int, logo_url text
)
language sql stable security definer set search_path = public as $$
  select o.id, o.type, o.name, o.city, p.headline, p.description, p.services, p.regions, p.website, p.email, p.phone,
         o.created_at,
         case o.type
           when 'agency' then (select count(*) from events e where e.agency_org_id = o.id and e.status = 'completed')
           else (select count(distinct b.event_id) from event_bookings b join contacts c on c.id = b.contact_id join events e on e.id = b.event_id
                  where c.supplier_org_id = o.id and b.status = 'confirmed' and e.status = 'completed')
         end,
         (select round(avg(r.rating)::numeric, 1) from reviews r where r.subject_org_id = o.id),
         (select count(*)::int from reviews r where r.subject_org_id = o.id),
         o.logo_url
    from organizations o
    join marketplace_profiles p on p.org_id = o.id
   where o.slug = p_slug and o.type <> 'client' and (p.is_listed or is_member(o.id));
$$;

revoke execute on function public.search_marketplace, public.marketplace_profile from public, anon;
grant execute on function public.search_marketplace, public.marketplace_profile to authenticated;
