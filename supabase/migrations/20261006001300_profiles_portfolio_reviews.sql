-- Profiles that help to choose: a portfolio of past work with photos, reviews left at the end of an
-- event (the client reviews the agency, the agency reviews its suppliers on I-Events), and the days a
-- supplier is busy, so agencies don't ask for a date that is already taken.

-- ---------------------------------------------------------------------------
-- Portfolio
-- ---------------------------------------------------------------------------

create function public.can_edit_portfolio(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_member(p_org, array['owner', 'admin']::member_role[])
     and exists (select 1 from organizations where id = p_org and type <> 'client');
$$;

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  description text not null default '' check (length(description) <= 2000),
  client_name text check (length(client_name) <= 120),
  city text check (length(city) <= 120),
  -- First day of the month the work happened.
  happened_on date check (extract(day from happened_on) = 1),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index portfolio_items_org_idx on public.portfolio_items (org_id, happened_on desc nulls last);

create table public.portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.portfolio_items (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  storage_path text not null unique,
  position int not null default 0,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- The path starts with the row's own ids, so a row can never point at another organization's files.
  check (storage_path ~ ('^' || org_id::text || '/' || item_id::text || '/' || id::text || '\.(jpg|png|webp)$'))
);
create index portfolio_photos_item_idx on public.portfolio_photos (item_id, position, created_at);

-- Organization copied from the item; limits keep a portfolio a selection, not an archive.
create function public.check_portfolio_limits()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'portfolio_items' then
    if (select count(*) from portfolio_items where org_id = new.org_id) >= 30 then
      raise exception 'portfolio full' using errcode = '23514', hint = 'Al massimo 30 lavori nel portfolio.';
    end if;
  else
    select org_id into new.org_id from portfolio_items where id = new.item_id;
    if (select count(*) from portfolio_photos where item_id = new.item_id) >= 12 then
      raise exception 'too many photos' using errcode = '23514', hint = 'Al massimo 12 foto per lavoro.';
    end if;
  end if;
  return new;
end;
$$;
create trigger portfolio_items_limits before insert on public.portfolio_items
  for each row execute function public.check_portfolio_limits();
create trigger portfolio_photos_limits before insert on public.portfolio_photos
  for each row execute function public.check_portfolio_limits();

alter table public.portfolio_items enable row level security;
alter table public.portfolio_photos enable row level security;

create function public.is_listed(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from marketplace_profiles where org_id = p_org and is_listed);
$$;

create policy portfolio_items_select on public.portfolio_items for select to authenticated
  using (public.is_member(org_id) or public.is_listed(org_id));
create policy portfolio_items_insert on public.portfolio_items for insert to authenticated
  with check (public.can_edit_portfolio(org_id));
create policy portfolio_items_update on public.portfolio_items for update to authenticated
  using (public.can_edit_portfolio(org_id)) with check (public.can_edit_portfolio(org_id));
create policy portfolio_items_delete on public.portfolio_items for delete to authenticated
  using (public.can_edit_portfolio(org_id));

create policy portfolio_photos_select on public.portfolio_photos for select to authenticated
  using (public.is_member(org_id) or public.is_listed(org_id));
create policy portfolio_photos_insert on public.portfolio_photos for insert to authenticated
  with check (created_by = auth.uid() and public.can_edit_portfolio((select i.org_id from public.portfolio_items i where i.id = item_id)));
create policy portfolio_photos_update on public.portfolio_photos for update to authenticated
  using (public.can_edit_portfolio(org_id)) with check (public.can_edit_portfolio(org_id));
create policy portfolio_photos_delete on public.portfolio_photos for delete to authenticated
  using (public.can_edit_portfolio(org_id));

revoke all on public.portfolio_items, public.portfolio_photos from anon, authenticated;
grant select, delete on public.portfolio_items, public.portfolio_photos to authenticated;
grant insert (id, org_id, title, description, client_name, city, happened_on) on public.portfolio_items to authenticated;
grant update (title, description, client_name, city, happened_on) on public.portfolio_items to authenticated;
grant insert (id, item_id, org_id, storage_path, position) on public.portfolio_photos to authenticated;
grant update (position) on public.portfolio_photos to authenticated;

-- Photos are meant to be seen: a public bucket, written only at the path of an existing row.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy portfolio_objects_select on storage.objects for select to authenticated using (bucket_id = 'portfolio');
create policy portfolio_objects_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'portfolio'
  and exists (
    select 1 from public.portfolio_photos p
    where p.storage_path = objects.name and p.created_by = auth.uid() and public.can_edit_portfolio(p.org_id)
  )
);
create policy portfolio_objects_delete on storage.objects for delete to authenticated using (
  bucket_id = 'portfolio'
  and exists (select 1 from public.portfolio_photos p where p.storage_path = objects.name and public.can_edit_portfolio(p.org_id))
);

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  booking_id uuid references public.event_bookings (id) on delete set null,
  author_org_id uuid not null references public.organizations (id) on delete cascade,
  subject_org_id uuid not null references public.organizations (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (length(comment) <= 2000),
  reply text check (length(trim(reply)) between 1 and 2000),
  replied_at timestamptz,
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, author_org_id, subject_org_id),
  check (author_org_id <> subject_org_id)
);
create index reviews_subject_idx on public.reviews (subject_org_id, created_at desc);

