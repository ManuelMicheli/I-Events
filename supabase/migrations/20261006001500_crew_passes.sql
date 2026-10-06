-- Crew passes: everyone expected on site gets a pass with a QR code. The agency sends its link (WhatsApp, email);
-- on the day it scans the QR with the app, which finds the person among the crew saved on the phone and checks
-- them in, also without signal. The token is the only key to the public pass page, so it is random and nobody
-- can choose or change it.

alter table public.event_crew
  add column pass_token text not null default replace(gen_random_uuid()::text, '-', '')
    check (pass_token ~ '^[0-9a-f]{32}$');
create unique index event_crew_pass_token on public.event_crew (pass_token);

-- The pass as its holder sees it, from the link: no account needed, only the token.
create function public.crew_pass(p_token text)
returns table (
  event_title text,
  event_status public.event_status,
  agency_name text,
  venue text,
  city text,
  day date,
  call_time time,
  person text,
  role text,
  service_key text,
  checked_in_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select e.title, e.status, a.name, e.venue, e.city, c.day, c.call_time,
         case
           when c.booking_id is not null then coalesce(nullif(trim(ct.company), ''), nullif(trim(ct.name), ''))
           when c.user_id is not null then p.full_name
           else c.name
         end,
         c.role, b.service_key, c.checked_in_at
    from event_crew c
    join events e on e.id = c.event_id
    join organizations a on a.id = c.org_id
    left join event_bookings b on b.id = c.booking_id
    left join contacts ct on ct.id = b.contact_id
    left join profiles p on p.id = c.user_id
   where c.pass_token = lower(p_token);
$$;

revoke execute on function public.crew_pass from public;
grant execute on function public.crew_pass to anon, authenticated;