alter table public.reviews enable row level security;
create policy reviews_select on public.reviews for select to authenticated
  using (public.is_member(author_org_id) or public.is_member(subject_org_id));
revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to authenticated;

-- Who the caller's organization may review for this event, as (subject, booking): the client its
-- agency, the agency each supplier on I-Events it confirmed. Only once the event is completed.
create function public.reviewable_for(p_event uuid, p_author uuid)
returns table (subject_org_id uuid, booking_id uuid)
language sql stable security definer set search_path = public as $$
  select e.agency_org_id, null::uuid
    from events e
   where e.id = p_event and e.status = 'completed' and e.client_org_id = p_author
     and is_member(p_author, array['owner', 'admin', 'manager', 'approver']::member_role[])
  union all
  select distinct on (c.supplier_org_id) c.supplier_org_id, b.id
    from events e
    join event_bookings b on b.event_id = e.id and b.status = 'confirmed'
    join contacts c on c.id = b.contact_id and c.supplier_org_id is not null
   where e.id = p_event and e.status = 'completed' and e.agency_org_id = p_author
     and is_member(p_author, array['owner', 'admin', 'manager']::member_role[]);
$$;

-- Leaves or updates the review of one organization for this event. Returns the review.
create function public.leave_review(p_event uuid, p_author uuid, p_subject uuid, p_rating int, p_comment text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_booking uuid;
  v_id uuid;
  v_new boolean;
  v_author text;
  v_type org_type;
begin
  select r.booking_id into v_booking from reviewable_for(p_event, p_author) r where r.subject_org_id = p_subject;
  if not found then raise exception 'not reviewable' using errcode = '42501'; end if;
  insert into reviews (event_id, booking_id, author_org_id, subject_org_id, rating, comment, author_id)
  values (p_event, v_booking, p_author, p_subject, p_rating, coalesce(trim(p_comment), ''), auth.uid())
  on conflict (event_id, author_org_id, subject_org_id) do update
    set rating = excluded.rating, comment = excluded.comment, author_id = excluded.author_id, updated_at = now()
  returning id, (xmax = 0) into v_id, v_new;
  if v_new then
    select name into v_author from organizations where id = p_author;
    select type into v_type from organizations where id = p_subject;
    perform notify_org(p_subject, 'review_received', format('%s ti ha lasciato una recensione', v_author),
      repeat('★', p_rating) || repeat('☆', 5 - p_rating),
      case v_type when 'agency' then '/pro/profilo#recensioni' else '/supplier#recensioni' end);
  end if;
  perform log_activity(p_author, 'review', v_id, case when v_new then 'created' else 'updated' end);
  return v_id;
end;
$$;

-- The reviewed organization answers a review once; it can change the answer later.
create function public.reply_to_review(p_review uuid, p_reply text)
returns void language plpgsql security definer set search_path = public as $$
declare
  r reviews;
  v_subject text;
  v_type org_type;
begin
  select * into r from reviews where id = p_review;
  if r.id is null or not is_member(r.subject_org_id, array['owner', 'admin']::member_role[]) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update reviews set reply = nullif(trim(p_reply), ''), replied_at = case when nullif(trim(p_reply), '') is null then null else now() end
   where id = p_review;
  if r.reply is null and nullif(trim(p_reply), '') is not null then
    select name into v_subject from organizations where id = r.subject_org_id;
    select type into v_type from organizations where id = r.author_org_id;
    perform notify_org(r.author_org_id, 'review_reply', format('%s ha risposto alla tua recensione', v_subject), left(trim(p_reply), 140),
      case v_type when 'client' then '/client/eventi/' || r.event_id else '/pro/eventi/' || r.event_id end);
  end if;
end;
$$;

-- Average and count, for listed profiles and for your own.
create function public.org_rating(p_org uuid)
returns table (rating_avg numeric, rating_count int)
language sql stable security definer set search_path = public as $$
  select round(avg(rating)::numeric, 1), count(*)::int from reviews
   where subject_org_id = p_org and (is_listed(p_org) or is_member(p_org));
$$;

-- Reviews shown on a profile: who wrote them (the organization, not the person) and when; the
-- event itself stays between the parties.
create function public.org_reviews(p_org uuid, p_limit int default 20)
returns table (id uuid, rating smallint, comment text, reply text, replied_at timestamptz, created_at timestamptz, author_name text, author_type org_type)
language sql stable security definer set search_path = public as $$
  select r.id, r.rating, r.comment, r.reply, r.replied_at, r.created_at, a.name, a.type
    from reviews r join organizations a on a.id = r.author_org_id
   where r.subject_org_id = p_org and (is_listed(p_org) or is_member(p_org))
   order by r.created_at desc
   limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

-- When an event is completed, the client is asked to review the agency and the agency its suppliers.
create function public.ask_for_reviews()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_agency text;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;
  select name into v_agency from organizations where id = new.agency_org_id;
  perform notify_org(new.client_org_id, 'review_requested', format('Com''è andato %s?', new.title),
    format('Lascia una recensione a %s: aiuta altre aziende a sceglierla.', v_agency), '/client/eventi/' || new.id || '#recensione');
  if exists (
    select 1 from event_bookings b join contacts c on c.id = b.contact_id
     where b.event_id = new.id and b.status = 'confirmed' and c.supplier_org_id is not null
  ) then
    perform notify_org(new.agency_org_id, 'review_requested', format('Recensisci i fornitori di %s', new.title),
      'Le recensioni aiutano altre agenzie a scegliere.', '/pro/eventi/' || new.id || '#recensioni');
  end if;
  return new;
end;
$$;
create trigger events_ask_for_reviews after update of status on public.events
  for each row execute function public.ask_for_reviews();

-- ---------------------------------------------------------------------------
-- Supplier availability
-- ---------------------------------------------------------------------------

create table public.supplier_unavailability (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  -- Seen only by the supplier.
  note text check (length(note) <= 200),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on - starts_on <= 366)
);
create index supplier_unavailability_org_idx on public.supplier_unavailability (org_id, ends_on);

alter table public.supplier_unavailability enable row level security;
create policy supplier_unavailability_select on public.supplier_unavailability for select to authenticated
  using (public.is_member(org_id));
create policy supplier_unavailability_write on public.supplier_unavailability for all to authenticated
  using (public.is_member(org_id, array['owner', 'admin', 'manager']::public.member_role[]))
  with check (
    public.is_member(org_id, array['owner', 'admin', 'manager']::public.member_role[])
    and exists (select 1 from public.organizations o where o.id = org_id and o.type = 'supplier')
  );
revoke all on public.supplier_unavailability from anon, authenticated;
grant select, delete on public.supplier_unavailability to authenticated;
grant insert (id, org_id, starts_on, ends_on, note) on public.supplier_unavailability to authenticated;
grant update (starts_on, ends_on, note) on public.supplier_unavailability to authenticated;

-- Days a supplier is busy between two dates: marked unavailable, or confirmed for an event (other
-- than p_except_event). Internal: callers check access first.
create function public.supplier_busy(p_supplier uuid, p_from date, p_to date, p_except_event uuid default null)
returns table (day date, booked boolean)
language sql stable security definer set search_path = public as $$
  select d::date, bool_or(booked)
    from (
      select generate_series(greatest(u.starts_on, p_from), least(u.ends_on, p_to), interval '1 day') as d, false as booked
        from supplier_unavailability u
       where u.org_id = p_supplier and u.starts_on <= p_to and u.ends_on >= p_from
      union all
      select generate_series(greatest(e.start_date, p_from), least(coalesce(e.end_date, e.start_date), p_to), interval '1 day'), true
        from event_bookings b
        join contacts c on c.id = b.contact_id
        join events e on e.id = b.event_id
       where c.supplier_org_id = p_supplier and b.status = 'confirmed' and e.status <> 'cancelled'
         and e.start_date is not null and e.start_date <= p_to and coalesce(e.end_date, e.start_date) >= p_from
         and e.id is distinct from p_except_event
    ) s
   group by d::date
   order by 1;
$$;
revoke execute on function public.supplier_busy from public, anon, authenticated;

-- Busy days of a supplier, for the supplier itself, an agency that has it in its address book, or
-- anyone when its profile is listed. Never says for whom it is busy.
create function public.supplier_busy_days(p_supplier uuid, p_from date, p_to date)
returns table (day date, booked boolean)
language sql stable security definer set search_path = public as $$
  select * from supplier_busy(p_supplier, p_from, least(p_to, p_from + 400))
   where is_member(p_supplier) or is_listed(p_supplier)
      or exists (select 1 from contacts c where c.supplier_org_id = p_supplier and is_member(c.org_id));
$$;

-- Agency: the contacts in its address book that are busy on the dates of this event.
create function public.event_busy_contacts(p_event uuid)
returns table (contact_id uuid, days date[])
language sql stable security definer set search_path = public as $$
  select c.id, array(select b.day from supplier_busy(c.supplier_org_id, e.start_date, coalesce(e.end_date, e.start_date), e.id) b)
    from events e
    join contacts c on c.org_id = e.agency_org_id and c.supplier_org_id is not null
   where e.id = p_event and is_member(e.agency_org_id) and e.start_date is not null
     and exists (select 1 from supplier_busy(c.supplier_org_id, e.start_date, coalesce(e.end_date, e.start_date), e.id));
$$;

-- ---------------------------------------------------------------------------
-- Marketplace: ratings in results and profiles, and suppliers free on a date
-- ---------------------------------------------------------------------------

drop function public.search_marketplace(public.org_type, uuid, text, text, text, int);
create function public.search_marketplace(
  p_type public.org_type, p_from_org uuid default null, p_query text default null, p_service text default null,
  p_area text default null, p_limit int default 50, p_date date default null
)
returns table (
  org_id uuid, slug text, name text, city text, headline text, services text[], regions text[],
  connected boolean, contact_id uuid, rating_avg numeric, rating_count int
)
language sql stable security definer set search_path = public as $$
  with me as (select p_from_org as id where p_from_org is not null and is_member(p_from_org)),
  q as (select nullif(lower(trim(p_query)), '') as term, nullif(lower(trim(p_area)), '') as area)
  select o.id, o.slug, o.name, o.city, p.headline, p.services, p.regions,
         exists (select 1 from me where is_connected(me.id, o.id)),
         (select c.id from contacts c, me where c.org_id = me.id and c.supplier_org_id = o.id limit 1),
         rt.rating_avg, rt.rating_count
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
  rating_avg numeric, rating_count int
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
         (select count(*)::int from reviews r where r.subject_org_id = o.id)
    from organizations o
    join marketplace_profiles p on p.org_id = o.id
   where o.slug = p_slug and o.type <> 'client' and (p.is_listed or is_member(o.id));
$$;

revoke execute on function public.can_edit_portfolio, public.is_listed, public.reviewable_for, public.leave_review,
  public.reply_to_review, public.org_rating, public.org_reviews, public.supplier_busy_days, public.event_busy_contacts,
  public.search_marketplace, public.marketplace_profile from public, anon;
grant execute on function public.can_edit_portfolio, public.is_listed, public.reviewable_for, public.leave_review,
  public.reply_to_review, public.org_rating, public.org_reviews, public.supplier_busy_days, public.event_busy_contacts,
  public.search_marketplace, public.marketplace_profile to authenticated;
revoke execute on function public.check_portfolio_limits, public.ask_for_reviews from public, anon, authenticated;
